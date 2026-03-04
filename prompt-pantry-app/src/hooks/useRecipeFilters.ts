import {useMemo, useState} from 'react';
import {MealPlan, MultiWeeklyCookPlan, Recipe} from '../types';
import {flattenIngredients} from '../utils/recipeUtils';
import {getRecipeCookCount} from '../utils/mealPlanUtils';

export function useRecipeFilters(recipes: Recipe[], mealPlan: MealPlan = {}, multiWeeklyCookPlan: MultiWeeklyCookPlan = {}, externalSearchQuery?: string, setExternalSearchQuery?: (q: string) => void) {
    const [selectedTags, setSelectedTags] = useState<string[]>([]);
    const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
    const [selectedRatings, setSelectedRatings] = useState<('up' | 'down' | 'neutral')[]>([]);
    const [showOnlyFavorites, setShowOnlyFavorites] = useState(false);
    const [showOnlyNeverCooked, setShowOnlyNeverCooked] = useState(false);
    const [sortConfig, setSortConfig] = useState<{ key: string, direction: 'asc' | 'desc' } | null>({
        key: 'name',
        direction: 'asc'
    });
    const [internalSearchQuery, setInternalSearchQuery] = useState('');

    const searchQuery = externalSearchQuery !== undefined ? externalSearchQuery : internalSearchQuery;
    const setSearchQuery = setInternalSearchQuery;

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        recipes.forEach(r => r.tags?.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [recipes]);

    const allCategories = useMemo(() => {
        const cats = new Set<string>();
        recipes.forEach(r => r.categories?.forEach(c => cats.add(c)));
        return Array.from(cats).sort();
    }, [recipes]);

    const sortedAndFilteredRecipes = useMemo(() => {
        const query = searchQuery.toLowerCase();

        const result = recipes.filter(r => {
            const searchMatch = !query || [
                r.name,
                ...(r.categories || []),
                ...(r.tags || []),
                ...flattenIngredients(r.ingredients).map(i => i.ingredient)
            ].some(val => (val || '').toLowerCase().includes(query));

            const tagsMatch = selectedTags.length === 0 || selectedTags.every(t => (r.tags || []).includes(t));
            const catsMatch = selectedCategories.length === 0 || (r.categories || []).some(c => selectedCategories.includes(c));

            const ratingMatch = selectedRatings.length === 0 || selectedRatings.includes(r.rating || 'neutral');
            const favoriteMatch = !showOnlyFavorites || r.isFavorite;
            const neverCookedMatch = !showOnlyNeverCooked || getRecipeCookCount(multiWeeklyCookPlan, mealPlan, r.name) === 0;

            return searchMatch && tagsMatch && catsMatch && ratingMatch && favoriteMatch && neverCookedMatch;
        });

        if (sortConfig) {
            const {key, direction} = sortConfig;
            result.sort((a, b) => {
                const getVal = (recipe: Recipe): string | number => {
                    if (key === 'calories') return recipe.macros.calories;
                    if (key === 'protein') return recipe.macros.protein;
                    if (key === 'carbs') return recipe.macros.carbs;
                    if (key === 'fat') return recipe.macros.fat;
                    if (key === 'prepTime') return parseInt(recipe.prepTime) || 0;
                    if (key === 'cookTime') return parseInt(recipe.cookTime) || 0;
                    if (key === 'servings') return recipe.servings;
                    if (key === 'cooked') return getRecipeCookCount(multiWeeklyCookPlan, mealPlan, recipe.name);
                    if (key === 'name') return recipe.name;
                    return recipe.name;
                };
                const aVal = getVal(a), bVal = getVal(b);
                return aVal === bVal ? 0 : (aVal < bVal ? -1 : 1) * (direction === 'asc' ? 1 : -1);
            });
        }

        return result;
    }, [recipes, searchQuery, selectedTags, selectedCategories, selectedRatings, showOnlyFavorites, showOnlyNeverCooked, mealPlan, multiWeeklyCookPlan, sortConfig]);

    const toggleTag = (tag: string) => {
        setSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const toggleCategory = (cat: string) => {
        setSelectedCategories(prev =>
            prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]
        );
    };

    const toggleRating = (rating: 'up' | 'down' | 'neutral') => {
        setSelectedRatings(prev =>
            prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]
        );
    };

    const handleSort = (key: string) => {
        setSortConfig(prev => {
            if (prev?.key === key) {
                return {key, direction: prev.direction === 'asc' ? 'desc' : 'asc'};
            }
            return {key, direction: 'asc'};
        });
    };

    const clearFilters = () => {
        setSelectedTags([]);
        setSelectedCategories([]);
        setSelectedRatings([]);
        setShowOnlyFavorites(false);
        setShowOnlyNeverCooked(false);
        setSearchQuery('');
        setExternalSearchQuery?.('');
        setSortConfig({key: 'name', direction: 'asc'});
    };

    return {
        searchQuery,
        setSearchQuery,
        selectedTags,
        setSelectedTags,
        selectedCategories,
        setSelectedCategories,
        selectedRatings,
        setSelectedRatings,
        showOnlyFavorites,
        setShowOnlyFavorites,
        showOnlyNeverCooked,
        setShowOnlyNeverCooked,
        sortConfig,
        allTags,
        allCategories,
        sortedAndFilteredRecipes,
        toggleTag,
        toggleCategory,
        toggleRating,
        handleSort,
        clearFilters
    };
}
