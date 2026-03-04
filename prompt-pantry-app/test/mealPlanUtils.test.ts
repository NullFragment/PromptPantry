import {describe, expect, it} from 'vitest';
import {addDays, format} from 'date-fns';
import {
    ALL_MEAL_TYPES,
    calculateDayTotals,
    calculateParticipantTargets,
    getAllMealsForDay,
    getParticipantStatus,
    getRecipeCookCount,
    getUsedServingsForWeek,
    isRecipeFitForParticipant
} from '../src/utils/mealPlanUtils';
import {MealPlan, Participant, Recipe} from '../src/types';

const baseRecipe: Recipe = {
    name: 'Base Recipe',
    categories: ['Dinner'],
    prepTime: '10',
    cookTime: '20',
    servings: 1,
    tags: [],
    ingredients: [],
    instructions: [],
    macros: {calories: 500, protein: 30, carbs: 50, fat: 10}
};

describe('mealPlanUtils', () => {
    describe('ALL_MEAL_TYPES', () => {
        it('contains all expected meal types', () => {
            expect(ALL_MEAL_TYPES).toContain('breakfast');
            expect(ALL_MEAL_TYPES).toContain('lunch');
            expect(ALL_MEAL_TYPES).toContain('dinner');
            expect(ALL_MEAL_TYPES).toContain('snacks');
            expect(ALL_MEAL_TYPES).toContain('drinks');
            expect(ALL_MEAL_TYPES).toHaveLength(5);
        });
    });

    describe('getAllMealsForDay', () => {
        it('returns empty array for undefined day plan', () => {
            const meals = getAllMealsForDay(undefined);
            expect(meals).toEqual([]);
        });

        it('returns all meals from all slots', () => {
            const dayPlan: MealPlan[string] = {
                breakfast: [{recipe: baseRecipe, servings: 1}],
                lunch: [{recipe: baseRecipe, servings: 1}],
                dinner: [{recipe: baseRecipe, servings: 1}]
            };

            const meals = getAllMealsForDay(dayPlan);
            expect(meals).toHaveLength(3);
        });

        it('filters by participants when provided', () => {
            const dayPlan: MealPlan[string] = {
                breakfast: [
                    {recipe: baseRecipe, servings: 1, participant: 'Alice'},
                    {recipe: baseRecipe, servings: 1, participant: 'Bob'}
                ],
                lunch: [
                    {recipe: baseRecipe, servings: 1, participant: 'Alice'}
                ]
            };

            const meals = getAllMealsForDay(dayPlan, ['Alice']);
            expect(meals).toHaveLength(2);
            expect(meals.every(m => m.participant === 'Alice')).toBe(true);
        });

        it('handles empty participants array', () => {
            const dayPlan: MealPlan[string] = {
                breakfast: [
                    {recipe: baseRecipe, servings: 1, participant: 'Alice'}
                ]
            };

            const meals = getAllMealsForDay(dayPlan, []);
            expect(meals).toHaveLength(0);
        });
    });

    describe('calculateDayTotals', () => {
        it('calculates day totals across all slots', () => {
            const mealPlan: MealPlan = {
                '2026-01-04': {
                    breakfast: [{recipe: baseRecipe, servings: 1}],
                    lunch: [{
                        recipe: {
                            ...baseRecipe,
                            name: 'Light Lunch',
                            macros: {calories: 300, protein: 20, carbs: 25, fat: 8}
                        },
                        servings: 2
                    }]
                }
            };

            const totals = calculateDayTotals(mealPlan['2026-01-04']);
            expect(totals.calories).toBe(1100);
            expect(totals.protein).toBe(70);
            expect(totals.carbs).toBe(100);
            expect(totals.fat).toBe(26);
        });

        it('returns zeros for undefined day plan', () => {
            const totals = calculateDayTotals(undefined);
            expect(totals).toEqual({calories: 0, protein: 0, carbs: 0, fat: 0});
        });

        it('filters by participants when calculating totals', () => {
            const dayPlan: MealPlan[string] = {
                breakfast: [
                    {recipe: baseRecipe, servings: 1, participant: 'Alice'},
                    {
                        recipe: {...baseRecipe, macros: {calories: 200, protein: 10, carbs: 20, fat: 5}},
                        servings: 1,
                        participant: 'Bob'
                    }
                ]
            };

            const totals = calculateDayTotals(dayPlan, ['Alice']);
            expect(totals.calories).toBe(500);
        });
    });

    describe('calculateParticipantTargets', () => {
        it('calculates correct targets based on maintenance and deficit', () => {
            const participant: Participant = {
                name: 'Alice',
                maintenanceCalories: 2000,
                calorieDeficit: 10,
                proteinPercent: 30,
                carbsPercent: 40,
                fatPercent: 30
            };

            const targets = calculateParticipantTargets(participant);

            expect(targets.calories).toBe(1800); // 2000 * 0.9
            expect(targets.protein).toBe(135); // (1800 * 0.3) / 4
            expect(targets.carbs).toBe(180); // (1800 * 0.4) / 4
            expect(targets.fat).toBe(60); // (1800 * 0.3) / 9
        });

        it('handles zero deficit', () => {
            const participant: Participant = {
                name: 'Bob',
                maintenanceCalories: 2500,
                calorieDeficit: 0,
                proteinPercent: 25,
                carbsPercent: 50,
                fatPercent: 25
            };

            const targets = calculateParticipantTargets(participant);
            expect(targets.calories).toBe(2500);
        });
    });

    describe('getParticipantStatus', () => {
        it('handles zero targets safely', () => {
            const status = getParticipantStatus(0, 0);
            expect(status).toEqual({color: 'text-gray-600', bg: 'bg-gray-500', diffPercent: 0});
        });

        it('handles negative targets', () => {
            const status = getParticipantStatus(100, -50);
            expect(status).toEqual({color: 'text-gray-600', bg: 'bg-gray-500', diffPercent: 0});
        });

        it('returns green status when at or within 5% over target', () => {
            const status = getParticipantStatus(2100, 2000);
            expect(status.color).toBe('text-green-600');
            expect(status.bg).toBe('bg-green-500');
        });

        it('returns yellow status when within 10% over target', () => {
            const status = getParticipantStatus(2180, 2000);
            expect(status.color).toBe('text-yellow-600');
            expect(status.bg).toBe('bg-yellow-500');
        });

        it('returns red status when beyond 10% over target', () => {
            const status = getParticipantStatus(2300, 2000);
            expect(status.color).toBe('text-red-600');
            expect(status.bg).toBe('bg-red-500');
        });

        it('is gray below target', () => {
            const status = getParticipantStatus(1500, 2000);
            expect(status.color).toBe('text-gray-500');
            expect(status.bg).toBe('bg-gray-400');
        });

        it('calculates correct diff percent', () => {
            const status = getParticipantStatus(2200, 2000);
            expect(status.diffPercent).toBeCloseTo(0.1);
        });
    });

    describe('isRecipeFitForParticipant', () => {
        const participant: Participant = {
            name: 'Alice',
            maintenanceCalories: 2000,
            calorieDeficit: 0,
            proteinPercent: 30, // 150g
            carbsPercent: 40,   // 200g
            fatPercent: 30      // ~67g
        };

        it('returns true for recipe within limits', () => {
            const recipe: Recipe = {
                ...baseRecipe,
                macros: {calories: 500, protein: 30, carbs: 50, fat: 15}
            };

            expect(isRecipeFitForParticipant(recipe, participant)).toBe(true);
        });

        it('returns false for recipe exceeding calories', () => {
            const recipe: Recipe = {
                ...baseRecipe,
                macros: {calories: 3000, protein: 30, carbs: 50, fat: 15}
            };

            expect(isRecipeFitForParticipant(recipe, participant)).toBe(false);
        });

        it('allows 5% tolerance', () => {
            const targets = calculateParticipantTargets(participant);
            const recipe: Recipe = {
                ...baseRecipe,
                macros: {
                    calories: Math.floor(targets.calories * 1.04),
                    protein: 30,
                    carbs: 50,
                    fat: 15
                }
            };

            expect(isRecipeFitForParticipant(recipe, participant)).toBe(true);
        });
    });

    describe('getUsedServingsForWeek', () => {
        it('counts only current week servings for a recipe', () => {
            const weekStart = new Date('2026-01-06'); // Week starting 2026-01-04 (Sunday)
            const mealPlan: MealPlan = {
                [format(weekStart, 'yyyy-MM-dd')]: {
                    breakfast: [{recipe: baseRecipe, servings: 1}]
                },
                [format(addDays(weekStart, 1), 'yyyy-MM-dd')]: {
                    dinner: [{recipe: baseRecipe, servings: 2}]
                },
                [format(addDays(weekStart, 7), 'yyyy-MM-dd')]: {
                    lunch: [{recipe: baseRecipe, servings: 5}]
                }
            };

            const used = getUsedServingsForWeek(mealPlan, baseRecipe.name, weekStart);
            expect(used).toBe(3);
        });

        it('returns 0 when no meals match', () => {
            const mealPlan: MealPlan = {};
            const used = getUsedServingsForWeek(mealPlan, 'Nonexistent', new Date());
            expect(used).toBe(0);
        });
    });

    describe('getRecipeCookCount', () => {
        const week1Str = '2026-01-04';
        const week2Str = '2026-01-11';

        it('counts multipliers from multiWeeklyCookPlan', () => {
            const cookPlan = {
                [week1Str]: {'uuid-1': {recipeName: 'Pasta', multiplier: 2, servings: 8}},
                [week2Str]: {'uuid-2': {recipeName: 'Pasta', multiplier: 1, servings: 4}}
            };
            expect(getRecipeCookCount(cookPlan, {}, 'Pasta')).toBe(3);
        });

        it('counts 1 for scheduled meals when multiplier is missing or 0', () => {
            const mealPlan: MealPlan = {
                [week1Str]: {dinner: [{recipe: baseRecipe, servings: 1}]}
            };
            // baseRecipe.name is 'Base Recipe'
            expect(getRecipeCookCount({}, mealPlan, 'Base Recipe')).toBe(1);
        });

        it('counts 1 per week even if multiple slots are scheduled in that week', () => {
            const mealPlan: MealPlan = {
                [week1Str]: {
                    dinner: [{recipe: baseRecipe, servings: 1}],
                    lunch: [{recipe: baseRecipe, servings: 1}]
                }
            };
            expect(getRecipeCookCount({}, mealPlan, 'Base Recipe')).toBe(1);
        });

        it('prefers multiplier over scheduled fallback in the same week', () => {
            const cookPlan = {
                [week1Str]: {'uuid-1': {recipeName: 'Base Recipe', multiplier: 2, servings: 8}}
            };
            const mealPlan: MealPlan = {
                [week1Str]: {dinner: [{recipe: baseRecipe, servings: 1}]}
            };
            expect(getRecipeCookCount(cookPlan, mealPlan, 'Base Recipe')).toBe(2);
        });

        it('does not count transferred servings as a new cook event', () => {
            const cookPlan = {
                [week1Str]: {'uuid-1': {recipeName: 'Base Recipe', multiplier: 0, servings: 4, transferredFromDate: '2025-12-28'}}
            };
            const mealPlan: MealPlan = {
                [week1Str]: {dinner: [{recipe: baseRecipe, servings: 1}]}
            };
            expect(getRecipeCookCount(cookPlan, mealPlan, 'Base Recipe')).toBe(0);
        });

        it('handles multiple weeks with a mix of multipliers and scheduled fallback', () => {
            const cookPlan = {
                [week1Str]: {'uuid-1': {recipeName: 'Base Recipe', multiplier: 2, servings: 8}},
                [week2Str]: {'uuid-2': {recipeName: 'Base Recipe', multiplier: 0, servings: 4}}
            };
            const mealPlan: MealPlan = {
                [week2Str]: {dinner: [{recipe: baseRecipe, servings: 1}]}
            };
            // Week 1: Multiplier 2
            // Week 2: Scheduled fallback 1
            expect(getRecipeCookCount(cookPlan, mealPlan, 'Base Recipe')).toBe(3);
        });

        it('returns 0 for never cooked/scheduled recipe', () => {
            expect(getRecipeCookCount({}, {}, 'Unknown')).toBe(0);
        });

        it('handles null/undefined plans safely', () => {
            expect(getRecipeCookCount(undefined as any, undefined as any, 'Base Recipe')).toBe(0);
        });
    });
});

