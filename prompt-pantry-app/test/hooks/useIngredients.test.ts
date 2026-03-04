import {beforeEach, describe, expect, it, vi} from 'vitest';
import {act, renderHook} from '@testing-library/react';
import {useIngredients} from '../../src/hooks/useIngredients';
import {IngredientDefinition} from '../../src/types';
import {mockFetchResponse, mockFetchError} from '../testHelpers';

const mockIngredients: IngredientDefinition[] = [
    {
        id: '550e8400-e29b-41d4-a716-446655440001',
        name: 'garlic',
        storeSection: 'Produce',
        aliases: ['garlic clove', 'garlic, minced']
    },
    {
        id: '550e8400-e29b-41d4-a716-446655440002',
        name: 'chicken breast',
        storeSection: 'Protein'
    },
    {
        id: '550e8400-e29b-41d4-a716-446655440003',
        name: 'milk',
        storeSection: 'Dairy'
    },
    {
        id: '550e8400-e29b-41d4-a716-446655440004',
        name: 'mystery item',
        storeSection: 'Unassigned'
    }
];

describe('useIngredients', () => {
    beforeEach(() => {
        vi.clearAllMocks();
    });

    describe('initialization', () => {
        it('initializes with empty ingredients array', () => {
            const {result} = renderHook(() => useIngredients());

            expect(result.current.ingredients).toEqual([]);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('initializes with empty storeSections', () => {
            const {result} = renderHook(() => useIngredients());
            expect(result.current.storeSections).toEqual([]);
        });
    });

    describe('fetchIngredients', () => {
        it('fetches ingredients successfully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchResponse(mockIngredients))
            ));

            const {result} = renderHook(() => useIngredients());

            await act(async () => {
                await result.current.fetchIngredients();
            });

            expect(result.current.ingredients).toHaveLength(4);
            expect(result.current.isLoading).toBe(false);
            expect(result.current.error).toBeNull();
        });

        it('sets isLoading during fetch', async () => {
            let resolvePromise: (value: unknown) => void;
            const delayedPromise = new Promise(resolve => {
                resolvePromise = resolve;
            });

            vi.stubGlobal('fetch', vi.fn(() => delayedPromise));

            const {result} = renderHook(() => useIngredients());

            act(() => {
                result.current.fetchIngredients();
            });

            expect(result.current.isLoading).toBe(true);

            await act(async () => {
                resolvePromise!(mockFetchResponse([]));
            });

            expect(result.current.isLoading).toBe(false);
        });

        it('handles fetch error gracefully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError('Internal Server Error', 500))
            ));

            const {result} = renderHook(() => useIngredients());

            await act(async () => {
                await result.current.fetchIngredients();
            });

            expect(result.current.error).toBeTruthy();
            expect(result.current.isLoading).toBe(false);
        });
    });

    describe('storeSections', () => {
        it('derives unique store sections sorted with Unassigned last', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchResponse(mockIngredients))
            ));

            const {result} = renderHook(() => useIngredients());

            await act(async () => {
                await result.current.fetchIngredients();
            });

            expect(result.current.storeSections).toEqual(['Dairy', 'Produce', 'Protein', 'Unassigned']);
        });
    });

    describe('saveIngredient', () => {
        it('creates new ingredient successfully', async () => {
            const newIngredient = {name: 'onion', storeSection: 'Produce'};
            const savedIngredient = {...newIngredient, id: 'new-uuid'};

            vi.stubGlobal('fetch', vi.fn()
                .mockResolvedValueOnce(mockFetchResponse(savedIngredient))
                .mockResolvedValueOnce(mockFetchResponse([savedIngredient]))
            );

            const {result} = renderHook(() => useIngredients());

            let saveResult;
            await act(async () => {
                saveResult = await result.current.saveIngredient(newIngredient, true);
            });

            expect(saveResult).toEqual({success: true, ingredient: savedIngredient});
        });

        it('updates existing ingredient successfully', async () => {
            const existingIngredient = mockIngredients[0];
            const updatedIngredient = {...existingIngredient, storeSection: 'Spices'};

            vi.stubGlobal('fetch', vi.fn()
                .mockResolvedValueOnce(mockFetchResponse(updatedIngredient))
                .mockResolvedValueOnce(mockFetchResponse([updatedIngredient]))
            );

            const {result} = renderHook(() => useIngredients());

            let saveResult;
            await act(async () => {
                saveResult = await result.current.saveIngredient(updatedIngredient, false);
            });

            expect(saveResult).toEqual({success: true, ingredient: updatedIngredient});
        });

        it('handles save error', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError('Name already exists', 400))
            ));

            const {result} = renderHook(() => useIngredients());

            let saveResult;
            await act(async () => {
                saveResult = await result.current.saveIngredient({name: 'garlic', storeSection: 'Produce'}, true);
            });

            expect(saveResult).toEqual({success: false, error: 'Name already exists'});
        });
    });

    describe('deleteIngredient', () => {
        it('deletes ingredient successfully', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve({ok: true, status: 204, text: () => Promise.resolve('')})
            ));

            const {result} = renderHook(() => useIngredients());

            await act(async () => {
                result.current.ingredients.push(...mockIngredients);
            });

            let deleteResult;
            await act(async () => {
                deleteResult = await result.current.deleteIngredient(mockIngredients[0].id);
            });

            expect(deleteResult).toEqual({success: true});
        });

        it('handles delete error', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError('Cannot delete ingredient used in recipes', 400))
            ));

            const {result} = renderHook(() => useIngredients());

            let deleteResult;
            await act(async () => {
                deleteResult = await result.current.deleteIngredient('some-id');
            });

            expect(deleteResult).toEqual({success: false, error: 'Cannot delete ingredient used in recipes'});
        });
    });

    describe('mergeIngredients', () => {
        it('merges ingredients successfully', async () => {
            const mergeResponse = {
                mergedIngredientCount: 2,
                updatedRecipeCount: 5,
                targetIngredient: mockIngredients[0]
            };

            vi.stubGlobal('fetch', vi.fn()
                .mockResolvedValueOnce(mockFetchResponse(mergeResponse))
                .mockResolvedValueOnce(mockFetchResponse([mockIngredients[0]]))
            );

            const {result} = renderHook(() => useIngredients());

            let mergeResult;
            await act(async () => {
                mergeResult = await result.current.mergeIngredients(['id1', 'id2'], mockIngredients[0].id);
            });

            expect(mergeResult).toEqual({
                success: true,
                mergedIngredientCount: 2,
                updatedRecipeCount: 5,
                targetIngredient: mockIngredients[0]
            });
        });

        it('handles merge error', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError('Target not found', 404))
            ));

            const {result} = renderHook(() => useIngredients());

            let mergeResult;
            await act(async () => {
                mergeResult = await result.current.mergeIngredients(['id1'], 'nonexistent');
            });

            expect(mergeResult).toEqual({success: false, error: 'Target not found'});
        });
    });

    describe('checkUsage', () => {
        it('returns usage information', async () => {
            const usageResponse = {recipeCount: 3, recipeNames: ['Recipe 1', 'Recipe 2', 'Recipe 3']};

            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchResponse(usageResponse))
            ));

            const {result} = renderHook(() => useIngredients());

            let usage;
            await act(async () => {
                usage = await result.current.checkUsage('some-id');
            });

            expect(usage).toEqual(usageResponse);
        });

        it('returns null on error', async () => {
            vi.stubGlobal('fetch', vi.fn(() =>
                Promise.resolve(mockFetchError('Not found', 404))
            ));

            const {result} = renderHook(() => useIngredients());

            let usage;
            await act(async () => {
                usage = await result.current.checkUsage('some-id');
            });

            expect(usage).toBeNull();
        });
    });

});
