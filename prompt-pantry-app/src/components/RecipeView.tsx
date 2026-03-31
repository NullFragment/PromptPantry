import React, {useState} from 'react';
import {
    AlertTriangle,
    ArrowUpDown,
    CheckSquare,
    FileJson,
    Filter,
    Heart,
    History,
    Info,
    LayoutGrid,
    List,
    Minus,
    Plus,
    Search,
    Square,
    ThumbsDown,
    ThumbsUp,
    Trash2
} from 'lucide-react';
import {MealPlan, MultiWeeklyCookPlan, Recipe} from '../types';
import {getRecipeCookCount} from '../utils/mealPlanUtils';
import {SelectionActionBar} from './SelectionActionBar';
import {useAppContext} from '../hooks/useAppContext';

interface RecipeViewProps {
    recipes: Recipe[];
    sortedAndFilteredRecipes: Recipe[];
    viewMode: 'grid' | 'table';
    setViewMode: (mode: 'grid' | 'table') => void;
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    allTags: string[];
    selectedTags: string[];
    toggleTag: (tag: string) => void;
    allCategories: string[];
    selectedCategories: string[];
    toggleCategory: (cat: string) => void;
    selectedRatings: ('up' | 'down' | 'neutral')[];
    toggleRating: (rating: 'up' | 'down' | 'neutral') => void;
    showOnlyFavorites: boolean;
    setShowOnlyFavorites: (show: boolean) => void;
    showOnlyNeverCooked: boolean;
    setShowOnlyNeverCooked: (show: boolean) => void;
    clearFilters: () => void;
    sortConfig: { key: string, direction: 'asc' | 'desc' } | null;
    handleSort: (key: string) => void;
    setSelectedRecipe: (data: { recipe: Recipe } | null) => void;
    onDeleteRecipes: (ids: string[]) => void;
    mealPlan: MealPlan;
    multiWeeklyCookPlan: MultiWeeklyCookPlan;
}

export function RecipeView({
                               sortedAndFilteredRecipes,
                               viewMode,
                               setViewMode,
                               searchQuery,
                               setSearchQuery,
                               allTags,
                               selectedTags,
                               toggleTag,
                               allCategories,
                               selectedCategories,
                               toggleCategory,
                               selectedRatings,
                               toggleRating,
                               showOnlyFavorites,
                               setShowOnlyFavorites,
                               showOnlyNeverCooked,
                               setShowOnlyNeverCooked,
                               clearFilters,
                               sortConfig,
                               handleSort,
                               setSelectedRecipe,
                               onDeleteRecipes,
                               mealPlan,
                               multiWeeklyCookPlan
                           }: RecipeViewProps) {
    const { advancedMode, canEdit } = useAppContext();
    const [selectedRecipes, setSelectedRecipes] = useState<string[]>([]);

    const toggleRecipeSelection = (id: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        setSelectedRecipes(prev =>
            prev.includes(id) ? prev.filter(n => n !== id) : [...prev, id]
        );
    };

    const handleBulkDelete = () => {
        onDeleteRecipes(selectedRecipes);
        setSelectedRecipes([]);
    };
    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row md:items-start justify-between gap-6">
                <div className="space-y-4 flex-1">
                    <h1 className="text-3xl font-extrabold text-gray-900 dark:text-gray-100">Recipes</h1>
                    <div className="flex flex-wrap gap-2">
                        <div className="flex items-center text-sm font-medium text-gray-500 dark:text-gray-400 mr-2">
                            <Filter className="h-4 w-4 mr-1"/> Filters:
                        </div>
                        {allCategories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => toggleCategory(cat)}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition-colors ${
                                    selectedCategories.includes(cat)
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 border border-indigo-100 dark:border-indigo-900/50 hover:border-indigo-300 dark:hover:border-indigo-700'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                        <div className="w-full h-0 md:hidden"></div>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                                    selectedTags.includes(tag)
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-gray-800 text-gray-600 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                        <div className="w-full h-0"></div>
                        <button
                            onClick={() => setShowOnlyFavorites(!showOnlyFavorites)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
                                showOnlyFavorites
                                    ? 'bg-pink-500 text-white shadow-sm'
                                    : 'bg-pink-50 dark:bg-pink-900/20 text-pink-600 dark:text-pink-400 border border-pink-100 dark:border-pink-900/50 hover:border-pink-300'
                            }`}
                        >
                            <Heart className={`h-3 w-3 ${showOnlyFavorites ? 'fill-current' : ''}`}/> Favorites
                        </button>
                        <button
                            onClick={() => setShowOnlyNeverCooked(!showOnlyNeverCooked)}
                            className={`px-3 py-1 rounded-full text-xs font-bold transition-colors flex items-center gap-1.5 ${
                                showOnlyNeverCooked
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400 border border-amber-100 dark:border-amber-900/50 hover:border-amber-300'
                            }`}
                        >
                            <History className="h-3 w-3"/> Never Cooked
                        </button>
                        <div
                            className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-full border dark:border-gray-700 items-center">
                            <button
                                onClick={() => toggleRating('up')}
                                className={`p-1 rounded-full transition-all ${selectedRatings.includes('up') ? 'bg-green-500 text-white shadow-sm' : 'text-gray-400 hover:text-green-500'}`}
                                title="Filter Thumbs Up"
                            >
                                <ThumbsUp className="h-3.5 w-3.5"/>
                            </button>
                            <button
                                onClick={() => toggleRating('neutral')}
                                className={`p-1 rounded-full transition-all ${selectedRatings.includes('neutral') ? 'bg-gray-400 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Filter Neutral"
                            >
                                <Minus className="h-3.5 w-3.5"/>
                            </button>
                            <button
                                onClick={() => toggleRating('down')}
                                className={`p-1 rounded-full transition-all ${selectedRatings.includes('down') ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:text-red-500'}`}
                                title="Filter Thumbs Down"
                            >
                                <ThumbsDown className="h-3.5 w-3.5"/>
                            </button>
                        </div>
                        {(selectedTags.length > 0 || selectedCategories.length > 0 || selectedRatings.length > 0 || showOnlyFavorites || showOnlyNeverCooked) && (
                            <button
                                onClick={clearFilters}
                                className="text-xs text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 underline underline-offset-2 ml-2"
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                </div>

                <div className="flex flex-col sm:flex-row gap-4">
                    <div className="relative">
                        <Search
                            className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400 dark:text-gray-500"/>
                        <input
                            type="text"
                            placeholder="Search recipes, ingredients..."
                            className="pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent w-full md:w-64 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors"
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div
                        className="flex bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 p-1 rounded-lg self-start items-center">
                        {canEdit && (
                            <button
                                onClick={() => setSelectedRecipe({
                                    recipe: {
                                        id: '',
                                        name: '',
                                        categories: [],
                                        prepTime: '',
                                        cookTime: '',
                                        servings: 1,
                                        tags: [],
                                        ingredients: [],
                                        instructions: [],
                                        macros: {calories: 0, protein: 0, carbs: 0, fat: 0}
                                    },
                                })}
                                className="p-1.5 rounded-md text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 transition-all mr-1"
                                title="Add Recipe"
                            >
                                <Plus className="h-5 w-5"/>
                            </button>
                        )}
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'grid' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            title="Grid View"
                        >
                            <LayoutGrid className="h-5 w-5"/>
                        </button>
                        <button
                            onClick={() => setViewMode('table')}
                            className={`p-1.5 rounded-md transition-all ${viewMode === 'table' ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400' : 'text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300'}`}
                            title="Table View"
                        >
                            <List className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
            </div>

            {advancedMode && sortedAndFilteredRecipes.some(r => (r as any)._isValid === false) && (
                <div
                    className="mb-8 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-800 rounded-xl p-4 sm:p-6 transition-all animate-in fade-in slide-in-from-top-4 duration-300">
                    <div className="flex items-start gap-4">
                        <div
                            className="p-3 bg-amber-100 dark:bg-amber-900/40 rounded-lg shrink-0 text-amber-600 dark:text-amber-400">
                            <AlertTriangle className="h-6 w-6"/>
                        </div>
                        <div className="flex-1">
                            <h3 className="text-lg font-bold text-amber-900 dark:text-amber-100">Invalid Recipes
                                Detected</h3>
                            <p className="text-sm text-amber-700 dark:text-amber-300 mb-4">The following recipes failed
                                schema validation. Enable Advanced Mode in the Participants menu to edit their raw JSON
                                and correct them.</p>
                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {sortedAndFilteredRecipes.filter(r => (r as any)._isValid === false).map(recipe => (
                                    <button
                                        key={recipe.name}
                                        onClick={() => setSelectedRecipe({recipe})}
                                        className="flex flex-col text-left p-3 bg-white dark:bg-gray-800 border border-amber-200 dark:border-amber-800 rounded-lg hover:shadow-md transition-all group"
                                    >
                                        <div className="flex items-center justify-between mb-1">
                                            <span
                                                className="font-bold text-amber-900 dark:text-amber-100 truncate flex-1">{recipe.name || 'Unnamed Recipe'}</span>
                                            <FileJson
                                                className="h-4 w-4 text-amber-500 opacity-0 group-hover:opacity-100 transition-opacity"/>
                                        </div>
                                        <span
                                            className="text-[10px] text-amber-600 dark:text-amber-400 line-clamp-2">{(recipe as any)._errors}</span>
                                    </button>
                                ))}
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {viewMode === 'grid' ? (
                <div className="grid grid-cols-[repeat(auto-fill,minmax(theme(spacing.72),1fr))] gap-6">
                    {sortedAndFilteredRecipes.map((recipe) => (
                        <div
                            key={recipe.name}
                            className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border overflow-hidden hover:shadow-md dark:hover:shadow-indigo-900/20 transition-all cursor-pointer flex flex-col relative group ${
                                selectedRecipes.includes(recipe.id) ? 'border-indigo-500 ring-1 ring-indigo-500' : 'border-gray-100 dark:border-gray-800'
                            }`}
                            onClick={() => setSelectedRecipe({recipe})}
                        >
                            <div className="absolute top-3 right-3 flex gap-2 z-10 items-center">
                                <div className="flex gap-1">
                                    {recipe.isFavorite && (
                                        <div className="bg-pink-500 text-white p-1 rounded-lg shadow-sm"
                                             title="Favorited">
                                            <Heart className="h-3.5 w-3.5 fill-current"/>
                                        </div>
                                    )}
                                    {recipe.rating === 'up' && (
                                        <div className="bg-green-500 text-white p-1 rounded-lg shadow-sm"
                                             title="Thumbs Up">
                                            <ThumbsUp className="h-3.5 w-3.5"/>
                                        </div>
                                    )}
                                    {recipe.rating === 'down' && (
                                        <div className="bg-red-500 text-white p-1 rounded-lg shadow-sm"
                                             title="Thumbs Down">
                                            <ThumbsDown className="h-3.5 w-3.5"/>
                                        </div>
                                    )}
                                </div>
                                {canEdit && (
                                    <button
                                        onClick={(e) => toggleRecipeSelection(recipe.id, e)}
                                        className={`p-1.5 rounded-lg transition-all ${
                                            selectedRecipes.includes(recipe.id)
                                                ? 'bg-indigo-600 text-white shadow-md'
                                                : 'bg-white/80 dark:bg-gray-800/80 text-gray-400 opacity-0 group-hover:opacity-100 hover:text-indigo-600 shadow-sm'
                                        }`}
                                        title={selectedRecipes.includes(recipe.id) ? "Deselect Recipe" : "Select Recipe"}
                                    >
                                        {selectedRecipes.includes(recipe.id) ? <CheckSquare className="h-4 w-4"/> :
                                            <Square className="h-4 w-4"/>}
                                    </button>
                                )}
                            </div>
                            <div className="p-5 flex-1">
                                <div className="flex flex-wrap gap-1 mb-2">
                                    {recipe.categories.map(cat => (
                                        <span key={cat}
                                              className="text-[10px] font-semibold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-900/30 px-2 py-0.5 rounded">
                      {cat}
                    </span>
                                    ))}
                                </div>
                                <h3 className="font-bold text-base leading-tight mb-2 h-10 overflow-hidden line-clamp-2 dark:text-gray-100">{recipe.name}</h3>
                                {advancedMode && (
                                    <p className="text-[10px] font-mono text-gray-400 dark:text-gray-600 mb-1 truncate opacity-60">{recipe.id}</p>
                                )}
                                <div className="text-sm text-gray-500 dark:text-gray-400 mb-4">
                                    <div className="flex items-center mb-1">
                                        <Info className="h-3 w-3 mr-1"/> {recipe.macros.calories} kcal
                                    </div>
                                    <div className="flex gap-x-3 text-xs">
                                        <span>P: {recipe.macros.protein}g</span>
                                        <span>F: {recipe.macros.fat}g</span>
                                        <span>C: {recipe.macros.carbs}g</span>
                                    </div>
                                </div>
                                <div className="flex flex-wrap gap-1">
                                    {recipe.tags.map(tag => (
                                        <span key={tag}
                                              className="text-[10px] bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 border border-gray-100 dark:border-gray-700 px-1.5 py-0.5 rounded">
                      {tag}
                    </span>
                                    ))}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <div
                    className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-left border-collapse">
                            <thead>
                            <tr className="bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                                {canEdit && (
                                    <th className="px-6 py-4 w-10">
                                        <button
                                            onClick={() => {
                                                if (selectedRecipes.length === sortedAndFilteredRecipes.length) {
                                                    setSelectedRecipes([]);
                                                } else {
                                                    setSelectedRecipes(sortedAndFilteredRecipes.map(r => r.id));
                                                }
                                            }}
                                            className="text-gray-400 hover:text-indigo-600 transition-colors"
                                            title={selectedRecipes.length === sortedAndFilteredRecipes.length ? "Deselect All" : "Select All"}
                                        >
                                            {selectedRecipes.length === sortedAndFilteredRecipes.length && sortedAndFilteredRecipes.length > 0
                                                ? <CheckSquare className="h-4 w-4"/>
                                                : <Square className="h-4 w-4"/>}
                                        </button>
                                    </th>
                                )}
                                {[
                                    {key: 'name', label: 'Name'},
                                    {key: 'calories', label: 'Calories'},
                                    {key: 'protein', label: 'Protein'},
                                    {key: 'carbs', label: 'Carbs'},
                                    {key: 'fat', label: 'Fat'},
                                    {key: 'cooked', label: 'Cooked'},
                                    {key: 'status', label: 'Status'},
                                    {key: 'prepTime', label: 'Prep'},
                                    {key: 'cookTime', label: 'Cook'}
                                ].map(({key, label}) => (
                                    <th
                                        key={key}
                                        onClick={() => handleSort(key)}
                                        className="px-6 py-4 text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest cursor-pointer hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    >
                                        <div className="flex items-center">
                                            {label}
                                            <ArrowUpDown
                                                className={`ml-2 h-3 w-3 ${sortConfig?.key === key ? 'text-indigo-600' : 'text-gray-300'}`}/>
                                        </div>
                                    </th>
                                ))}
                            </tr>
                            </thead>
                            <tbody className="divide-y dark:divide-gray-800">
                            {sortedAndFilteredRecipes.map((recipe) => (
                                <tr
                                    key={recipe.name}
                                    className={`hover:bg-gray-50 dark:hover:bg-gray-800/50 cursor-pointer transition-colors ${
                                        selectedRecipes.includes(recipe.id) ? 'bg-indigo-50/30 dark:bg-indigo-900/10' : ''
                                    }`}
                                    onClick={() => setSelectedRecipe({recipe})}
                                >
                                    {canEdit && (
                                        <td className="px-6 py-4" onClick={(e) => toggleRecipeSelection(recipe.id, e)}>
                                            <button className="text-gray-400 hover:text-indigo-600 transition-colors">
                                                {selectedRecipes.includes(recipe.id) ?
                                                    <CheckSquare className="h-4 w-4 text-indigo-600"/> :
                                                    <Square className="h-4 w-4"/>}
                                            </button>
                                        </td>
                                    )}
                                    <td className="px-6 py-4">
                                        <div className="font-bold text-gray-900 dark:text-gray-100">{recipe.name}</div>
                                        <div className="flex gap-1 mt-1">
                                            {recipe.categories.slice(0, 2).map(cat => (
                                                <span key={cat}
                                                      className="text-[10px] text-indigo-600 dark:text-indigo-400">{cat}</span>
                                            ))}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400 font-medium">{recipe.macros.calories}</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{recipe.macros.protein}g</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{recipe.macros.carbs}g</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{recipe.macros.fat}g</td>
                                    <td className="px-6 py-4 text-sm font-bold text-indigo-600 dark:text-indigo-400">
                                        {getRecipeCookCount(multiWeeklyCookPlan, mealPlan, recipe.name)}x
                                    </td>
                                    <td className="px-6 py-4">
                                        <div className="flex gap-2">
                                            {recipe.isFavorite && (
                                                <span title="Favorite">
                            <Heart className="h-4 w-4 text-pink-500 fill-current"/>
                          </span>
                                            )}
                                            {recipe.rating === 'up' && (
                                                <span title="Liked">
                            <ThumbsUp className="h-4 w-4 text-green-500"/>
                          </span>
                                            )}
                                            {recipe.rating === 'down' && (
                                                <span title="Disliked">
                            <ThumbsDown className="h-4 w-4 text-red-500"/>
                          </span>
                                            )}
                                            {(recipe.rating === 'neutral' || !recipe.rating) && !recipe.isFavorite && (
                                                <Minus className="h-4 w-4 text-gray-300"/>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{recipe.prepTime}m</td>
                                    <td className="px-6 py-4 text-sm text-gray-600 dark:text-gray-400">{recipe.cookTime}m</td>
                                </tr>
                            ))}
                            </tbody>
                        </table>
                    </div>
                </div>
            )}

            {sortedAndFilteredRecipes.length === 0 && (
                <div
                    className="text-center py-20 bg-white dark:bg-gray-900 rounded-xl border-2 border-dashed border-gray-200 dark:border-gray-800">
                    <div
                        className="bg-gray-50 dark:bg-gray-800 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="h-8 w-8 text-gray-300"/>
                    </div>
                    <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-1">No recipes found</h3>
                    <p className="text-gray-500 dark:text-gray-400">Try adjusting your search or filters to find what
                        you're looking for.</p>
                    <button
                        onClick={clearFilters}
                        className="mt-6 text-indigo-600 dark:text-indigo-400 font-bold hover:underline"
                    >
                        Clear all filters
                    </button>
                </div>
            )}

            {canEdit && selectedRecipes.length > 0 && (
                <SelectionActionBar
                    count={selectedRecipes.length}
                    itemLabel="recipe"
                    onClearAll={() => setSelectedRecipes([])}
                >
                    <button
                        type="button"
                        onClick={handleBulkDelete}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                        title="Delete Selected"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        Delete selected
                    </button>
                </SelectionActionBar>
            )}
        </div>
    );
}
