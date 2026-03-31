import {useCallback, useMemo, useState} from 'react';
import {IngredientDefinition} from '../types';
import {sortSectionsWithUnassignedLast} from '../utils/storeSectionUtils';
import {apiRequest, apiJson} from '../utils/apiRequest';

interface IngredientUsage {
    recipeCount: number;
    recipeNames: string[];
}

interface SaveResult {
    success: boolean;
    error?: string;
    ingredient?: IngredientDefinition;
}

interface MergeResult {
    success: boolean;
    error?: string;
    mergedIngredientCount?: number;
    updatedRecipeCount?: number;
    targetIngredient?: IngredientDefinition;
}

export interface AliasUpdateResult {
    success: boolean;
    error?: string;
    ingredient?: IngredientDefinition;
    updatedRecipeCount?: number;
}

export function useIngredients() {
    const [ingredients, setIngredients] = useState<IngredientDefinition[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const storeSections = useMemo(() => {
        const sections = [...new Set(ingredients.map(i => i.storeSectionId))];
        return sortSectionsWithUnassignedLast(sections);
    }, [ingredients]);

    const fetchIngredients = useCallback(async () => {
        setIsLoading(true);
        try {
            const result = await apiRequest<IngredientDefinition[]>('/api/ingredients');
            if (result.success && Array.isArray(result.data)) {
                setIngredients(result.data);
                setError(null);
            } else {
                setError(result.error || 'Failed to fetch ingredients');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveIngredient = useCallback(async (
        ingredient: Partial<IngredientDefinition> & { name: string; storeSectionId: string },
        isNew: boolean
    ): Promise<SaveResult> => {
        const id = ingredient.id || '';
        const url = isNew ? '/api/ingredients' : `/api/ingredients/${encodeURIComponent(id)}`;
        const method = isNew ? 'POST' : 'PUT';

        const result = await apiJson<IngredientDefinition>(url, method, ingredient);
        if (result.success && result.data) {
            await fetchIngredients();
            return {success: true, ingredient: result.data};
        }
        return {success: false, error: result.error || 'Failed to save ingredient'};
    }, [fetchIngredients]);

    const deleteIngredient = useCallback(async (id: string): Promise<SaveResult> => {
        const result = await apiJson(`/api/ingredients/${encodeURIComponent(id)}`, 'DELETE');
        if (result.success) {
            setIngredients(prev => prev.filter(i => i.id !== id));
            setError(null);
            return {success: true};
        }
        return {success: false, error: result.error || 'Failed to delete ingredient'};
    }, []);

    const mergeIngredients = useCallback(async (
        sourceIds: string[],
        targetId: string
    ): Promise<MergeResult> => {
        const result = await apiJson<MergeResult>('/api/ingredients/merge', 'POST', {sourceIds, targetId});
        if (result.success && result.data) {
            await fetchIngredients();
            return {
                success: true,
                mergedIngredientCount: result.data.mergedIngredientCount,
                updatedRecipeCount: result.data.updatedRecipeCount,
                targetIngredient: result.data.targetIngredient
            };
        }
        return {success: false, error: result.error || 'Failed to merge ingredients'};
    }, [fetchIngredients]);

    const checkUsage = useCallback(async (id: string): Promise<IngredientUsage | null> => {
        const result = await apiRequest<IngredientUsage>(`/api/ingredients/${encodeURIComponent(id)}/usage`);
        return result.success && result.data ? result.data : null;
    }, []);

    const checkAliasUsage = useCallback(async (ingredientId: string, aliasText: string): Promise<IngredientUsage | null> => {
        const params = new URLSearchParams({ alias: aliasText });
        const result = await apiRequest<IngredientUsage>(
            `/api/ingredients/${encodeURIComponent(ingredientId)}/alias-usage?${params}`
        );
        return result.success && result.data ? result.data : null;
    }, []);

    const updateAlias = useCallback(async (
        ingredientId: string,
        aliasIndex: number,
        newAlias: string,
        updateRecipes: boolean
    ): Promise<AliasUpdateResult> => {
        const url = `/api/ingredients/${encodeURIComponent(ingredientId)}/aliases/${aliasIndex}`;
        const result = await apiJson<IngredientDefinition & { updatedRecipeCount?: number }>(
            url, 'PUT', { newAlias: newAlias.trim(), updateRecipes }
        );
        if (result.success && result.data) {
            await fetchIngredients();
            return {
                success: true,
                ingredient: result.data.id ? result.data : undefined,
                updatedRecipeCount: result.data.updatedRecipeCount
            };
        }
        return { success: false, error: result.error || 'Failed to update alias' };
    }, [fetchIngredients]);

    const deleteAlias = useCallback(async (
        ingredientId: string,
        aliasIndex: number,
        options?: { useCanonicalName?: boolean; replacementAlias?: string }
    ): Promise<AliasUpdateResult> => {
        const params = new URLSearchParams();
        if (options?.useCanonicalName) {
            params.set('useCanonicalName', 'true');
        } else if (options?.replacementAlias !== undefined && options.replacementAlias !== '') {
            params.set('replacementAlias', options.replacementAlias);
        }
        const qs = params.toString();
        const url = `/api/ingredients/${encodeURIComponent(ingredientId)}/aliases/${aliasIndex}${qs ? `?${qs}` : ''}`;
        const result = await apiRequest<IngredientDefinition & { updatedRecipeCount?: number }>(url, { method: 'DELETE' });
        if (result.success && result.data) {
            await fetchIngredients();
            return {
                success: true,
                ingredient: result.data.id ? result.data : undefined,
                updatedRecipeCount: result.data.updatedRecipeCount
            };
        }
        return { success: false, error: result.error || 'Failed to delete alias' };
    }, [fetchIngredients]);

    const mergeAlias = useCallback(async (
        ingredientId: string,
        sourceAliasIndex: number,
        targetAliasIndex: number | 'canonical'
    ): Promise<AliasUpdateResult> => {
        const url = `/api/ingredients/${encodeURIComponent(ingredientId)}/aliases/merge`;
        const result = await apiJson<{ ingredient?: IngredientDefinition; updatedRecipeCount?: number }>(
            url, 'POST', {
                sourceAliasIndex: Number(sourceAliasIndex),
                targetAliasIndex: targetAliasIndex === 'canonical' ? 'canonical' : Number(targetAliasIndex)
            }
        );
        if (result.success && result.data) {
            await fetchIngredients();
            return {
                success: true,
                ingredient: result.data.ingredient,
                updatedRecipeCount: result.data.updatedRecipeCount
            };
        }
        return { success: false, error: result.error || 'Failed to merge alias' };
    }, [fetchIngredients]);

    return {
        ingredients,
        storeSections,
        isLoading,
        error,
        fetchIngredients,
        saveIngredient,
        deleteIngredient,
        mergeIngredients,
        checkUsage,
        checkAliasUsage,
        updateAlias,
        deleteAlias,
        mergeAlias
    };
}
