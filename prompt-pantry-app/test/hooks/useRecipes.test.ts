import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook, waitFor} from '@testing-library/react';
import {useRecipes} from '../../src/hooks/useRecipes';
import {Recipe} from '../../src/types';
import {mockFetchResponse, mockFetchError} from '../testHelpers';

const mockRecipes: Recipe[] = [
    {
        id: 'recipe-test-uuid',
        name: 'Test Recipe',
        categories: ['Dinner'],
        tags: ['quick'],
        prepTime: '10',
        cookTime: '20',
        servings: 4,
        ingredients: [],
        instructions: [],
        macros: {calories: 500, protein: 25, carbs: 60, fat: 15}
    },
    {
        id: 'recipe-another-uuid',
        name: 'Another Recipe',
        categories: ['Lunch'],
        tags: ['healthy'],
        prepTime: '15',
        cookTime: '0',
        servings: 2,
        ingredients: [],
        instructions: [],
        macros: {calories: 200, protein: 10, carbs: 15, fat: 12}
    }
];

describe('useRecipes', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('initializes with empty recipes array', () => {
            const {result} = renderHook(() => useRecipes());

            expect(result.current.recipes).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });
    });

    describe('fetchRecipes', () => {
        it('fetches recipes successfully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchResponse(mockRecipes))
            ));

            const {result} = renderHook(() => useRecipes());

            await act(async () => {
                await result.current.fetchRecipes();
            });

            expect(result.current.recipes).toHaveLength(2);
            expect(result.current.recipes[0].name).toBe('Test Recipe');
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('sets isLoading during fetch', async () => {
            let resolvePromise: (value: any) => void;
            const delayedPromise = new Promise(resolve => {
                resolvePromise = resolve;
            });

            vi.stubGlobal('fetch', vi.fn(() => delayedPromise));

            const {result} = renderHook(() => useRecipes());

            act(() => {
                result.current.fetchRecipes();
            });

            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                resolvePromise!(mockFetchResponse([]));
            });

            await waitFor(() => {
                expect(result.current.isLoading).toBe(false);
            });
        });

        it('handles fetch error gracefully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError({error: ''}, 500))
            ));

            const {result} = renderHook(() => useRecipes());

            await act(async () => {
                await result.current.fetchRecipes();
            });

            expect(result.current.error).toBe('Failed to fetch recipes');
            expect(result.current.isLoading).toBe(false);
        });

        it('handles network error gracefully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.reject(new Error('Network error'))
            ));

            const {result} = renderHook(() => useRecipes());

            await act(async () => {
                await result.current.fetchRecipes();
            });

            expect(result.current.error).toBe('Network error');
            expect(result.current.isLoading).toBe(false);
        });

        it('handles non-array response gracefully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchResponse({invalid: 'data'}))
            ));

            const {result} = renderHook(() => useRecipes());

            await act(async () => {
                await result.current.fetchRecipes();
            });

            // Should not update recipes if response is not an array
            expect(result.current.recipes).toEqual([]);
        });
    });

    describe('saveRecipe', () => {
        it('creates new recipe successfully', async () => {
            const newRecipe = mockRecipes[0];

            vi.stubGlobal('fetch', vi.fn()
                .mockResolvedValueOnce(mockFetchResponse({})) // POST
                .mockResolvedValueOnce(mockFetchResponse([newRecipe])) // GET
            );

            const {result} = renderHook(() => useRecipes());

            let response: any;
            await act(async () => {
                response = await result.current.saveRecipe(newRecipe, true);
            });

            expect(response.success).toBe(true);
            expect(response.id).toBe('recipe-test-uuid');
            expect(fetch).toHaveBeenCalledWith('/api/recipes', expect.objectContaining({
                method: 'POST'
            }));
        });

        it('updates existing recipe successfully', async () => {
            const updatedRecipe = {...mockRecipes[0], name: 'Updated Recipe'};

            vi.stubGlobal('fetch', vi.fn()
                .mockResolvedValueOnce(mockFetchResponse({})) // PUT
                .mockResolvedValueOnce(mockFetchResponse([updatedRecipe])) // GET
            );

            const {result} = renderHook(() => useRecipes());

            let response: any;
            await act(async () => {
                response = await result.current.saveRecipe(updatedRecipe, false);
            });

            expect(response.success).toBe(true);
            expect(fetch).toHaveBeenCalledWith('/api/recipes/recipe-test-uuid', expect.objectContaining({
                method: 'PUT'
            }));
        });

        it('handles save error with error message', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError('Validation failed', 500))
            ));

            const {result} = renderHook(() => useRecipes());

            let response: any;
            await act(async () => {
                response = await result.current.saveRecipe(mockRecipes[0], true);
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('Validation failed');
        });

        it('handles save error without error message', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError({error: ''}, 500))
            ));

            const {result} = renderHook(() => useRecipes());

            let response: any;
            await act(async () => {
                response = await result.current.saveRecipe(mockRecipes[0], true);
            });

            expect(response.success).toBe(false);
            expect(response.error).toBe('Failed to save recipe');
        });

        it('uses recipe id in PUT URL', async () => {
            const recipeToUpdate = mockRecipes[0];

            vi.stubGlobal('fetch', vi.fn()
                .mockResolvedValueOnce(mockFetchResponse({}))
                .mockResolvedValueOnce(mockFetchResponse([]))
            );

            const {result} = renderHook(() => useRecipes());

            await act(async () => {
                await result.current.saveRecipe(recipeToUpdate, false);
            });

            expect(fetch).toHaveBeenCalledWith(
                '/api/recipes/recipe-test-uuid',
                expect.any(Object)
            );
        });
    });

    describe('deleteRecipe', () => {
        it('deletes recipe successfully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchResponse({}))
            ));

            const {result} = renderHook(() => useRecipes());

            // First set some recipes
            act(() => {
                result.current.setRecipes(mockRecipes);
            });

            expect(result.current.recipes).toHaveLength(2);

            let success: boolean = false;
            await act(async () => {
                success = await result.current.deleteRecipe('recipe-test-uuid');
            });

            expect(success).toBe(true);
            expect(result.current.recipes).toHaveLength(1);
            expect(result.current.recipes[0].name).toBe('Another Recipe');
        });

        it('handles delete error', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError('Error', 500))
            ));

            const {result} = renderHook(() => useRecipes());

            let success: boolean = true;
            await act(async () => {
                success = await result.current.deleteRecipe('recipe-test-uuid');
            });

            expect(success).toBe(false);
            expect(result.current.error).toBe('Failed to delete recipe');
        });

        it('handles network error during delete', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.reject(new Error('Network error'))
            ));

            const {result} = renderHook(() => useRecipes());

            let success: boolean = true;
            await act(async () => {
                success = await result.current.deleteRecipe('recipe-test-uuid');
            });

            expect(success).toBe(false);
            expect(result.current.error).toBe('Failed to delete recipe');
        });

        it('uses recipe id in DELETE URL', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchResponse({}))
            ));

            const {result} = renderHook(() => useRecipes());

            await act(async () => {
                await result.current.deleteRecipe('recipe-test-uuid');
            });

            expect(fetch).toHaveBeenCalledWith(
                '/api/recipes/recipe-test-uuid',
                expect.objectContaining({method: 'DELETE'})
            );
        });
    });

    describe('setRecipes', () => {
        it('allows direct setting of recipes', () => {
            const {result} = renderHook(() => useRecipes());

            act(() => {
                result.current.setRecipes(mockRecipes);
            });

            expect(result.current.recipes).toEqual(mockRecipes);
        });
    });
});

