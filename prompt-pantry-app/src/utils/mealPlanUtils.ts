import {addDays, format, parseISO, startOfWeek} from 'date-fns';
import {CompactMealPlan, CompactMealSlot, Macros, MealPlan, MealSlot, MultiWeeklyCookPlan, Participant, Recipe, WeeklyCookPlan, WeeklyCookPlanItem} from '../types';
import {resolveVariantRecipe} from './recipeUtils';

export const ALL_MEAL_TYPES = ['breakfast', 'lunch', 'dinner', 'snacks', 'drinks'] as const;
export type MealType = typeof ALL_MEAL_TYPES[number];

/** Generate a UUID for recipe instances */
export const generateUUID = (): string => {
    if (typeof crypto !== 'undefined' && crypto.randomUUID) {
        return crypto.randomUUID();
    }
    // Fallback for older browsers
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, (c) => {
        const r = Math.random() * 16 | 0;
        const v = c === 'x' ? r : (r & 0x3 | 0x8);
        return v.toString(16);
    });
};

/** Check if a cook plan item is transferred (has a transferredFromDate) */
export const isTransferredItem = (item: WeeklyCookPlanItem): boolean => {
    return !!item.transferredFromDate;
};

/** Find all instances of a recipe in a week's cook plan */
export const findRecipeInstances = (weekPlan: WeeklyCookPlan, recipeName: string): { id: string; item: WeeklyCookPlanItem }[] => {
    return Object.entries(weekPlan)
        .filter(([, item]) => item.recipeName === recipeName)
        .map(([id, item]) => ({ id, item }));
};

/** Find the non-transferred (base) instance of a recipe in a week's cook plan */
export const findBaseRecipeInstance = (weekPlan: WeeklyCookPlan, recipeName: string): { id: string; item: WeeklyCookPlanItem } | null => {
    const entry = Object.entries(weekPlan).find(([, item]) =>
        item.recipeName === recipeName && !item.transferredFromDate
    );
    return entry ? { id: entry[0], item: entry[1] } : null;
};

/** Trace back to the original source week for a transferred item (follows transfer chain) */
export const getOriginalSourceWeek = (multiWeeklyCookPlan: MultiWeeklyCookPlan, item: WeeklyCookPlanItem): string | undefined => {
    if (!item.transferredFromDate || !item.transferredFromId) return undefined;
    let sourceWeek = item.transferredFromDate;
    let sourceId = item.transferredFromId;
    for (let i = 0; i < 52; i++) {
        const sourcePlan = multiWeeklyCookPlan[sourceWeek];
        if (!sourcePlan) break;
        const sourceItem = sourcePlan[sourceId];
        if (!sourceItem) break;
        if (sourceItem.transferredFromDate && sourceItem.transferredFromId) {
            sourceWeek = sourceItem.transferredFromDate;
            sourceId = sourceItem.transferredFromId;
        } else {
            break;
        }
    }
    return sourceWeek;
};

export const getAllMealsForDay = (dayPlan: MealPlan[string] | undefined, participants?: string[]): MealSlot[] => {
    if (!dayPlan) return [];
    return ALL_MEAL_TYPES.flatMap(type => {
        const slots = dayPlan[type];
        const meals = Array.isArray(slots) ? slots : [];
        if (participants !== undefined) {
            return meals.filter(m => m.participant && participants.includes(m.participant));
        }
        return meals;
    });
};

export const calculateDayTotals = (dayPlan: MealPlan[string] | undefined, participants?: string[]): Macros => {
    const meals = getAllMealsForDay(dayPlan, participants);
    return meals.reduce((acc, m) => ({
        calories: acc.calories + (m.recipe.macros.calories * m.servings),
        protein: acc.protein + (m.recipe.macros.protein * m.servings),
        carbs: acc.carbs + (m.recipe.macros.carbs * m.servings),
        fat: acc.fat + (m.recipe.macros.fat * m.servings),
    }), {calories: 0, protein: 0, carbs: 0, fat: 0});
};

export const calculateParticipantTargets = (p: Participant) => {
    const targetCalories = p.maintenanceCalories * (1 - p.calorieDeficit / 100);
    return {
        calories: targetCalories,
        protein: (targetCalories * (p.proteinPercent / 100)) / 4,
        carbs: (targetCalories * (p.carbsPercent / 100)) / 4,
        fat: (targetCalories * (p.fatPercent / 100)) / 9,
    };
};

export const getParticipantStatus = (current: number, target: number) => {
    if (target <= 0) {
        return {color: 'text-gray-600', bg: 'bg-gray-500', diffPercent: 0};
    }

    if (current < target) {
        const diffPercent = (target - current) / target;
        return {color: 'text-gray-500', bg: 'bg-gray-400', diffPercent};
    }

    const diffPercent = (current - target) / target;
    let color = 'text-red-600';
    let bg = 'bg-red-500';

    if (diffPercent <= 0.05) {
        color = 'text-green-600';
        bg = 'bg-green-500';
    } else if (diffPercent <= 0.10) {
        color = 'text-yellow-600';
        bg = 'bg-yellow-500';
    }

    return {color, bg, diffPercent};
};

export const isRecipeFitForParticipant = (recipe: Recipe, p: Participant): boolean => {
    const targets = calculateParticipantTargets(p);
    const TOLERANCE = 1.05;

    return (
        recipe.macros.calories <= targets.calories * TOLERANCE &&
        recipe.macros.protein <= targets.protein * TOLERANCE &&
        recipe.macros.carbs <= targets.carbs * TOLERANCE &&
        recipe.macros.fat <= targets.fat * TOLERANCE
    );
};

export const getUsedServingsForWeek = (mealPlan: MealPlan, recipeName: string, weekStartDate: Date, instanceId?: string): number => {
    let used = 0;
    const start = startOfWeek(weekStartDate, {weekStartsOn: 0});
    for (let i = 0; i < 7; i++) {
        const dStr = format(addDays(start, i), 'yyyy-MM-dd');
        const dayPlan = mealPlan[dStr];
        if (dayPlan) {
            used += getAllMealsForDay(dayPlan)
                .filter(m => {
                    if (m.recipe.name !== recipeName) return false;
                    // If instanceId is provided, filter by it; otherwise match any
                    if (instanceId && m.recipeInstanceId) {
                        return m.recipeInstanceId === instanceId;
                    }
                    return true;
                })
                .reduce((sum, m) => sum + m.servings, 0);
        }
    }
    return used;
};
export const getRecipeCookCount = (multiWeeklyCookPlan: MultiWeeklyCookPlan = {}, mealPlan: MealPlan = {}, recipeName: string): number => {
    let count = 0;

    // Get all unique week starts from both plans
    const weeks = new Set<string>();
    Object.keys(multiWeeklyCookPlan || {}).forEach(w => weeks.add(w));
    Object.keys(mealPlan || {}).forEach(date => {
        try {
            const d = parseISO(date);
            if (d && !isNaN(d.getTime())) {
                const weekStart = format(startOfWeek(d, {weekStartsOn: 0}), 'yyyy-MM-dd');
                weeks.add(weekStart);
            }
        } catch {
            // Ignore invalid dates
        }
    });

    weeks.forEach(weekStr => {
        const weekPlan = (multiWeeklyCookPlan || {})[weekStr] || {};
        let foundInWeek = false;

        Object.values(weekPlan).forEach((item) => {
            if (item.recipeName !== recipeName) return;

            // Only count non-transferred items
            const transferred = isTransferredItem(item);

            if (transferred) {
                // For transferred items, mark foundInWeek to prevent fallback counting
                foundInWeek = true;
            } else if (item.multiplier && item.multiplier > 0) {
                // For non-transferred items with multiplier > 0, count and mark found
                count += item.multiplier;
                foundInWeek = true;
            }
            // For non-transferred items with multiplier === 0, let fallback run
        });

        // Fallback: check if scheduled in meal plan but no multiplier
        if (!foundInWeek) {
            const d = parseISO(weekStr);
            if (d && !isNaN(d.getTime())) {
                const usedInWeek = getUsedServingsForWeek(mealPlan || {}, recipeName, d);
                if (usedInWeek > 0) {
                    count += 1;
                }
            }
        }
    });

    return count;
};

/**
 * Dehydrate a meal plan by stripping full recipe data and keeping only references.
 * This produces a compact format suitable for storage.
 */
export const dehydrateMealPlan = (mealPlan: MealPlan): CompactMealPlan => {
    const compact: CompactMealPlan = {};

    Object.entries(mealPlan).forEach(([date, dayPlan]) => {
        if (!dayPlan) return;
        compact[date] = {};

        ALL_MEAL_TYPES.forEach(mealType => {
            const slots = dayPlan[mealType];
            if (!Array.isArray(slots) || slots.length === 0) return;

            compact[date][mealType] = slots.map(slot => {
                const compactSlot: CompactMealSlot = {
                    recipeName: slot.recipe.name,
                    servings: slot.servings,
                };
                if (slot.participant) {
                    compactSlot.participant = slot.participant;
                }
                if (slot.recipeInstanceId) {
                    compactSlot.recipeInstanceId = slot.recipeInstanceId;
                }
                return compactSlot;
            });
        });
    });

    return compact;
};

/**
 * Check if a meal slot is in compact format (has recipeName) vs full format (has recipe object).
 */
const isCompactSlot = (slot: unknown): slot is CompactMealSlot => {
    return slot !== null &&
        typeof slot === 'object' &&
        'recipeName' in slot &&
        typeof (slot as CompactMealSlot).recipeName === 'string' &&
        !('recipe' in slot);
};

/**
 * Hydrate a compact meal plan by looking up full recipe data from the recipes array.
 * Unknown recipes are skipped with a warning.
 */
export const hydrateMealPlan = (
    compactOrFull: CompactMealPlan,
    recipes: Recipe[]
): MealPlan => {
    const recipeMap = new Map(recipes.map(r => [r.name, r]));
    const hydrated: MealPlan = {};
    const missingRecipes = new Set<string>();

    Object.entries(compactOrFull).forEach(([date, dayPlan]) => {
        if (!dayPlan) return;
        hydrated[date] = {};

        ALL_MEAL_TYPES.forEach(mealType => {
            const slots = dayPlan[mealType];
            if (!Array.isArray(slots) || slots.length === 0) return;

            const hydratedSlots: MealSlot[] = [];

            slots.forEach(slot => {
                if (isCompactSlot(slot)) {
                    // Compact format - need to hydrate
                    const recipe = recipeMap.get(slot.recipeName);
                    if (!recipe) {
                        missingRecipes.add(slot.recipeName);
                        return; // Skip this slot
                    }

                    const resolvedRecipe = resolveVariantRecipe(recipe, recipes);
                    hydratedSlots.push({
                        recipe: resolvedRecipe,
                        servings: slot.servings,
                        participant: slot.participant,
                        recipeInstanceId: slot.recipeInstanceId,
                    });
                }
            });

            if (hydratedSlots.length > 0) {
                hydrated[date][mealType] = hydratedSlots;
            }
        });
    });

    if (missingRecipes.size > 0) {
        console.warn(`Skipped meals with unknown recipes: ${[...missingRecipes].join(', ')}`);
    }

    return hydrated;
};

/**
 * Check if a meal plan is in compact format (needs hydration).
 */
export const isCompactMealPlan = (plan: CompactMealPlan | MealPlan): boolean => {
    for (const dayPlan of Object.values(plan)) {
        if (!dayPlan) continue;
        for (const mealType of ALL_MEAL_TYPES) {
            const slots = dayPlan[mealType];
            if (Array.isArray(slots) && slots.length > 0) {
                return isCompactSlot(slots[0]);
            }
        }
    }
    return false;
};

