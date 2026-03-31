import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {useMealPlan} from '../../src/hooks/useMealPlan';
import {Recipe} from '../../src/types';
import {mockFetchResponse} from '../testHelpers';

const sampleRecipe: Recipe = {
    id: 'sample-recipe-uuid',
    name: 'Sample',
    categories: ['Dinner'],
    prepTime: '10',
    cookTime: '20',
    servings: 2,
    tags: [],
    ingredients: [],
    instructions: [],
    macros: {calories: 100, protein: 10, carbs: 10, fat: 5}
};

const oldNameRecipe: Recipe = {
    ...sampleRecipe,
    id: 'old-name-recipe-uuid',
    name: 'Old Name'
};

describe('useMealPlan', () => {
    // Seed plan in compact format (recipeId, not recipeName)
    const seedPlan = {
        '2026-01-02': {
            dinner: [{recipeId: 'old-name-recipe-uuid', servings: 1}]
        }
    };

    // Recipes array for hydration
    const recipes: Recipe[] = [oldNameRecipe];

    beforeEach(() => {
        vi.resetAllMocks();
        localStorage.clear();
        localStorage.setItem('mealPlan', JSON.stringify(seedPlan));
        vi.stubGlobal('fetch', vi.fn((url: string) => {
            if (url.endsWith('/meal-plan')) {
                return Promise.resolve(mockFetchResponse(seedPlan));
            }
            if (url.endsWith('/multi-weekly-cook-plan')) {
                const saved = localStorage.getItem('multiWeeklyCookPlan');
                return Promise.resolve(mockFetchResponse(saved ? JSON.parse(saved) : {}));
            }
            return Promise.resolve(mockFetchResponse([]));
        }));
    });

    it('updates meal plan entries when recipe renamed', async () => {
        const oldRecipeId = 'old-name-recipe-uuid';
        const {result} = renderHook(() => useMealPlan(recipes));

        await waitFor(() => expect(result.current.hydrated).toBe(true));
        await waitFor(() => expect(result.current.mealPlan['2026-01-02']).toBeDefined());
        await waitFor(() => expect(result.current.mealPlan['2026-01-02']?.dinner?.[0].recipe.name).toBe('Old Name'));

        const updatedRecipe = {...sampleRecipe, id: 'old-name-recipe-uuid', name: 'New Name'};
        act(() => {
            result.current.updateMealPlanForRecipe(oldRecipeId, updatedRecipe);
        });

        await waitFor(() => {
            expect(result.current.mealPlan['2026-01-02']?.dinner?.[0].recipe.name).toBe('New Name');
        });
    });

    it('removes recipe entries when recipe deleted', async () => {
        const oldRecipeId = 'old-name-recipe-uuid';
        const {result} = renderHook(() => useMealPlan(recipes));
        await waitFor(() => expect(result.current.hydrated).toBe(true));
        await waitFor(() => expect(result.current.mealPlan['2026-01-02']).toBeDefined());
        await waitFor(() => expect(result.current.mealPlan['2026-01-02']?.dinner).toBeDefined());

        act(() => {
            result.current.updateMealPlanForRecipe(oldRecipeId, null);
        });

        await waitFor(() => {
            expect(result.current.mealPlan['2026-01-02']?.dinner).toHaveLength(0);
        });
    });
});
