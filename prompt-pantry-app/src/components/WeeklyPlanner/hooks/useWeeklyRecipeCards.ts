import { format } from 'date-fns';
import { useMemo } from 'react';
import type { MealPlan, MultiWeeklyCookPlan, Recipe, WeeklyCookPlan } from '../../../types';
import { getAllMealsForDay, getOriginalSourceWeek, isTransferredItem } from '../../../utils/mealPlanUtils';
import type { WeeklyRecipeCardData } from '../weeklyPlannerTypes';

export interface UseWeeklyRecipeCardsParams {
    currentWeeklyCookPlan: WeeklyCookPlan;
    recipes: Recipe[];
    mealPlan: MealPlan;
    weekDays: Date[];
    multiWeeklyCookPlan: MultiWeeklyCookPlan;
}

export function useWeeklyRecipeCards({
    currentWeeklyCookPlan,
    recipes,
    mealPlan,
    weekDays,
    multiWeeklyCookPlan
}: UseWeeklyRecipeCardsParams): WeeklyRecipeCardData[] {
    return useMemo(() => {
        return Object.entries(currentWeeklyCookPlan).flatMap(([instanceId, item]) => {
            const recipe = recipes.find((r) => r.id === item.recipeId);
            if (!recipe) return [];

            const totalServings = item.servings || 0;
            const isTransferred = isTransferredItem(item);

            const usedForInstance = weekDays.reduce((sum, d) => {
                const dStr = format(d, 'yyyy-MM-dd');
                const dayPlan = mealPlan[dStr];
                if (!dayPlan) return sum;
                return (
                    sum +
                    getAllMealsForDay(dayPlan)
                        .filter((m) => m.recipe.id === recipe.id && m.recipeInstanceId === instanceId)
                        .reduce((s, m) => s + m.servings, 0)
                );
            }, 0);
            const usedTotal = usedForInstance + (item.manualUsed || 0);

            const card: WeeklyRecipeCardData = {
                key: instanceId,
                instanceId,
                name: recipe.name,
                recipe,
                servings: totalServings,
                used: Math.min(usedTotal, totalServings),
                remaining: Math.max(0, totalServings - usedTotal),
                type: isTransferred ? 'transferred' : 'base',
                item,
                transferredFromDate: item.transferredFromDate,
                originalSourceWeek: getOriginalSourceWeek(multiWeeklyCookPlan, item)
            };

            return [card];
        }).sort((a, b) => {
            const aHas = a.remaining > 0;
            const bHas = b.remaining > 0;
            if (aHas !== bHas) return aHas ? -1 : 1;
            const nameCmp = a.name.localeCompare(b.name);
            if (nameCmp !== 0) return nameCmp;
            if (a.type !== b.type) return a.type === 'base' ? -1 : 1;
            return 0;
        });
    }, [currentWeeklyCookPlan, recipes, mealPlan, weekDays, multiWeeklyCookPlan]);
}
