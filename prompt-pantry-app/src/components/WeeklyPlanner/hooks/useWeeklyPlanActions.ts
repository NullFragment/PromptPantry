import { addDays, addWeeks, format, parseISO } from 'date-fns';
import { useCallback } from 'react';
import type * as React from 'react';
import type { MealPlan, MultiWeeklyCookPlan, Participant, Recipe, WeeklyCookPlan } from '../../../types';
import {
    ALL_MEAL_TYPES,
    getAllMealsForDay,
    generateUUID,
    getUsedServingsForWeek,
    isTransferredItem
} from '../../../utils/mealPlanUtils';
import type { PlannerConfirmation } from '../weeklyPlannerTypes';

export interface UseWeeklyPlanActionsParams {
    weekStart: Date;
    weekStartStr: string;
    currentWeeklyCookPlan: WeeklyCookPlan;
    multiWeeklyCookPlan: MultiWeeklyCookPlan;
    setMultiWeeklyCookPlan: React.Dispatch<React.SetStateAction<MultiWeeklyCookPlan>>;
    mealPlan: MealPlan;
    setMealPlan: React.Dispatch<React.SetStateAction<MealPlan>>;
    weekDays: Date[];
    setPromptedRecipes: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
    setConfirmation: React.Dispatch<React.SetStateAction<PlannerConfirmation | null>>;
    recipes: Recipe[];
    participants: Participant[];
}

export interface UseWeeklyPlanActionsResult {
    handleAddRecipesToPlan: (selections: { recipe: Recipe; multiplier: number }[]) => void;
    handleRemoveRecipesWithCascade: (
        instanceIds: string[],
        options?: { silent?: boolean; confirmMessage?: string }
    ) => void;
    handleRemoveRecipeFromPlan: (instanceId: string) => void;
    handleUpdateMultiplier: (instanceId: string, multiplier: number) => void;
    handleClearBatch: () => void;
    handleClearWeeklyRecipes: () => void;
}

export function useWeeklyPlanActions({
    weekStart,
    weekStartStr,
    currentWeeklyCookPlan,
    multiWeeklyCookPlan,
    setMultiWeeklyCookPlan,
    mealPlan,
    setMealPlan,
    weekDays,
    setPromptedRecipes,
    setConfirmation,
    recipes,
    participants: _participants
}: UseWeeklyPlanActionsParams): UseWeeklyPlanActionsResult {
    const getUsedServings = useCallback(
        (recipeName: string, date?: Date, instanceId?: string) => {
            const effectiveDate = date || parseISO(weekStartStr);
            return getUsedServingsForWeek(mealPlan, recipeName, effectiveDate, instanceId);
        },
        [mealPlan, weekStartStr]
    );

    const findTransferChain = useCallback(
        (startInstanceId: string, startWeekStr: string): { instanceId: string; weekStr: string }[] => {
            const chain: { instanceId: string; weekStr: string }[] = [
                { instanceId: startInstanceId, weekStr: startWeekStr }
            ];
            let currentInstanceId = startInstanceId;
            let currentWeekStr = startWeekStr;

            for (let i = 1; i <= 52; i++) {
                const nextWeekDate = addWeeks(parseISO(currentWeekStr), 1);
                const nextWeekStr = format(nextWeekDate, 'yyyy-MM-dd');
                const nextWeekPlan = multiWeeklyCookPlan[nextWeekStr];
                if (!nextWeekPlan) break;

                const transferredEntry = Object.entries(nextWeekPlan).find(
                    ([, item]) => item.transferredFromId === currentInstanceId
                );
                if (transferredEntry) {
                    const [nextInstanceId] = transferredEntry;
                    chain.push({ instanceId: nextInstanceId, weekStr: nextWeekStr });
                    currentInstanceId = nextInstanceId;
                    currentWeekStr = nextWeekStr;
                } else {
                    break;
                }
            }
            return chain;
        },
        [multiWeeklyCookPlan]
    );

    const handleRemoveRecipesWithCascade = useCallback(
        (
            instanceIds: string[],
            options: { silent?: boolean; confirmMessage?: string } = {}
        ) => {
            const instancesToRemove: {
                instanceId: string;
                recipeName: string;
                chain: { instanceId: string; weekStr: string }[];
            }[] = [];
            const recipesWithFutureTransfers: string[] = [];

            instanceIds.forEach((instanceId) => {
                const item = currentWeeklyCookPlan[instanceId];
                if (!item) return;
                const recipeName = item.recipeName;
                const chain = findTransferChain(instanceId, weekStartStr);
                instancesToRemove.push({ instanceId, recipeName, chain });
                if (chain.length > 1) recipesWithFutureTransfers.push(recipeName);
            });

            const performRemoval = () => {
                setPromptedRecipes((prev) => {
                    const newPrompted = { ...prev };
                    instancesToRemove.forEach(({ chain }) => {
                        chain.forEach(({ instanceId: iId, weekStr }) => {
                            if (newPrompted[weekStr]) {
                                newPrompted[weekStr] = newPrompted[weekStr].filter((p) => p !== iId);
                            }
                        });
                    });
                    return newPrompted;
                });

                setMultiWeeklyCookPlan((prev) => {
                    const newMultiPlan = { ...prev };
                    instancesToRemove.forEach(({ recipeName, chain }) => {
                        const reversedChain = [...chain].reverse();
                        let servingsToReturn = 0;

                        reversedChain.forEach(({ instanceId: chainInstanceId, weekStr }, idx) => {
                            const weekPlan = newMultiPlan[weekStr];
                            if (!weekPlan) return;
                            const chainItem = weekPlan[chainInstanceId];
                            if (!chainItem) return;

                            const usedInInstance = getUsedServings(
                                recipeName,
                                parseISO(weekStr),
                                chainInstanceId
                            );
                            const totalUsedInInstance =
                                usedInInstance + (chainItem.manualUsed || 0);
                            const unusedServings = Math.max(
                                0,
                                chainItem.servings - totalUsedInInstance
                            );
                            servingsToReturn += unusedServings;

                            const newWeekPlan = { ...weekPlan };
                            delete newWeekPlan[chainInstanceId];
                            newMultiPlan[weekStr] = newWeekPlan;

                            if (
                                idx === reversedChain.length - 1 &&
                                chainItem.transferredFromId &&
                                chainItem.transferredFromDate
                            ) {
                                const sourceWeekStr = chainItem.transferredFromDate;
                                const sourceInstanceId = chainItem.transferredFromId;
                                if (
                                    newMultiPlan[sourceWeekStr]?.[sourceInstanceId] &&
                                    servingsToReturn > 0
                                ) {
                                    newMultiPlan[sourceWeekStr] = {
                                        ...newMultiPlan[sourceWeekStr],
                                        [sourceInstanceId]: {
                                            ...newMultiPlan[sourceWeekStr][sourceInstanceId],
                                            servings:
                                                newMultiPlan[sourceWeekStr][sourceInstanceId]
                                                    .servings + servingsToReturn
                                        }
                                    };
                                }
                            }
                        });
                    });
                    return newMultiPlan;
                });

                setMealPlan((prev) => {
                    const newPlan = { ...prev };
                    let changed = false;
                    instancesToRemove.forEach(({ recipeName, chain }) => {
                        chain.forEach(({ instanceId: chainInstanceId, weekStr }) => {
                            const wStart = parseISO(weekStr);
                            for (let i = 0; i < 7; i++) {
                                const dStr = format(addDays(wStart, i), 'yyyy-MM-dd');
                                if (newPlan[dStr]) {
                                    const dayPlan = { ...newPlan[dStr] };
                                    const filtered = getAllMealsForDay(dayPlan).filter(
                                        (m) =>
                                            !(
                                                m.recipe.name === recipeName &&
                                                (!m.recipeInstanceId ||
                                                    m.recipeInstanceId === chainInstanceId)
                                            )
                                    );
                                    if (filtered.length !== getAllMealsForDay(dayPlan).length) {
                                        const nextDayPlan = ALL_MEAL_TYPES.reduce(
                                            (acc, slot) => {
                                                const slotMeals = Array.isArray(dayPlan[slot])
                                                    ? dayPlan[slot].filter(
                                                          (m) =>
                                                              !(
                                                                  m.recipe.name === recipeName &&
                                                                  (!m.recipeInstanceId ||
                                                                      m.recipeInstanceId ===
                                                                          chainInstanceId)
                                                              )
                                                      )
                                                    : dayPlan[slot];
                                                return { ...acc, [slot]: slotMeals };
                                            },
                                            {} as typeof dayPlan
                                        );
                                        newPlan[dStr] = nextDayPlan;
                                        changed = true;
                                    }
                                }
                            }
                        });
                    });
                    return changed ? newPlan : prev;
                });
                setConfirmation(null);
            };

            const uniqueRecipesWithFuture = [...new Set(recipesWithFutureTransfers)];
            if (!options.silent && uniqueRecipesWithFuture.length > 0) {
                const msg =
                    options.confirmMessage ||
                    `Removing these recipes will also remove ${uniqueRecipesWithFuture.join(', ')} from future weeks where they were transferred. Do you want to continue?`;
                setConfirmation({
                    title: 'Remove Recipes',
                    message: msg,
                    confirmLabel: 'Remove All',
                    variant: 'danger',
                    onConfirm: performRemoval
                });
            } else {
                performRemoval();
            }
        },
        [
            currentWeeklyCookPlan,
            findTransferChain,
            getUsedServings,
            weekStartStr,
            setPromptedRecipes,
            setMultiWeeklyCookPlan,
            setMealPlan,
            setConfirmation
        ]
    );

    const handleAddRecipesToPlan = useCallback(
        (selections: { recipe: Recipe; multiplier: number }[]) => {
            setMultiWeeklyCookPlan((prev) => {
                const nextWeekPlan = { ...(prev[weekStartStr] || {}) };
                selections.forEach(({ recipe, multiplier }) => {
                    const existingEntry = Object.entries(nextWeekPlan).find(
                        ([, item]) =>
                            item.recipeName === recipe.name && !isTransferredItem(item)
                    );
                    if (existingEntry) {
                        const [existingId, existingItem] = existingEntry;
                        nextWeekPlan[existingId] = {
                            ...existingItem,
                            multiplier: (existingItem.multiplier || 0) + multiplier,
                            servings:
                                (existingItem.servings || 0) + recipe.servings * multiplier
                        };
                    } else {
                        const newId = generateUUID();
                        nextWeekPlan[newId] = {
                            recipeName: recipe.name,
                            multiplier,
                            servings: recipe.servings * multiplier
                        };
                    }
                });
                return { ...prev, [weekStartStr]: nextWeekPlan };
            });
        },
        [weekStartStr, setMultiWeeklyCookPlan]
    );

    const handleRemoveRecipeFromPlan = useCallback(
        (instanceId: string) => {
            const item = currentWeeklyCookPlan[instanceId];
            if (!item) return;

            let hasFutureTransfers = false;
            for (let i = 1; i <= 12; i++) {
                const nextWStr = format(addWeeks(weekStart, i), 'yyyy-MM-dd');
                const nextWeekPlan = multiWeeklyCookPlan[nextWStr];
                if (nextWeekPlan) {
                    if (
                        Object.values(nextWeekPlan).some(
                            (nextItem) => nextItem.transferredFromId === instanceId
                        )
                    ) {
                        hasFutureTransfers = true;
                        break;
                    }
                } else break;
            }

            const message = hasFutureTransfers
                ? `Removing "${item.recipeName}" will also remove it from future weeks where it was transferred. Do you want to continue?`
                : `Are you sure you want to remove "${item.recipeName}" from the weekly plan?`;

            setConfirmation({
                title: 'Remove Recipe',
                message,
                confirmLabel: 'Remove',
                variant: 'danger',
                onConfirm: () => handleRemoveRecipesWithCascade([instanceId], { silent: true })
            });
        },
        [
            currentWeeklyCookPlan,
            weekStart,
            multiWeeklyCookPlan,
            setConfirmation,
            handleRemoveRecipesWithCascade
        ]
    );

    const handleUpdateMultiplier = useCallback(
        (instanceId: string, multiplier: number) => {
            const item = currentWeeklyCookPlan[instanceId];
            if (!item) return;
            if (isTransferredItem(item)) return;
            const recipe = recipes.find((r) => r.name === item.recipeName);
            if (!recipe) return;

            setMultiWeeklyCookPlan((prev) => ({
                ...prev,
                [weekStartStr]: {
                    ...(prev[weekStartStr] || {}),
                    [instanceId]: {
                        ...prev[weekStartStr]?.[instanceId],
                        multiplier: Math.max(0, multiplier),
                        servings: Math.max(0, multiplier) * recipe.servings
                    }
                }
            }));
        },
        [currentWeeklyCookPlan, recipes, weekStartStr, setMultiWeeklyCookPlan]
    );

    const handleClearBatch = useCallback(() => {
        const hasScheduledMeals = weekDays.some((day) => {
            const dStr = format(day, 'yyyy-MM-dd');
            const dayPlan = mealPlan[dStr];
            return dayPlan && getAllMealsForDay(dayPlan).length > 0;
        });

        const performClear = () => {
            setMealPlan((prev) => {
                const newPlan = { ...prev };
                let changed = false;
                weekDays.forEach((day) => {
                    const dStr = format(day, 'yyyy-MM-dd');
                    const dayPlan = newPlan[dStr];
                    if (dayPlan && getAllMealsForDay(dayPlan).length > 0) {
                        delete newPlan[dStr];
                        changed = true;
                    }
                });
                return changed ? newPlan : prev;
            });
            setConfirmation(null);
        };

        setConfirmation({
            title: 'Clear Week Schedule',
            message: hasScheduledMeals
                ? 'This will remove all recipes assigned to days this week and keep your weekly recipes available.'
                : 'There are no meals scheduled this week. This will clear any stored schedule data for the week.',
            confirmLabel: 'Clear Schedule',
            onConfirm: performClear
        });
    }, [weekDays, mealPlan, setMealPlan, setConfirmation]);

    const handleClearWeeklyRecipes = useCallback(() => {
        const currentWeekPlan = multiWeeklyCookPlan[weekStartStr] || {};
        const instanceIds = Object.keys(currentWeekPlan);
        if (instanceIds.length === 0) return;

        const hasAnyFutureTransfers = instanceIds.some((instanceId) => {
            const chain = findTransferChain(instanceId, weekStartStr);
            return chain.length > 1;
        });

        const message = hasAnyFutureTransfers
            ? 'This will remove all recipes from your weekly list, including any that were transferred to future weeks, and clear scheduled meals from the calendar.'
            : 'This will remove all recipes from your weekly list and clear scheduled meals from the calendar.';

        setConfirmation({
            title: 'Clear Weekly Recipes',
            message,
            confirmLabel: 'Clear All',
            onConfirm: () => handleRemoveRecipesWithCascade(instanceIds, { silent: true })
        });
    }, [multiWeeklyCookPlan, weekStartStr, findTransferChain, setConfirmation, handleRemoveRecipesWithCascade]);

    return {
        handleAddRecipesToPlan,
        handleRemoveRecipesWithCascade,
        handleRemoveRecipeFromPlan,
        handleUpdateMultiplier,
        handleClearBatch,
        handleClearWeeklyRecipes
    };
}
