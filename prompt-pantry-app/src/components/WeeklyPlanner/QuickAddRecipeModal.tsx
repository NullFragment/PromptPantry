import { format, parseISO } from 'date-fns';
import { Heart, Search, ThumbsDown, ThumbsUp, Users, Utensils } from 'lucide-react';
import type { Participant, Recipe } from '../../types';

export interface QuickAddRecipeModalProps {
    slot: { date: string; slot: string } | null;
    searchQuery: string;
    onSearchChange: (value: string) => void;
    participants: Participant[];
    recipes: Recipe[];
    recipesInPlanIds: Set<string>;
    onSelectRecipe: (recipe: Recipe, participantName: string) => void;
    onClose: () => void;
}

export function QuickAddRecipeModal({
    slot,
    searchQuery,
    onSearchChange,
    participants,
    recipes,
    recipesInPlanIds,
    onSelectRecipe,
    onClose
}: QuickAddRecipeModalProps) {
    if (!slot) return null;

    const displayLabel = `${format(parseISO(slot.date), 'EEEE, MMM d')} - ${slot.slot}`;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div
                className="fixed inset-0 bg-black/60 backdrop-blur-md"
                onClick={onClose}
                aria-hidden
            />
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden animate-in fade-in zoom-in duration-300">
                <div className="bg-indigo-600 dark:bg-indigo-700 p-6 text-white">
                    <h3 className="text-xl font-black">Quick Add Recipe</h3>
                    <p className="text-indigo-100 dark:text-indigo-200 mt-1 text-sm">
                        {displayLabel}
                    </p>
                </div>

                <div className="p-6 space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                        <input
                            type="text"
                            placeholder="Search for a recipe..."
                            value={searchQuery}
                            onChange={(e) => onSearchChange(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                            autoFocus
                        />
                    </div>

                    <div className="overflow-y-auto max-h-[calc(80vh-240px)]">
                        <h4 className="eyebrow mb-3 flex items-center">
                            <Users className="h-3 w-3 mr-2 text-indigo-500" />
                            Select Participant
                        </h4>
                        <div className="grid grid-cols-2 gap-3">
                            {participants.map((participant) => {
                                const matchingRecipes = recipes.filter((recipe) => {
                                    if (searchQuery) {
                                        const searchLower = searchQuery.toLowerCase();
                                        return (
                                            recipe.name.toLowerCase().includes(searchLower) ||
                                            recipe.tags?.some((tag) =>
                                                tag.toLowerCase().includes(searchLower)
                                            )
                                        );
                                    }
                                    return (
                                        recipe.isFavorite || recipesInPlanIds.has(recipe.id)
                                    );
                                });

                                const favorites = matchingRecipes.filter((r) => r.isFavorite);
                                const inPlan = matchingRecipes.filter(
                                    (r) => !r.isFavorite && recipesInPlanIds.has(r.id)
                                );
                                const searchResults = matchingRecipes.filter(
                                    (r) =>
                                        !r.isFavorite && !recipesInPlanIds.has(r.id)
                                );

                                favorites.sort((a, b) => a.name.localeCompare(b.name));
                                inPlan.sort((a, b) => a.name.localeCompare(b.name));
                                searchResults.sort((a, b) => a.name.localeCompare(b.name));

                                return (
                                    <div key={participant.name} className="space-y-3">
                                        <div className="text-xs font-bold text-gray-700 dark:text-gray-300 flex items-center gap-2">
                                            {participant.icon && (
                                                <span className="text-sm">{participant.icon}</span>
                                            )}
                                            {participant.name}
                                        </div>
                                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                                            {favorites.length > 0 && (
                                                <div className="space-y-2">
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-pink-500 dark:text-pink-400 flex items-center gap-1">
                                                        <Heart className="h-3 w-3 fill-current" />
                                                        Favorites
                                                    </div>
                                                    {favorites.map((recipe) => (
                                                        <RecipeQuickAddButton
                                                            key={recipe.name}
                                                            recipe={recipe}
                                                            onSelect={() =>
                                                                onSelectRecipe(recipe, participant.name)
                                                            }
                                                            onSearchClear={onSearchChange}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {inPlan.length > 0 && (
                                                <div className="space-y-2">
                                                    {favorites.length > 0 && (
                                                        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                                                    )}
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-indigo-500 dark:text-indigo-400 flex items-center gap-1">
                                                        <Utensils className="h-3 w-3" />
                                                        In This Week&apos;s Plan
                                                    </div>
                                                    {inPlan.map((recipe) => (
                                                        <RecipeQuickAddButton
                                                            key={recipe.name}
                                                            recipe={recipe}
                                                            onSelect={() =>
                                                                onSelectRecipe(recipe, participant.name)
                                                            }
                                                            onSearchClear={onSearchChange}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {searchQuery && searchResults.length > 0 && (
                                                <div className="space-y-2">
                                                    {(favorites.length > 0 || inPlan.length > 0) && (
                                                        <div className="border-t border-gray-200 dark:border-gray-700 my-2" />
                                                    )}
                                                    <div className="text-[10px] font-black uppercase tracking-widest text-gray-500 dark:text-gray-400 flex items-center gap-1">
                                                        <Search className="h-3 w-3" />
                                                        Search Results
                                                    </div>
                                                    {searchResults.map((recipe) => (
                                                        <RecipeQuickAddButton
                                                            key={recipe.name}
                                                            recipe={recipe}
                                                            onSelect={() =>
                                                                onSelectRecipe(recipe, participant.name)
                                                            }
                                                            onSearchClear={onSearchChange}
                                                        />
                                                    ))}
                                                </div>
                                            )}
                                            {matchingRecipes.length === 0 && (
                                                <div className="text-center py-8 text-sm text-gray-400 dark:text-gray-500">
                                                    {searchQuery
                                                        ? 'No recipes found'
                                                        : 'No favorites or planned recipes'}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

function RecipeQuickAddButton({
    recipe,
    onSelect,
    onSearchClear
}: {
    recipe: Recipe;
    onSelect: () => void;
    onSearchClear: (v: string) => void;
}) {
    return (
        <button
            type="button"
            onClick={() => {
                onSelect();
                onSearchClear('');
            }}
            className="w-full text-left p-3 soft-card hover:border-indigo-300 dark:hover:border-indigo-500 transition-all group"
        >
            <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                    <div className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                        {recipe.name}
                    </div>
                    <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {recipe.servings} servings
                    </div>
                </div>
                <div className="flex gap-1 shrink-0">
                    {recipe.isFavorite && (
                        <Heart className="h-3 w-3 text-pink-500 fill-current" />
                    )}
                    {recipe.rating === 'up' && (
                        <ThumbsUp className="h-3 w-3 text-green-500" />
                    )}
                    {recipe.rating === 'down' && (
                        <ThumbsDown className="h-3 w-3 text-red-500" />
                    )}
                </div>
            </div>
        </button>
    );
}
