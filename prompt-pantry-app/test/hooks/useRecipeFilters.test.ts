import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {useRecipeFilters} from '../../src/hooks/useRecipeFilters';
import {Recipe} from '../../src/types';

const mockRecipes: Recipe[] = [
    {
        name: 'Pasta Carbonara',
        categories: ['Dinner', 'Italian'],
        tags: ['quick', 'comfort-food'],
        prepTime: '10',
        cookTime: '20',
        servings: 4,
        ingredients: [
            {ingredient: 'spaghetti', quantity: '400', measure: 'g'},
            {ingredient: 'bacon', quantity: '200', measure: 'g'}
        ],
        instructions: ['Cook pasta', 'Fry bacon'],
        macros: {calories: 500, protein: 25, carbs: 60, fat: 15}
    },
    {
        name: 'Greek Salad',
        categories: ['Lunch', 'Mediterranean'],
        tags: ['healthy', 'vegetarian'],
        prepTime: '15',
        cookTime: '0',
        servings: 2,
        ingredients: [
            {ingredient: 'cucumber', quantity: '1', measure: 'units'},
            {ingredient: 'feta cheese', quantity: '100', measure: 'g'}
        ],
        instructions: ['Chop vegetables', 'Add feta'],
        macros: {calories: 200, protein: 10, carbs: 15, fat: 12}
    },
    {
        name: 'Oatmeal',
        categories: ['Breakfast'],
        tags: ['healthy', 'quick'],
        prepTime: '5',
        cookTime: '10',
        servings: 1,
        ingredients: [
            {ingredient: 'oats', quantity: '50', measure: 'g'}
        ],
        instructions: ['Cook oats'],
        macros: {calories: 150, protein: 5, carbs: 30, fat: 3}
    }
];

describe('useRecipeFilters', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('initializes with empty filters', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            expect(result.current.selectedTags).toEqual([]);
            expect(result.current.selectedCategories).toEqual([]);
            expect(result.current.searchQuery).toBe('');
            expect(result.current.sortConfig).toEqual({key: 'name', direction: 'asc'});
        });

        it('returns recipes sorted by name by default', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Greek Salad');
            expect(result.current.sortedAndFilteredRecipes[1].name).toBe('Oatmeal');
            expect(result.current.sortedAndFilteredRecipes[2].name).toBe('Pasta Carbonara');
        });

        it('returns all recipes when no filters are applied', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(3);
        });

        it('extracts all unique tags from recipes', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            expect(result.current.allTags).toContain('quick');
            expect(result.current.allTags).toContain('healthy');
            expect(result.current.allTags).toContain('vegetarian');
            expect(result.current.allTags).toContain('comfort-food');
        });

        it('extracts all unique categories from recipes', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            expect(result.current.allCategories).toContain('Dinner');
            expect(result.current.allCategories).toContain('Lunch');
            expect(result.current.allCategories).toContain('Breakfast');
            expect(result.current.allCategories).toContain('Italian');
            expect(result.current.allCategories).toContain('Mediterranean');
        });
    });

    describe('search filtering', () => {
        it('filters recipes by name', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.setSearchQuery('pasta');
            });

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(1);
            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Pasta Carbonara');
        });

        it('filters recipes by name using externalSearchQuery', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes, {}, {}, 'pasta'));

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(1);
            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Pasta Carbonara');
        });

        it('filters recipes by category', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.setSearchQuery('italian');
            });

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(1);
            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Pasta Carbonara');
        });

        it('filters recipes by tag', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.setSearchQuery('vegetarian');
            });

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(1);
            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Greek Salad');
        });

        it('filters recipes by ingredient', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.setSearchQuery('feta');
            });

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(1);
            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Greek Salad');
        });

        it('search is case insensitive', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.setSearchQuery('PASTA');
            });

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(1);
        });
    });

    describe('tag filtering', () => {
        it('toggles tag selection on', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.toggleTag('healthy');
            });

            expect(result.current.selectedTags).toContain('healthy');
        });

        it('toggles tag selection off', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.toggleTag('healthy');
            });

            act(() => {
                result.current.toggleTag('healthy');
            });

            expect(result.current.selectedTags).not.toContain('healthy');
        });

        it('filters by single tag', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.toggleTag('quick');
            });

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(2);
            expect(result.current.sortedAndFilteredRecipes.map(r => r.name)).toContain('Pasta Carbonara');
            expect(result.current.sortedAndFilteredRecipes.map(r => r.name)).toContain('Oatmeal');
        });

        it('filters by multiple tags with AND logic', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.toggleTag('quick');
                result.current.toggleTag('healthy');
            });

            // Only Oatmeal has both 'quick' and 'healthy'
            expect(result.current.sortedAndFilteredRecipes).toHaveLength(1);
            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Oatmeal');
        });
    });

    describe('category filtering', () => {
        it('toggles category selection on', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.toggleCategory('Dinner');
            });

            expect(result.current.selectedCategories).toContain('Dinner');
        });

        it('toggles category selection off', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.toggleCategory('Dinner');
            });

            act(() => {
                result.current.toggleCategory('Dinner');
            });

            expect(result.current.selectedCategories).not.toContain('Dinner');
        });

        it('filters by category', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.toggleCategory('Breakfast');
            });

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(1);
            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Oatmeal');
        });

        it('filters by multiple categories with OR logic', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.toggleCategory('Breakfast');
                result.current.toggleCategory('Dinner');
            });

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(2);
        });
    });

    describe('sorting', () => {
        it('sorts by calories ascending', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.handleSort('calories');
            });

            expect(result.current.sortConfig).toEqual({key: 'calories', direction: 'asc'});
            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Oatmeal'); // 150 cal
            expect(result.current.sortedAndFilteredRecipes[2].name).toBe('Pasta Carbonara'); // 500 cal
        });

        it('toggles sort direction on repeated clicks', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.handleSort('calories');
            });

            expect(result.current.sortConfig?.direction).toBe('asc');

            act(() => {
                result.current.handleSort('calories');
            });

            expect(result.current.sortConfig?.direction).toBe('desc');
            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Pasta Carbonara'); // 500 cal now first
        });

        it('resets to ascending when sorting by new key', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.handleSort('calories');
                result.current.handleSort('calories'); // Now desc
                result.current.handleSort('protein'); // New key, should be asc
            });

            expect(result.current.sortConfig).toEqual({key: 'protein', direction: 'asc'});
        });

        it('sorts by prepTime', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.handleSort('prepTime');
            });

            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Oatmeal'); // 5 min
            expect(result.current.sortedAndFilteredRecipes[2].name).toBe('Greek Salad'); // 15 min
        });

        it('sorts by cookTime', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.handleSort('cookTime');
            });

            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Greek Salad'); // 0 min
        });
    });

    describe('clearFilters', () => {
        it('clears all filters', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.setSearchQuery('pasta');
                result.current.toggleTag('quick');
                result.current.toggleCategory('Dinner');
            });

            expect(result.current.sortedAndFilteredRecipes.length).toBeLessThan(3);

            act(() => {
                result.current.clearFilters();
            });

            expect(result.current.selectedTags).toEqual([]);
            expect(result.current.selectedCategories).toEqual([]);
            expect(result.current.searchQuery).toBe('');
            expect(result.current.sortedAndFilteredRecipes).toHaveLength(3);
        });
    });

    describe('combined filters', () => {
        it('applies search, tag, and category filters together', () => {
            const {result} = renderHook(() => useRecipeFilters(mockRecipes));

            act(() => {
                result.current.toggleCategory('Dinner');
                result.current.toggleTag('quick');
            });

            expect(result.current.sortedAndFilteredRecipes).toHaveLength(1);
            expect(result.current.sortedAndFilteredRecipes[0].name).toBe('Pasta Carbonara');
        });
    });

    describe('edge cases', () => {
        it('handles empty recipe list', () => {
            const {result} = renderHook(() => useRecipeFilters([]));

            expect(result.current.sortedAndFilteredRecipes).toEqual([]);
            expect(result.current.allTags).toEqual([]);
            expect(result.current.allCategories).toEqual([]);
        });

        it('handles recipes without tags', () => {
            const recipesWithoutTags: Recipe[] = [{
                ...mockRecipes[0],
                tags: undefined as any
            }];

            const {result} = renderHook(() => useRecipeFilters(recipesWithoutTags));

            expect(result.current.allTags).toEqual([]);
        });

        it('handles recipes without categories', () => {
            const recipesWithoutCats: Recipe[] = [{
                ...mockRecipes[0],
                categories: undefined as any
            }];

            const {result} = renderHook(() => useRecipeFilters(recipesWithoutCats));

            expect(result.current.allCategories).toEqual([]);
        });
    });
});

