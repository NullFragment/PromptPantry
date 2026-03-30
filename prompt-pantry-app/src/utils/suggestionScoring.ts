import type { Recipe } from '../types';
import { flattenIngredients } from './recipeUtils';

export interface SuggestionResult {
    recipe: Recipe;
    sharedCount: number;
    sharedIngredients: string[];
    score: number;
}

export interface IngredientSuggestionOptions {
    useRatingBonus: boolean;
}

export function buildWeekIngredientSet(weekRecipes: Recipe[]): Set<string> {
    const ids = new Set<string>();
    weekRecipes.forEach(r => {
        flattenIngredients(r.ingredients).forEach(ing => {
            if (ing.ingredientId) ids.add(ing.ingredientId);
        });
    });
    return ids;
}

export function scoreIngredientSuggestion(
    recipe: Recipe,
    weekIngredientIds: Set<string>,
    options: IngredientSuggestionOptions
): SuggestionResult {
    const recipeIngredientIds = flattenIngredients(recipe.ingredients)
        .filter(i => i.ingredientId)
        .map(i => i.ingredientId!);

    const shared = recipeIngredientIds.filter(id => weekIngredientIds.has(id));
    const uniqueShared = Array.from(new Set(shared));

    const ratingBonus = options.useRatingBonus
        ? (recipe.rating === 'up' ? 100 : recipe.rating === 'down' ? -50 : 0)
        : 0;

    const score = uniqueShared.length + ratingBonus;

    return { recipe, sharedCount: uniqueShared.length, sharedIngredients: uniqueShared, score };
}

export function scoreMacroSuggestion(
    recipe: Recipe,
    weeklyTargets: { calories: number; protein: number; carbs: number; fat: number },
    weeklyPlanned: { calories: number; protein: number; carbs: number; fat: number },
    weekIngredientIds: Set<string>,
    servingMultiplier: number,
    cookCount: number
): SuggestionResult {
    const macros = {
        calories: recipe.macros.calories * servingMultiplier,
        protein: recipe.macros.protein * servingMultiplier,
        carbs: recipe.macros.carbs * servingMultiplier,
        fat: recipe.macros.fat * servingMultiplier,
    };

    const remaining = {
        calories: weeklyTargets.calories - weeklyPlanned.calories,
        protein: weeklyTargets.protein - weeklyPlanned.protein,
        carbs: weeklyTargets.carbs - weeklyPlanned.carbs,
        fat: weeklyTargets.fat - weeklyPlanned.fat,
    };

    const contrib = (recipeVal: number, rem: number, target: number): number => {
        if (target <= 0) return 0;
        if (rem < 0) return 0.5 * (rem / target); // penalty for exceeded macro
        return Math.min(recipeVal, rem) / target;
    };

    const p1 = contrib(macros.protein, remaining.protein, weeklyTargets.protein) +
                contrib(macros.carbs, remaining.carbs, weeklyTargets.carbs) +
                contrib(macros.fat, remaining.fat, weeklyTargets.fat);

    const gaps = (['protein', 'carbs', 'fat'] as const)
        .map(k => ({ k, gap: weeklyTargets[k] > 0 ? remaining[k] / weeklyTargets[k] : 0 }))
        .sort((a, b) => b.gap - a.gap);
    const furthestMacro = gaps[0].k;

    const p2 = contrib(macros[furthestMacro], remaining[furthestMacro], weeklyTargets[furthestMacro]);
    const p3 = contrib(macros.calories, remaining.calories, weeklyTargets.calories);

    const recipeIds = flattenIngredients(recipe.ingredients).filter(i => i.ingredientId).map(i => i.ingredientId!);
    const sharedIds = recipeIds.filter(id => weekIngredientIds.has(id));
    const uniqueShared = Array.from(new Set(sharedIds));
    const p4 = uniqueShared.length;

    const rawScore = (p1 * 50) + (p2 * 100) + (p3 * 20) + (p4 * 5);
    const recencyMultiplier = Math.max(0.2, 1 - (cookCount * 0.15));
    const score = rawScore * recencyMultiplier;

    return { recipe, sharedCount: uniqueShared.length, sharedIngredients: uniqueShared, score };
}
