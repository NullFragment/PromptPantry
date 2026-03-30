import { describe, expect, it } from 'vitest';
import {
    scoreIngredientSuggestion,
    scoreMacroSuggestion,
    buildWeekIngredientSet,
} from '../../src/utils/suggestionScoring.js';
import type { Recipe } from '../../src/types.js';

const makeRecipe = (overrides: Partial<Recipe> = {}): Recipe => ({
    name: 'Test Recipe',
    categories: ['Dinner'],
    ingredients: [{ ingredient: 'Chicken', ingredientId: 'uuid-chicken' }],
    instructions: ['Cook'],
    macros: { calories: 400, protein: 30, carbs: 20, fat: 15 },
    prepTime: '10', cookTime: '20', servings: 2, tags: [],
    ...overrides,
});

const weekRecipes = [
    makeRecipe({ name: 'Week Recipe', ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] }),
];

const weekIngredientIds = new Set(['uuid-garlic']);

describe('buildWeekIngredientSet', () => {
    it('returns set of ingredientIds from week recipes', () => {
        const result = buildWeekIngredientSet(weekRecipes);
        expect(result.has('uuid-garlic')).toBe(true);
    });

    it('ignores ingredients without ingredientId', () => {
        const recipes = [makeRecipe({ ingredients: [{ ingredient: 'Mystery' }] })];
        const result = buildWeekIngredientSet(recipes);
        expect(result.size).toBe(0);
    });
});

describe('scoreIngredientSuggestion', () => {
    it('returns score 0 for no shared ingredients', () => {
        const result = scoreIngredientSuggestion(makeRecipe(), weekIngredientIds, { useRatingBonus: false });
        expect(result.sharedCount).toBe(0);
    });

    it('returns positive sharedCount for matching ingredient', () => {
        const recipe = makeRecipe({
            ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }],
        });
        const result = scoreIngredientSuggestion(recipe, weekIngredientIds, { useRatingBonus: false });
        expect(result.sharedCount).toBe(1);
        expect(result.score).toBeGreaterThan(0);
    });

    it('applies rating bonus when enabled', () => {
        const liked = makeRecipe({ rating: 'up' });
        const withBonus = scoreIngredientSuggestion(liked, weekIngredientIds, { useRatingBonus: true });
        const withoutBonus = scoreIngredientSuggestion(liked, weekIngredientIds, { useRatingBonus: false });
        expect(withBonus.score).toBeGreaterThan(withoutBonus.score);
    });

    it('does not apply rating bonus when disabled', () => {
        const liked = makeRecipe({ rating: 'up', ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] });
        const neutral = makeRecipe({ ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] });
        const likedScore = scoreIngredientSuggestion(liked, weekIngredientIds, { useRatingBonus: false }).score;
        const neutralScore = scoreIngredientSuggestion(neutral, weekIngredientIds, { useRatingBonus: false }).score;
        expect(likedScore).toBe(neutralScore);
    });

    it('penalizes thumbs-down recipe when bonus enabled', () => {
        const disliked = makeRecipe({ rating: 'down', ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] });
        const neutral = makeRecipe({ ingredients: [{ ingredient: 'Garlic', ingredientId: 'uuid-garlic' }] });
        expect(scoreIngredientSuggestion(disliked, weekIngredientIds, { useRatingBonus: true }).score)
            .toBeLessThan(scoreIngredientSuggestion(neutral, weekIngredientIds, { useRatingBonus: true }).score);
    });
});

describe('scoreMacroSuggestion', () => {
    const targets = { calories: 2000, protein: 150, carbs: 200, fat: 70 };
    const planned = { calories: 1200, protein: 80, carbs: 130, fat: 40 };

    it('returns a positive score for a recipe that fills gaps', () => {
        const result = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 1, 0);
        expect(result.score).toBeGreaterThan(0);
    });

    it('reduces score when a macro is already exceeded', () => {
        const normal = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 1, 0);
        const exceeded = scoreMacroSuggestion(makeRecipe(), targets, { ...planned, protein: 200 }, weekIngredientIds, 1, 0);
        expect(exceeded.score).toBeLessThan(normal.score);
    });

    it('scales score with serving multiplier', () => {
        const single = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 1, 0);
        const double = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 2, 0);
        expect(double.score).toBeGreaterThan(single.score);
    });

    it('applies recency penalty for frequently cooked recipes', () => {
        const fresh = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 1, 0);
        const stale = scoreMacroSuggestion(makeRecipe(), targets, planned, weekIngredientIds, 1, 5);
        expect(stale.score).toBeLessThan(fresh.score);
    });
});
