import {useEffect, useMemo, useState} from 'react';
import {Check, Filter, Heart, History, Minus, Plus, Search, Sparkles, ThumbsDown, ThumbsUp, X} from 'lucide-react';
import {MealPlan, MultiWeeklyCookPlan, Participant, Recipe} from '../types';
import {flattenIngredients} from '../utils/recipeUtils';
import {calculateParticipantTargets, getRecipeCookCount, isRecipeFitForParticipant} from '../utils/mealPlanUtils';
import {buildWeekIngredientSet, scoreIngredientSuggestion, scoreMacroSuggestion} from '../utils/suggestionScoring';
import {format} from 'date-fns';

interface RecipePickerProps {
    recipes: Recipe[];
    allTags: string[];
    showRecipePicker: string; // 'breakfast' | 'lunch' | 'dinner' | 'Recipe'
    onClose: () => void;
    onSelect: (selections: { recipe: Recipe, multiplier: number }[]) => void;
    selectedWeekRecipes: Recipe[];
    participants: Participant[];
    mealPlan: MealPlan;
    multiWeeklyCookPlan: MultiWeeklyCookPlan;
    weekDays: Date[];
}

export function RecipePicker({
                                 recipes,
                                 allTags,
                                 showRecipePicker,
                                 onClose,
                                 onSelect,
                                 selectedWeekRecipes,
                                 participants,
                                 mealPlan,
                                 multiWeeklyCookPlan,
                                 weekDays
                             }: RecipePickerProps) {
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose]);

    const [activeTab, setActiveTab] = useState<'search' | 'suggestions'>('search');
    const [suggestionMode, setSuggestionMode] = useState<'ingredients' | 'macros'>('macros');
    const [pickerSearchQuery, setPickerSearchQuery] = useState('');
    const [pickerSelectedTags, setPickerSelectedTags] = useState<string[]>([]);
    const [pickerSelectedCategories, setPickerSelectedCategories] = useState<string[]>([]);
    const [pickerSelectedRatings, setPickerSelectedRatings] = useState<('up' | 'down' | 'neutral')[]>([]);
    const [pickerShowOnlyFavorites, setPickerShowOnlyFavorites] = useState(false);
    const [pickerShowOnlyNeverCooked, setPickerShowOnlyNeverCooked] = useState(false);
    const [selectedRecipes, setSelectedRecipes] = useState<Record<string, number>>({});
    const [qtyDisplay, setQtyDisplay] = useState<Record<string, string>>({});
    const [minSharedIngredients, setMinSharedIngredients] = useState(1);
    const [useRatingBonus, setUseRatingBonus] = useState(true);

    const categories = ['Breakfast', 'Lunch', 'Dinner', 'Snack', 'Side', 'Drink', 'Misc'];

    const commitQty = (recipeName: string, raw: string) => {
        const n = parseInt(raw, 10);
        const num = (Number.isNaN(n) || n < 1) ? 1 : n;
        updateMultiplier(recipeName, num);
        setQtyDisplay(prev => ({ ...prev, [recipeName]: String(num) }));
    };

    const suggestions = useMemo(() => {
        if (!Array.isArray(recipes)) return [];

        const weekIngredientIds = buildWeekIngredientSet(selectedWeekRecipes);

        const filteredRecipes = recipes.filter(r => {
            if (selectedWeekRecipes.some(wr => wr.name === r.name)) return false;
            if (!participants.every(p => isRecipeFitForParticipant(r, p))) return false;

            // Apply category filter (same as search tab)
            const categoryMatch = pickerSelectedCategories.length === 0 || r.categories?.some(c => pickerSelectedCategories.includes(c));
            if (!categoryMatch) return false;

            // Apply tag filter (same as search tab)
            const tagMatch = pickerSelectedTags.length === 0 || pickerSelectedTags.every(t => r.tags?.includes(t));
            if (!tagMatch) return false;

            const ratingMatch = pickerSelectedRatings.length === 0 || pickerSelectedRatings.includes(r.rating || 'neutral');
            const favoriteMatch = !pickerShowOnlyFavorites || r.isFavorite;
            const neverCookedMatch = !pickerShowOnlyNeverCooked || getRecipeCookCount(multiWeeklyCookPlan, mealPlan, r.name) === 0;

            return ratingMatch && favoriteMatch && neverCookedMatch;
        });

        if (suggestionMode === 'ingredients') {
            if (selectedWeekRecipes.length === 0) return [];
            return filteredRecipes
                .map(r => scoreIngredientSuggestion(r, weekIngredientIds, {useRatingBonus}))
                .filter(item => item.sharedCount >= minSharedIngredients)
                .sort((a, b) => b.score - a.score);
        } else {
            const weeklyTargets = participants.reduce((acc, p) => {
                const targets = calculateParticipantTargets(p);
                return {
                    calories: acc.calories + targets.calories * 7,
                    protein: acc.protein + targets.protein * 7,
                    carbs: acc.carbs + targets.carbs * 7,
                    fat: acc.fat + targets.fat * 7,
                };
            }, {calories: 0, protein: 0, carbs: 0, fat: 0});

            const weeklyPlanned = {calories: 0, protein: 0, carbs: 0, fat: 0};
            weekDays.forEach(day => {
                const dStr = format(day, 'yyyy-MM-dd');
                const dayPlan = mealPlan[dStr] || {};
                const dayMeals = [
                    ...(Array.isArray(dayPlan.breakfast) ? dayPlan.breakfast : []),
                    ...(Array.isArray(dayPlan.lunch) ? dayPlan.lunch : []),
                    ...(Array.isArray(dayPlan.dinner) ? dayPlan.dinner : []),
                    ...(Array.isArray(dayPlan.snacks) ? dayPlan.snacks : []),
                    ...(Array.isArray(dayPlan.drinks) ? dayPlan.drinks : [])
                ];
                dayMeals.forEach(m => {
                    weeklyPlanned.calories += m.recipe.macros.calories * m.servings;
                    weeklyPlanned.protein += m.recipe.macros.protein * m.servings;
                    weeklyPlanned.carbs += m.recipe.macros.carbs * m.servings;
                    weeklyPlanned.fat += m.recipe.macros.fat * m.servings;
                });
            });

            return filteredRecipes
                .map(r => {
                    const multiplier = selectedRecipes[r.name] ?? 1;
                    const cookCount = getRecipeCookCount(multiWeeklyCookPlan, mealPlan, r.name);
                    return scoreMacroSuggestion(r, weeklyTargets, weeklyPlanned, weekIngredientIds, multiplier, cookCount);
                })
                .sort((a, b) => b.score - a.score);
        }
    }, [selectedWeekRecipes, recipes, participants, suggestionMode, mealPlan, multiWeeklyCookPlan, weekDays, pickerSelectedRatings, pickerShowOnlyFavorites, pickerShowOnlyNeverCooked, pickerSelectedCategories, pickerSelectedTags, minSharedIngredients, useRatingBonus, selectedRecipes]);

    const pickerRecipes = useMemo(() => {
        if (!Array.isArray(recipes)) return [];

        return recipes.filter(r =>
            (r.name?.toLowerCase().includes(pickerSearchQuery.toLowerCase()) ||
                flattenIngredients(r.ingredients).some(i => i.ingredient?.toLowerCase().includes(pickerSearchQuery.toLowerCase()))) &&
            (pickerSelectedTags.length === 0 || pickerSelectedTags.every(t => r.tags?.includes(t))) &&
            (pickerSelectedCategories.length === 0 || r.categories?.some(c => pickerSelectedCategories.includes(c))) &&
            (pickerSelectedRatings.length === 0 || pickerSelectedRatings.includes(r.rating || 'neutral')) &&
            (!pickerShowOnlyFavorites || r.isFavorite) &&
            (!pickerShowOnlyNeverCooked || getRecipeCookCount(multiWeeklyCookPlan, mealPlan, r.name) === 0)
        );
    }, [pickerSearchQuery, pickerSelectedTags, pickerSelectedCategories, pickerSelectedRatings, pickerShowOnlyFavorites, pickerShowOnlyNeverCooked, recipes, mealPlan, multiWeeklyCookPlan]);

    const toggleTag = (tag: string) => {
        setPickerSelectedTags(prev =>
            prev.includes(tag) ? prev.filter(t => t !== tag) : [...prev, tag]
        );
    };

    const toggleCategory = (category: string) => {
        setPickerSelectedCategories(prev =>
            prev.includes(category) ? prev.filter(c => c !== category) : [...prev, category]
        );
    };

    const toggleRecipeSelection = (recipeName: string) => {
        setSelectedRecipes(prev => {
            const next = {...prev};
            if (next[recipeName]) {
                delete next[recipeName];
            } else {
                next[recipeName] = 1;
            }
            return next;
        });
        setQtyDisplay(prev => {
            const next = {...prev};
            if (selectedRecipes[recipeName]) {
                delete next[recipeName];
            }
            return next;
        });
    };

    const updateMultiplier = (recipeName: string, multiplier: number) => {
        setSelectedRecipes(prev => ({
            ...prev,
            [recipeName]: Math.max(1, multiplier)
        }));
    };

    const handleAddSelected = () => {
        const selections = Object.entries(selectedRecipes).map(([name, multiplier]) => {
            const recipe = recipes.find(r => r.name === name);
            if (!recipe) return null;
            const raw = qtyDisplay[name];
            const parsed = raw != null && raw !== '' ? parseInt(raw, 10) : null;
            const effectiveMultiplier = (parsed != null && !Number.isNaN(parsed) && parsed >= 1) ? parsed : multiplier;
            return {recipe, multiplier: effectiveMultiplier};
        }).filter(Boolean) as { recipe: Recipe; multiplier: number }[];
        setSelectedRecipes(prev => {
            const next = { ...prev };
            selections.forEach(({ recipe, multiplier }) => {
                next[recipe.name] = multiplier;
            });
            return next;
        });
        setQtyDisplay(prev => {
            const next = { ...prev };
            selections.forEach(({ recipe, multiplier }) => {
                next[recipe.name] = String(multiplier);
            });
            return next;
        });
        onSelect(selections);
    };

    const hasSelections = Object.keys(selectedRecipes).length > 0 && Object.keys(selectedRecipes).every(name => recipes.some(r => r.name === name));

    return (
        <div role="dialog" aria-modal="true"
             className="fixed inset-0 z-[60] flex items-center justify-center p-4 sm:p-6">
            <div className="fixed inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose}></div>
            <div
                className="relative bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col transition-colors duration-300">
                <div
                    className="p-6 border-b dark:border-gray-800 flex justify-between items-center bg-indigo-600 dark:bg-indigo-700 text-white">
                    <h3 className="text-xl font-bold">Choose a {showRecipePicker}</h3>
                    <button onClick={onClose}
                            className="p-1 hover:bg-white/20 dark:hover:bg-gray-700 rounded-full transition-colors"
                            aria-label="Close">
                        <X className="h-6 w-6"/>
                    </button>
                </div>

                <div className="flex border-b dark:border-gray-800 bg-gray-50 dark:bg-gray-900/50">
                    <button
                        onClick={() => setActiveTab('search')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'search' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-900' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        <Search className="h-4 w-4"/> Search Recipes
                    </button>
                    <button
                        onClick={() => setActiveTab('suggestions')}
                        className={`flex-1 py-3 text-sm font-bold flex items-center justify-center gap-2 transition-all ${activeTab === 'suggestions' ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-600 dark:border-indigo-400 bg-white dark:bg-gray-900' : 'text-gray-400 hover:text-gray-600 dark:hover:text-gray-300'}`}
                    >
                        <Sparkles className="h-4 w-4"/> Suggestions
                    </button>
                </div>

                <div className="p-4 border-b dark:border-gray-800 space-y-3 bg-white dark:bg-gray-900">
                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        <div
                            className="flex items-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1">
                            <Filter className="h-3 w-3 mr-1"/> Categories:
                        </div>
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => toggleCategory(cat)}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                    pickerSelectedCategories.includes(cat)
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500'
                                }`}
                            >
                                {cat}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5 max-h-20 overflow-y-auto">
                        <div
                            className="flex items-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1">
                            <Filter className="h-3 w-3 mr-1"/> Tags:
                        </div>
                        {allTags.map(tag => (
                            <button
                                key={tag}
                                onClick={() => toggleTag(tag)}
                                className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors ${
                                    pickerSelectedTags.includes(tag)
                                        ? 'bg-indigo-600 text-white shadow-sm'
                                        : 'bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-500'
                                }`}
                            >
                                {tag}
                            </button>
                        ))}
                    </div>

                    <div className="flex flex-wrap gap-1.5 items-center">
                        <div
                            className="flex items-center text-xs font-bold text-gray-400 dark:text-gray-500 uppercase tracking-wider mr-1">
                            <Sparkles className="h-3 w-3 mr-1"/> Preference:
                        </div>
                        <div
                            className="flex bg-gray-100 dark:bg-gray-800 p-0.5 rounded-full border dark:border-gray-700 items-center">
                            <button
                                onClick={() => {
                                    const rating = 'up';
                                    setPickerSelectedRatings(prev => prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]);
                                }}
                                className={`p-1 rounded-full transition-all ${pickerSelectedRatings.includes('up') ? 'bg-green-500 text-white shadow-sm' : 'text-gray-400 hover:text-green-500'}`}
                                title="Filter Thumbs Up"
                            >
                                <ThumbsUp className="h-3 w-3"/>
                            </button>
                            <button
                                onClick={() => {
                                    const rating = 'neutral';
                                    setPickerSelectedRatings(prev => prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]);
                                }}
                                className={`p-1 rounded-full transition-all ${pickerSelectedRatings.includes('neutral') ? 'bg-gray-400 text-white shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                                title="Filter Neutral"
                            >
                                <Minus className="h-3 w-3"/>
                            </button>
                            <button
                                onClick={() => {
                                    const rating = 'down';
                                    setPickerSelectedRatings(prev => prev.includes(rating) ? prev.filter(r => r !== rating) : [...prev, rating]);
                                }}
                                className={`p-1 rounded-full transition-all ${pickerSelectedRatings.includes('down') ? 'bg-red-500 text-white shadow-sm' : 'text-gray-400 hover:text-red-500'}`}
                                title="Filter Thumbs Down"
                            >
                                <ThumbsDown className="h-3 w-3"/>
                            </button>
                        </div>
                        <button
                            onClick={() => setPickerShowOnlyFavorites(!pickerShowOnlyFavorites)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                                pickerShowOnlyFavorites
                                    ? 'bg-pink-500 text-white shadow-sm'
                                    : 'bg-white dark:bg-gray-800 text-pink-600 dark:text-pink-400 border border-gray-200 dark:border-gray-700 hover:border-pink-300'
                            }`}
                        >
                            <Heart
                                className={`h-2.5 w-2.5 ${pickerShowOnlyFavorites ? 'fill-current' : ''}`}/> Favorites
                        </button>
                        <button
                            onClick={() => setPickerShowOnlyNeverCooked(!pickerShowOnlyNeverCooked)}
                            className={`px-2 py-0.5 rounded-full text-xs font-medium transition-colors flex items-center gap-1 ${
                                pickerShowOnlyNeverCooked
                                    ? 'bg-amber-500 text-white shadow-sm'
                                    : 'bg-white dark:bg-gray-800 text-amber-600 dark:text-amber-400 border border-gray-200 dark:border-gray-700 hover:border-amber-300'
                            }`}
                        >
                            <History className="h-2.5 w-2.5"/> Never Cooked
                        </button>
                        {(pickerSelectedTags.length > 0 || pickerSelectedCategories.length > 0 || pickerSelectedRatings.length > 0 || pickerShowOnlyFavorites || pickerShowOnlyNeverCooked) && (
                            <button
                                onClick={() => {
                                    setPickerSelectedTags([]);
                                    setPickerSelectedCategories([]);
                                    setPickerSelectedRatings([]);
                                    setPickerShowOnlyFavorites(false);
                                    setPickerShowOnlyNeverCooked(false);
                                }}
                                className="text-xs text-gray-400 hover:text-gray-600 underline ml-2"
                            >
                                Clear all
                            </button>
                        )}
                    </div>
                </div>

                {activeTab === 'search' ? (
                    <div className="p-4 border-b dark:border-gray-800">
                        <div className="relative">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400"/>
                            <input
                                type="text"
                                placeholder="Search by name or ingredient..."
                                className="w-full pl-9 pr-4 py-2 bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm focus:ring-2 focus:ring-indigo-500 outline-none text-gray-900 dark:text-gray-100"
                                value={pickerSearchQuery}
                                onChange={e => setPickerSearchQuery(e.target.value)}
                            />
                        </div>
                    </div>
                ) : (
                    <div
                        className="p-4 border-b dark:border-gray-800 flex items-center justify-between bg-indigo-50/30 dark:bg-indigo-900/10">
                        <div className="flex items-center gap-3">
                            <span
                                className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Suggestion Mode:</span>
                            <div
                                className="flex bg-white dark:bg-gray-800 p-1 rounded-lg border dark:border-gray-700 shadow-sm">
                                <button
                                    onClick={() => setSuggestionMode('ingredients')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all uppercase ${suggestionMode === 'ingredients' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                >
                                    Ingredients
                                </button>
                                <button
                                    onClick={() => setSuggestionMode('macros')}
                                    className={`px-3 py-1 rounded-md text-[10px] font-bold transition-all uppercase ${suggestionMode === 'macros' ? 'bg-indigo-600 text-white shadow-sm' : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200'}`}
                                >
                                    Macros
                                </button>
                            </div>
                            {/* Min shared ingredients — ingredients mode only */}
                            {suggestionMode === 'ingredients' && (
                                <div className="flex items-center gap-2 ml-3">
                                    <span className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">
                                        Min shared:
                                    </span>
                                    <div className="flex items-center gap-1">
                                        <button
                                            onClick={() => setMinSharedIngredients(Math.max(1, minSharedIngredients - 1))}
                                            className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold text-xs"
                                        >-</button>
                                        <span className="text-xs font-bold text-indigo-600 dark:text-indigo-400 w-4 text-center">
                                            {minSharedIngredients}
                                        </span>
                                        <button
                                            onClick={() => setMinSharedIngredients(Math.min(5, minSharedIngredients + 1))}
                                            className="w-5 h-5 flex items-center justify-center rounded bg-gray-100 dark:bg-gray-800 text-gray-500 hover:bg-indigo-100 dark:hover:bg-indigo-900 font-bold text-xs"
                                        >+</button>
                                    </div>
                                </div>
                            )}
                            {/* Rating bonus toggle — ingredients mode only */}
                            {suggestionMode === 'ingredients' && (
                                <button
                                    onClick={() => setUseRatingBonus(!useRatingBonus)}
                                    className={`ml-2 px-2 py-0.5 rounded-full text-[10px] font-bold transition-colors ${
                                        useRatingBonus
                                            ? 'bg-green-500 text-white'
                                            : 'bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-200 dark:border-gray-700'
                                    }`}
                                    title="Use thumbs up/down weighting"
                                >
                                    Rating bonus
                                </button>
                            )}
                        </div>
                        <div
                            className="text-[10px] font-bold text-indigo-600 dark:text-indigo-400 flex items-center gap-1">
                            <Sparkles
                                className="h-3 w-3"/> {suggestionMode === 'ingredients' ? 'Matching your week' : 'Targeting macro gaps'}
                        </div>
                    </div>
                )}

                <div className="flex-1 overflow-y-auto p-4 space-y-3">
                    {(activeTab === 'search' ? pickerRecipes : suggestions.map(s => s.recipe)).length > 0 ? (
                        (activeTab === 'search' ? pickerRecipes : suggestions.map(s => s.recipe)).map(r => {
                            const isSelected = !!selectedRecipes[r.name];
                            const sInfo = activeTab === 'suggestions' ? suggestions.find(s => s.recipe.name === r.name) : null;

                            return (
                                <div
                                    key={r.name}
                                    className={`w-full text-left p-4 rounded-xl border transition-all shadow-sm hover:shadow-md group flex items-start gap-4 ${
                                        isSelected
                                            ? 'border-indigo-500 dark:border-indigo-400 bg-indigo-50/50 dark:bg-indigo-900/30'
                                            : 'border-gray-100 dark:border-gray-800 hover:border-indigo-300 dark:hover:border-indigo-600'
                                    }`}
                                >
                                    <div className="flex items-center self-stretch">
                                        <button
                                            onClick={() => toggleRecipeSelection(r.name)}
                                            aria-label={`Select ${r.name}`}
                                            className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${
                                                isSelected
                                                    ? 'bg-indigo-600 border-indigo-600 text-white'
                                                    : 'border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800'
                                            }`}
                                        >
                                            {isSelected && <Check className="h-4 w-4"/>}
                                        </button>
                                    </div>

                                    <div className="flex-1 min-w-0">
                                        <div className="flex justify-between items-start">
                                            <div className="flex items-center gap-2 min-w-0 pr-2">
                                                <div
                                                    className="text-sm font-bold text-gray-900 dark:text-gray-100 group-hover:text-indigo-700 dark:group-hover:text-indigo-300 transition-colors truncate">{r.name}</div>
                                                <div className="flex gap-1 shrink-0">
                                                    {r.isFavorite && (
                                                        <Heart className="h-3 w-3 text-pink-500 fill-current"/>
                                                    )}
                                                    {r.rating === 'up' && (
                                                        <ThumbsUp className="h-3 w-3 text-green-500"/>
                                                    )}
                                                    {r.rating === 'down' && (
                                                        <ThumbsDown className="h-3 w-3 text-red-500"/>
                                                    )}
                                                </div>
                                            </div>
                                            <button
                                                onClick={() => onSelect([{recipe: r, multiplier: 1}])}
                                                className="text-gray-300 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 p-1"
                                                title="Add 1 now"
                                            >
                                                <Plus className="h-5 w-5"/>
                                            </button>
                                        </div>

                                        <div className="flex flex-wrap items-end gap-2 mt-2">
                                            <div className="flex flex-wrap gap-1 flex-1">
                                                {r.categories.map(c => (
                                                    <span key={c}
                                                          className="text-[10px] bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400 border border-gray-100 dark:border-gray-700 px-1.5 py-0.5 rounded">{c}</span>
                                                ))}
                                                {activeTab === 'suggestions' && sInfo && (
                                                    suggestionMode === 'ingredients' ? (
                                                        <span
                                                            className="text-[10px] bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 px-1.5 py-0.5 rounded font-bold">
                              {sInfo.sharedCount} shared
                            </span>
                                                    ) : (
                                                        <span
                                                            className="text-[10px] bg-green-100 dark:bg-green-900/50 text-green-700 dark:text-green-300 px-1.5 py-0.5 rounded font-bold">
                              Fit: {Math.round(sInfo.score)}
                            </span>
                                                    )
                                                )}
                                            </div>

                                            <div
                                                className="flex flex-col text-[10px] text-gray-400 dark:text-gray-500 items-end shrink-0">
                                                <span
                                                    className="font-bold text-indigo-600/60 dark:text-indigo-400/60">{r.macros.calories} kcal</span>
                                                <div className="flex gap-x-2">
                                                    <span>P:{r.macros.protein}g</span>
                                                    <span>F:{r.macros.fat}g</span>
                                                    <span>C:{r.macros.carbs}g</span>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {isSelected && (
                                        <div
                                            className="flex flex-col items-center gap-1 self-center pl-2 border-l dark:border-gray-700">
                                            <span
                                                className="text-[8px] font-black text-indigo-400 uppercase tracking-widest">Qty</span>
                                            <input
                                                type="number"
                                                min={1}
                                                value={qtyDisplay[r.name] ?? String(selectedRecipes[r.name] ?? 1)}
                                                onChange={(e) => setQtyDisplay(prev => ({ ...prev, [r.name]: e.target.value }))}
                                                onBlur={(e) => commitQty(r.name, e.target.value)}
                                                className="w-12 px-1 py-1 bg-white dark:bg-gray-800 border-2 border-indigo-200 dark:border-indigo-900 rounded-lg text-xs font-black text-center text-indigo-600 dark:text-indigo-400 outline-none focus:ring-2 focus:ring-indigo-500"
                                            />
                                        </div>
                                    )}
                                </div>
                            );
                        })
                    ) : (
                        <div
                            className="text-center py-20 bg-gray-50 dark:bg-gray-800/20 rounded-2xl border-2 border-dashed border-gray-100 dark:border-gray-800">
                            <div
                                className="w-12 h-12 bg-white dark:bg-gray-800 rounded-full flex items-center justify-center mx-auto mb-3 shadow-sm">
                                {activeTab === 'search' ? <Search className="h-5 w-5 text-gray-300"/> :
                                    <Sparkles className="h-5 w-5 text-gray-300"/>}
                            </div>
                            <p className="text-sm font-medium text-gray-500 dark:text-gray-400">
                                {activeTab === 'search'
                                    ? 'No recipes found matching your criteria.'
                                    : (suggestionMode === 'ingredients' ? 'Add some recipes to your week to see ingredient-based suggestions!' : 'Complete your daily plans to see macro-based suggestions!')}
                            </p>
                            {activeTab === 'search' && (
                                <button
                                    onClick={() => {
                                        setPickerSearchQuery('');
                                        setPickerSelectedTags([]);
                                        setPickerSelectedCategories([]);
                                    }}
                                    className="text-xs text-indigo-600 dark:text-indigo-400 font-bold mt-4 hover:underline underline-offset-4"
                                >
                                    Clear all filters
                                </button>
                            )}
                        </div>
                    )}
                </div>

                <div
                    className="p-4 bg-gray-50 dark:bg-gray-900 border-t dark:border-gray-800 flex items-center justify-between gap-4">
                    <div className="flex flex-col">
                        <span
                            className="text-[10px] font-black text-gray-400 uppercase tracking-widest leading-none mb-1">Results</span>
                        <span className="text-xs font-bold text-gray-700 dark:text-gray-300">
              {(activeTab === 'search' ? pickerRecipes : suggestions).length} recipe{(activeTab === 'search' ? pickerRecipes : suggestions).length !== 1 ? 's' : ''} available
            </span>
                    </div>

                    {hasSelections ? (
                        <button
                            onClick={handleAddSelected}
                            className="px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-sm font-black transition-all shadow-lg shadow-indigo-200 dark:shadow-none flex items-center gap-2 animate-in fade-in slide-in-from-right-4 duration-200"
                        >
                            Add {Object.keys(selectedRecipes).length} Recipe{Object.keys(selectedRecipes).length > 1 ? 's' : ''}
                            <Plus className="h-4 w-4"/>
                        </button>
                    ) : (
                        <button
                            onClick={onClose}
                            className="px-6 py-2.5 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 text-sm font-bold transition-all"
                        >
                            Cancel
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
