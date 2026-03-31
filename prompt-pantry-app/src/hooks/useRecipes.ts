import {useCallback, useState} from 'react';
import {Recipe} from '../types';
import {apiRequest, apiJson} from '../utils/apiRequest';

export function useRecipes() {
    const [recipes, setRecipes] = useState<Recipe[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fetchRecipes = useCallback(async (includeInvalid = false) => {
        setIsLoading(true);
        try {
            const url = `/api/recipes${includeInvalid ? '?includeInvalid=true' : ''}`;
            const result = await apiRequest<Recipe[]>(url);
            if (result.success && Array.isArray(result.data)) {
                setRecipes(result.data);
                setError(null);
            } else {
                setError(result.error || 'Failed to fetch recipes');
            }
        } finally {
            setIsLoading(false);
        }
    }, []);

    const saveRecipe = useCallback(async (recipe: Recipe, isNew: boolean) => {
        const url = isNew ? '/api/recipes' : `/api/recipes/${recipe.id}`;
        const method = isNew ? 'POST' : 'PUT';

        const result = await apiJson(url, method, recipe);
        if (result.success) {
            await fetchRecipes();
            return {success: true, id: recipe.id};
        }
        return {success: false, error: result.error || 'Failed to save recipe'};
    }, [fetchRecipes]);

    const deleteRecipe = useCallback(async (id: string) => {
        const result = await apiJson(`/api/recipes/${id}`, 'DELETE');
        if (result.success) {
            setRecipes(prev => prev.filter(r => r.id !== id));
            setError(null);
            return true;
        }
        console.error('Failed to delete recipe:', result.error);
        setError('Failed to delete recipe');
        return false;
    }, []);

    return {
        recipes,
        setRecipes,
        isLoading,
        error,
        fetchRecipes,
        saveRecipe,
        deleteRecipe
    };
}
