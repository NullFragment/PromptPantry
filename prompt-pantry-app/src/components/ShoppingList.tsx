import {useMemo, useState} from 'react';
import {Check, ChevronDown, ChevronLeft, ChevronRight, Copy, ShoppingCart, Utensils} from 'lucide-react';
import {addDays, addWeeks, endOfWeek, format, startOfWeek, subWeeks} from 'date-fns';
import {Ingredient, IngredientDefinition, MealPlan, MultiWeeklyCookPlan, Participant, Recipe} from '../types';
import {
    aggregateIngredients,
    type AggregatedTotals,
    flattenIngredients,
    getIngredientStoreSection,
    getPrimaryQuantityAndUnit,
    normalizeIngredientName,
    renderAggregatedMeasurement,
    resolveCanonicalName
} from '../utils/recipeUtils';
import {
    calculateContainerNeeds,
    formatContainerRecommendation
} from '../utils/containerUtils';
import { normalizeToPreferredUnit } from '../utils/unitConversions';
import { isTransferredItem } from '../utils/mealPlanUtils';
import { sortSectionsWithUnassignedLast } from '../utils/storeSectionUtils';
import {DatePicker} from './DatePicker';
import {getMealTypeStyle, MealTypeKey} from '../styles/designTokens';
import {useAppContext} from '../hooks/useAppContext';

interface ShoppingListAggregatedItem {
    key: string;
    name: string;
    totals: AggregatedTotals;
    ingredientDef: IngredientDefinition | null;
}

function ShoppingListItemRow({
    item,
    unitSystem
}: {
    item: ShoppingListAggregatedItem;
    unitSystem: 'metric' | 'imperial' | 'both';
}) {
    const { name, totals, ingredientDef } = item;
    const primary = getPrimaryQuantityAndUnit(totals);
    const containerRec =
        ingredientDef?.containerSizes?.length && primary
            ? formatContainerRecommendation(
                  calculateContainerNeeds(
                      primary.quantity,
                      primary.unit,
                      ingredientDef.containerSizes,
                      true
                  )
              )
            : null;
    const preferMetric = unitSystem === 'metric';
    const normalized =
        ingredientDef?.conversions && primary
            ? normalizeToPreferredUnit(
                  primary.quantity,
                  primary.unit,
                  ingredientDef,
                  preferMetric
              )
            : null;
    const showConverted =
        primary &&
        normalized &&
        (Math.abs(normalized.value - primary.quantity) > 1e-6 || normalized.unit !== primary.unit);
    const displayMeasurement = showConverted
        ? `${Number(normalized!.value.toFixed(2))} ${normalized!.unit}`
        : renderAggregatedMeasurement(totals, unitSystem);
    const conversionTooltip =
        showConverted && primary ? `Converted from ${primary.quantity} ${primary.unit}` : undefined;

    return (
        <div className="p-4 flex flex-col gap-0.5 hover:bg-gray-50 dark:hover:bg-gray-800 transition-colors">
            <div className="flex justify-between items-center">
                <span className="capitalize font-medium dark:text-gray-200">{name}</span>
                <div
                    className="text-sm text-gray-600 dark:text-gray-400 text-right font-semibold"
                    title={conversionTooltip}
                >
                    {displayMeasurement}
                    {showConverted && (
                        <span className="ml-1 text-indigo-500 dark:text-indigo-400" title={conversionTooltip} aria-label={conversionTooltip}>
                            ●
                        </span>
                    )}
                </div>
            </div>
            {containerRec && (
                <p className="text-xs text-indigo-600 dark:text-indigo-400 font-medium">
                    {containerRec}
                </p>
            )}
        </div>
    );
}

interface ShoppingListProps {
    mealPlan: MealPlan;
    recipes: Recipe[];
    participants: Participant[];
    multiWeeklyCookPlan: MultiWeeklyCookPlan;
    selectedDate: Date;
    setSelectedDate: (d: Date) => void;
    setSelectedRecipe: (data: { recipe: Recipe, highlightedIngredients?: string[] } | null) => void;
    ingredients: IngredientDefinition[];
}

export function ShoppingList({
                                 mealPlan,
                                 recipes,
                                 participants,
                                 multiWeeklyCookPlan,
                                 selectedDate,
                                 setSelectedDate,
                                 setSelectedRecipe,
                                 ingredients
                             }: ShoppingListProps) {
    const { unitSystem } = useAppContext();
    const [copied, setCopied] = useState(false);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [collapsedSections, setCollapsedSections] = useState<Set<string>>(new Set());
    const weekStart = startOfWeek(selectedDate, {weekStartsOn: 0});
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');
    const weekEnd = endOfWeek(selectedDate, {weekStartsOn: 0});

    // Build lookup map for ingredient definitions by ID
    const ingredientsLookup = useMemo(() => {
        const lookup = new Map<string, IngredientDefinition>();
        ingredients.forEach(ing => lookup.set(ing.id, ing));
        return lookup;
    }, [ingredients]);

    // Build lookup map for recipes by name (avoids repeated .find in loops)
    const recipesByName = useMemo(() => {
        const map = new Map<string, Recipe>();
        recipes.forEach(r => map.set(r.name, r));
        return map;
    }, [recipes]);

    const toggleSection = (section: string) => {
        setCollapsedSections(prev => {
            const next = new Set(prev);
            if (next.has(section)) {
                next.delete(section);
            } else {
                next.add(section);
            }
            return next;
        });
    };

    const weekDays = useMemo(() => {
        return Array.from({length: 7}, (_, i) => addDays(weekStart, i));
    }, [weekStart]);

    const aggregatedIngredients = useMemo(() => {
        // Group by ingredientId if available, otherwise by normalized name
        const ingredientMap: { [key: string]: { ingredient: Ingredient, count: number }[] } = {};
        const currentWeekPlan = multiWeeklyCookPlan[weekStartStr] || {};

        // 1. Aggregate from batch plan (planned + transferred already reflected in item.servings)
        Object.entries(currentWeekPlan).forEach(([_instanceId, item]) => {
            // Skip transferred items - they were already cooked in a previous week
            if (isTransferredItem(item)) return;

            const recipeName = item.recipeName;
            const recipe = recipesByName.get(recipeName);
            if (!recipe) return;

            const totalServings = item.multiplier !== undefined
                ? (item.multiplier || 0) * (recipe.servings || 0)
                : (item.servings || 0);
            if (totalServings <= 0) return;

            const totalMultiplier = item.multiplier !== undefined
                ? item.multiplier
                : Math.ceil(totalServings / (recipe.servings || 1));

            if (totalMultiplier <= 0) return;

            flattenIngredients(recipe.ingredients).forEach(ing => {
                // Use ingredientId for grouping if available, otherwise fall back to normalized name
                const groupKey = ing.ingredientId || `normalized:${normalizeIngredientName(ing.ingredient)}`;
                if (!ingredientMap[groupKey]) ingredientMap[groupKey] = [];
                ingredientMap[groupKey].push({ingredient: ing, count: totalMultiplier});
            });
        });

        return Object.entries(ingredientMap)
            .map(([key, items]) => {
                // Get the first ingredient to determine canonical name and store section
                const firstIng = items[0].ingredient;
                const canonicalName = resolveCanonicalName(firstIng, ingredientsLookup);
                const storeSection = getIngredientStoreSection(firstIng, ingredientsLookup);
                const ingredientDef = ingredientsLookup.get(key) ?? null;

                return {
                    key,
                    name: canonicalName,
                    storeSection,
                    totals: aggregateIngredients(items),
                    ingredientDef
                };
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [recipesByName, multiWeeklyCookPlan, weekStartStr, ingredientsLookup]);

    // Group ingredients by store section
    const groupedBySection = useMemo(() => {
        const groups: Record<string, typeof aggregatedIngredients> = {};
        
        aggregatedIngredients.forEach(item => {
            const section = item.storeSection;
            if (!groups[section]) groups[section] = [];
            groups[section].push(item);
        });
        
        // Sort sections: alphabetical, with "Unassigned" last
        const sortedSections = sortSectionsWithUnassignedLast(Object.keys(groups));
        
        return sortedSections.map(section => ({
            section,
            items: groups[section].sort((a, b) => a.name.localeCompare(b.name))
        }));
    }, [aggregatedIngredients]);

    const handleExport = () => {
        const dateRange = `${format(weekStart, 'MMM d')} – ${format(weekEnd, 'MMM d, yyyy')}`;
        let text = `Shopping List: ${dateRange}\n\n`;

        groupedBySection.forEach(({section, items}) => {
            text += `## ${section}\n`;
            items.forEach(({name, totals}) => {
                const measurement = renderAggregatedMeasurement(totals, unitSystem);
                text += `- ${name.charAt(0).toUpperCase() + name.slice(1)}: ${measurement}\n`;
            });
            text += '\n';
        });

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        });
    };

    return (
        <div className="app-panel-padded">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="section-title">
                    <ShoppingCart className="h-8 w-8 text-indigo-600"/>
                    Shopping List
                </h2>

                <div className="flex items-stretch gap-4">
                    <button
                        onClick={() => setSelectedDate(new Date())}
                        className="btn-ghost"
                    >
                        Current week
                    </button>

                    <div className="muted-surface rounded-lg p-1 flex items-center">
                        <button
                            onClick={() => setSelectedDate(subWeeks(selectedDate, 1))}
                            className="p-1.5 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Previous Week"
                        >
                            <ChevronLeft className="h-5 w-5"/>
                        </button>

                        <div
                            onClick={() => setShowDatePicker(true)}
                            className="px-3 flex flex-col items-center justify-center relative group cursor-pointer"
                        >
                            <span
                                className="label-strong leading-none mb-1 group-hover:text-indigo-400 transition-colors">Weekly View</span>
                            <span
                                className="text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap group-hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d, yyyy')}
              </span>
                        </div>

                        <button
                            onClick={() => setSelectedDate(addWeeks(selectedDate, 1))}
                            className="p-1.5 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Next Week"
                        >
                            <ChevronRight className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
            </div>

            <div className="mb-10">
                <h3 className="eyebrow mb-4 flex items-center">
                    <Utensils className="h-3 w-3 mr-2 text-indigo-500"/> Weekly Plan
                </h3>
                <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-3">
                    {weekDays.map(day => {
                        const dStr = format(day, 'yyyy-MM-dd');
                        const plan = mealPlan[dStr];
                        const isToday = format(new Date(), 'yyyy-MM-dd') === dStr;

                        return (
                            <div key={dStr}
                                 className={`p-3 rounded-xl flex flex-col transition-all hover:shadow-md ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 shadow-sm' : 'muted-surface'}`}>
                                <div
                                    className="label-strong mb-2 border-b border-gray-200/50 dark:border-gray-700/50 pb-1 flex justify-between">
                                    <span className="text-gray-500 dark:text-gray-400">{format(day, 'EEE')}</span>
                                    <span
                                        className={isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}>{format(day, 'MMM d')}</span>
                                </div>
                                <div className="space-y-1 flex-1">
                                    {(['breakfast', 'lunch', 'dinner', 'snacks', 'drinks'] as const).map(type => {
                                        const slots = plan?.[type];
                                        if (!Array.isArray(slots) || slots.length === 0) return null;
                                        const styles = getMealTypeStyle(type as MealTypeKey);
                                        return slots.map((meal, mIdx) => (
                                            <button
                                                key={`${type}-${mIdx}`}
                                                onClick={() => setSelectedRecipe({recipe: meal.recipe})}
                                                className={`w-full text-left text-[10px] p-1 rounded border font-bold hover:opacity-80 transition-all ${styles}`}
                                                title={`${type.charAt(0).toUpperCase() + type.slice(1)}: ${meal.recipe.name}${meal.participant ? ` (${meal.participant})` : ''}`}
                                            >
                                                <div className="flex justify-between items-center gap-1 min-w-0">
                                                    <span
                                                        className="truncate">{meal.servings > 1 ? `(${meal.servings}) ` : ''}{meal.recipe.name}</span>
                                                    {meal.participant && (
                                                        <span className="shrink-0" title={meal.participant}>
                              {participants.find(p => p.name === meal.participant)?.icon || '👤'}
                            </span>
                                                    )}
                                                </div>
                                            </button>
                                        ));
                                    })}
                                    {!plan?.breakfast?.length && !plan?.lunch?.length && !plan?.dinner?.length && !plan?.snacks?.length && !plan?.drinks?.length && (
                                        <div className="muted-helper py-2">No meals</div>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>

            {Object.entries(multiWeeklyCookPlan[weekStartStr] || {}).some(([_instanceId, item]) => {
                // Skip transferred items for the visibility check
                if (isTransferredItem(item)) return false;
                const recipe = recipesByName.get(item.recipeName);
                if (!recipe) return false;
                return (item.servings || 0) > 0;
            }) && (
                <div className="mb-10">
                    <h3 className="eyebrow mb-4 flex items-center">
                        <ShoppingCart className="h-3 w-3 mr-2 text-indigo-500"/> Weekly Recipes
                    </h3>
                    <div className="flex flex-wrap gap-3">
                        {Object.entries(multiWeeklyCookPlan[weekStartStr] || {}).map(([instanceId, item]) => {
                            // Skip transferred items - they don't need to be cooked
                            if (isTransferredItem(item)) return null;
                            const recipeName = item.recipeName;
                            const recipe = recipesByName.get(recipeName);
                            if (!recipe) return null;
                            const totalServings = item.multiplier !== undefined
                                ? (item.multiplier || 0) * (recipe.servings || 0)
                                : (item.servings || 0);
                            if (totalServings <= 0) return null;
                            const displayMultiplier = item.multiplier ?? Math.ceil(totalServings / (recipe.servings || 1));
                            return (
                                <button
                                    key={instanceId}
                                    onClick={() => setSelectedRecipe({recipe})}
                                    className="bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 border-indigo-100 dark:border-indigo-800 px-3 py-2 rounded-xl border text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 transition-all shadow-sm"
                                >
                                    <span
                                        className="bg-indigo-200 dark:bg-indigo-800 text-indigo-800 dark:text-indigo-200 px-1.5 py-0.5 rounded mr-2">x{displayMultiplier}</span>
                                    {recipeName}
                                </button>
                            );
                        })}
                    </div>
                </div>
            )}

            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-100 dark:border-gray-800">
                <div className="flex items-center">
                    {aggregatedIngredients.length > 0 && (
                        <button
                            onClick={handleExport}
                            className={`flex items-center space-x-2 px-4 py-2 rounded-lg text-sm font-bold transition-all shadow-sm ${
                                copied
                                    ? 'bg-green-500 text-white'
                                    : 'bg-indigo-600 text-white hover:bg-indigo-700'
                            }`}
                        >
                            {copied ? (
                                <>
                                    <Check className="h-4 w-4"/>
                                    <span>Copied!</span>
                                </>
                            ) : (
                                <>
                                    <Copy className="h-4 w-4"/>
                                    <span>Copy List</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
                <p className="text-sm text-gray-400 dark:text-gray-500 font-medium">
                    {aggregatedIngredients.length} unique items
                </p>
            </div>

            {aggregatedIngredients.length > 0 ? (
                <div className="space-y-4">
                    {groupedBySection.map(({section, items}) => {
                        const isCollapsed = collapsedSections.has(section);
                        const isUnassigned = section === 'Unassigned';
                        
                        return (
                            <div key={section} className="app-panel overflow-hidden">
                                {/* Section Header */}
                                <button
                                    onClick={() => toggleSection(section)}
                                    className={`w-full p-4 flex justify-between items-center transition-colors ${
                                        isUnassigned 
                                            ? 'bg-gray-100 dark:bg-gray-800/50 text-gray-500 dark:text-gray-400' 
                                            : 'bg-indigo-50 dark:bg-indigo-900/20 text-indigo-700 dark:text-indigo-300'
                                    } hover:opacity-80`}
                                >
                                    <div className="flex items-center gap-2">
                                        {isCollapsed ? (
                                            <ChevronRight className="h-5 w-5"/>
                                        ) : (
                                            <ChevronDown className="h-5 w-5"/>
                                        )}
                                        <span className="font-bold">{section}</span>
                                        <span className={`text-xs px-2 py-0.5 rounded-full ${
                                            isUnassigned
                                                ? 'bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
                                                : 'bg-indigo-100 dark:bg-indigo-800 text-indigo-600 dark:text-indigo-300'
                                        }`}>
                                            {items.length} {items.length === 1 ? 'item' : 'items'}
                                        </span>
                                    </div>
                                </button>
                                
                                {/* Section Items */}
                                {!isCollapsed && (
                                    <div className="divide-y divide-gray-100 dark:divide-gray-800">
                                        {items.map((item) => (
                                            <ShoppingListItemRow
                                                key={item.key}
                                                item={item}
                                                unitSystem={unitSystem}
                                            />
                                        ))}
                                    </div>
                                )}
                            </div>
                        );
                    })}
                </div>
            ) : (
                <div className="text-center py-12">
                    <ShoppingCart className="h-16 w-16 mx-auto text-gray-200 dark:text-gray-800 mb-4"/>
                    <p className="text-gray-500 dark:text-gray-400 italic">Your shopping list is empty. Plan some meals
                        first!</p>
                </div>
            )}

            {showDatePicker && (
                <DatePicker
                    selectedDate={selectedDate}
                    onChange={setSelectedDate}
                    onClose={() => setShowDatePicker(false)}
                />
            )}
        </div>
    );
}
