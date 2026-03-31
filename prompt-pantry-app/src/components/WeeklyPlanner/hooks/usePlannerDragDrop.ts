import { format } from 'date-fns';
import { useCallback } from 'react';
import type * as React from 'react';
import type { MealPlan, MultiWeeklyCookPlan, Recipe, WeeklyCookPlan } from '../../../types';
import {
    findBaseRecipeInstance,
    findRecipeInstances,
    generateUUID,
    getAllMealsForDay,
    isTransferredItem
} from '../../../utils/mealPlanUtils';
import type { PlannerConfirmation } from '../weeklyPlannerTypes';

export interface UsePlannerDragDropParams {
    mealPlan: MealPlan;
    setMealPlan: React.Dispatch<React.SetStateAction<MealPlan>>;
    multiWeeklyCookPlan: MultiWeeklyCookPlan;
    setMultiWeeklyCookPlan: React.Dispatch<React.SetStateAction<MultiWeeklyCookPlan>>;
    currentWeeklyCookPlan: WeeklyCookPlan;
    weekStartStr: string;
    weekDays: Date[];
    recipes: Recipe[];
    participants: { name: string }[];
    selectedParticipants: string[];
    setConfirmation: React.Dispatch<React.SetStateAction<PlannerConfirmation | null>>;
    setQuickAddSlot: React.Dispatch<React.SetStateAction<{ date: string; slot: string } | null>>;
    getUsedServings: (recipeId: string, date?: Date, instanceId?: string) => number;
    canEdit: boolean;
}

export function usePlannerDragDrop({
    mealPlan,
    setMealPlan,
    setMultiWeeklyCookPlan,
    currentWeeklyCookPlan,
    weekStartStr,
    weekDays,
    recipes,
    participants,
    selectedParticipants,
    setConfirmation,
    setQuickAddSlot,
    getUsedServings,
    canEdit
}: UsePlannerDragDropParams) {
    const onDragStart = useCallback((e: React.DragEvent, recipeId: string, instanceId: string) => {
        e.dataTransfer.setData('recipeId', recipeId);
        e.dataTransfer.setData('instanceId', instanceId);
    }, []);

    const onMealDragStart = useCallback(
        (
            e: React.DragEvent,
            recipeId: string,
            sourceDate: string,
            sourceSlot: string,
            participant?: string,
            recipeInstanceId?: string
        ) => {
            e.dataTransfer.setData('recipeId', recipeId);
            e.dataTransfer.setData('sourceDate', sourceDate);
            e.dataTransfer.setData('sourceSlot', sourceSlot);
            e.dataTransfer.setData('isMove', 'true');
            if (participant) e.dataTransfer.setData('participant', participant);
            if (recipeInstanceId) e.dataTransfer.setData('instanceId', recipeInstanceId);
        },
        []
    );

    const onDragOver = useCallback((e: React.DragEvent) => {
        e.preventDefault();
    }, []);

    const handleRemoveSlotMeal = useCallback(
        (
            date: Date,
            slot: keyof MealPlan[string],
            recipeId: string,
            instanceId?: string,
            participant?: string
        ) => {
            if (!canEdit) return;
            const dStr = format(date, 'yyyy-MM-dd');
            setMealPlan((prev) => {
                const newPlan = { ...prev };
                const dayPlan = { ...(newPlan[dStr] || {}) };
                if (Array.isArray(dayPlan[slot])) {
                    dayPlan[slot] = dayPlan[slot]!.filter(
                        (m) =>
                            !(
                                m.recipe.id === recipeId &&
                                m.participant === participant &&
                                (!instanceId || m.recipeInstanceId === instanceId)
                            )
                    );
                    newPlan[dStr] = dayPlan;
                }
                return newPlan;
            });
        },
        [canEdit, setMealPlan]
    );

    const onDrop = useCallback(
        (e: React.DragEvent, date: Date, slot: keyof MealPlan[string]) => {
            e.preventDefault();
            if (!canEdit) return;
            const recipeId = e.dataTransfer.getData('recipeId');
            const instanceId = e.dataTransfer.getData('instanceId');
            const sourceDateStr = e.dataTransfer.getData('sourceDate');
            const sourceSlot = e.dataTransfer.getData('sourceSlot') as keyof MealPlan[string];
            const isMove = e.dataTransfer.getData('isMove') === 'true';
            const sourceParticipant = e.dataTransfer.getData('participant') || undefined;

            const targetDateStr = format(date, 'yyyy-MM-dd');

            if (isMove && sourceDateStr === targetDateStr && sourceSlot === slot) return;

            const recipe = recipes.find((r) => r.id === recipeId);
            if (!recipe) return;

            const participantsToAdd = isMove
                ? [sourceParticipant]
                : participants.length > 0
                  ? selectedParticipants
                  : [undefined];

            if (
                !isMove &&
                participants.length > 0 &&
                participantsToAdd.length === 0
            ) {
                setConfirmation({
                    title: 'No Participants Selected',
                    message:
                        'At least one participant needs to be selected in order to add a meal.',
                    confirmLabel: 'OK',
                    onConfirm: () => setConfirmation(null),
                    variant: 'info'
                });
                return;
            }

            const servingsToMove = isMove
                ? (mealPlan[sourceDateStr]?.[sourceSlot]?.find(
                      (m) =>
                          m.recipe.id === recipeId &&
                          m.participant === sourceParticipant &&
                          (!instanceId || m.recipeInstanceId === instanceId)
                  )?.servings || 1)
                : 1;

            const performMoveOrAdd = (overrideInstanceId?: string) => {
                const effectiveInstanceId = overrideInstanceId ?? instanceId;
                setMealPlan((prev) => {
                    const newPlan = { ...prev };

                    if (isMove) {
                        const sourceDayPlan = { ...(newPlan[sourceDateStr] || {}) };
                        if (Array.isArray(sourceDayPlan[sourceSlot])) {
                            sourceDayPlan[sourceSlot] = sourceDayPlan[sourceSlot].filter(
                                (m) =>
                                    !(
                                        m.recipe.id === recipeId &&
                                        m.participant === sourceParticipant &&
                                        (!instanceId || m.recipeInstanceId === instanceId)
                                    )
                            );
                            newPlan[sourceDateStr] = sourceDayPlan;
                        }
                    }

                    const targetDayPlan = { ...(newPlan[targetDateStr] || {}) };
                    const slotMeals = [...(targetDayPlan[slot] || [])];

                    participantsToAdd.forEach((pName) => {
                        const existingMealIndex = slotMeals.findIndex(
                            (m) =>
                                m.recipe.id === recipeId &&
                                m.participant === pName &&
                                m.recipeInstanceId === effectiveInstanceId
                        );
                        if (existingMealIndex !== -1) {
                            slotMeals[existingMealIndex] = {
                                ...slotMeals[existingMealIndex],
                                servings:
                                    slotMeals[existingMealIndex].servings +
                                    (isMove ? servingsToMove : 1)
                            };
                        } else {
                            slotMeals.push({
                                recipe,
                                servings: isMove ? servingsToMove : 1,
                                participant: pName,
                                recipeInstanceId: effectiveInstanceId || undefined
                            });
                        }
                    });

                    targetDayPlan[slot] = slotMeals;
                    newPlan[targetDateStr] = targetDayPlan;
                    return newPlan;
                });
                setConfirmation(null);
            };

            if (isMove) {
                performMoveOrAdd();
                return;
            }

            const item = instanceId ? currentWeeklyCookPlan[instanceId] : null;
            const totalServings = item?.servings || 0;

            const usedForInstance = weekDays.reduce((sum, d) => {
                const dStr = format(d, 'yyyy-MM-dd');
                const dayPlan = mealPlan[dStr];
                if (!dayPlan) return sum;
                return (
                    sum +
                    getAllMealsForDay(dayPlan)
                        .filter(
                            (m) =>
                                m.recipe.id === recipeId &&
                                m.recipeInstanceId === instanceId
                        )
                        .reduce((s, m) => s + m.servings, 0)
                );
            }, 0);
            const manualUsed = item?.manualUsed || 0;
            const totalUsed = usedForInstance + manualUsed;
            const addedCount = participantsToAdd.length;

            if (totalUsed + addedCount > totalServings) {
                const overflow = totalUsed + addedCount - totalServings;
                const neededMulti = Math.ceil(overflow / recipe.servings);
                const isTransferred = item ? isTransferredItem(item) : false;
                const remainingInInstance = Math.max(0, totalServings - totalUsed);

                setConfirmation({
                    title: 'Increase Servings?',
                    message: `Adding this meal will exceed the planned servings for "${recipe.name}" by ${overflow} serving(s). Would you like to increase the shopping list count by adding another ${neededMulti * recipe.servings} servings?`,
                    confirmLabel: 'Increase & Add',
                    onConfirm: () => {
                        if (isTransferred) {
                            const baseInstance = findBaseRecipeInstance(
                                currentWeeklyCookPlan,
                                recipeId
                            );
                            let baseInstanceId: string;

                            if (baseInstance) {
                                baseInstanceId = baseInstance.id;
                                setMultiWeeklyCookPlan((prev) => ({
                                    ...prev,
                                    [weekStartStr]: {
                                        ...(prev[weekStartStr] || {}),
                                        [baseInstance.id]: {
                                            ...prev[weekStartStr]?.[baseInstance.id],
                                            multiplier:
                                                (prev[weekStartStr]?.[baseInstance.id]?.multiplier ||
                                                    0) + neededMulti,
                                            servings:
                                                (prev[weekStartStr]?.[baseInstance.id]?.servings ||
                                                    0) +
                                                neededMulti * recipe.servings
                                        }
                                    }
                                }));
                            } else {
                                baseInstanceId = generateUUID();
                                setMultiWeeklyCookPlan((prev) => ({
                                    ...prev,
                                    [weekStartStr]: {
                                        ...(prev[weekStartStr] || {}),
                                        [baseInstanceId]: {
                                            recipeId,
                                            multiplier: neededMulti,
                                            servings: neededMulti * recipe.servings
                                        }
                                    }
                                }));
                            }

                            setMealPlan((prev) => {
                                const newPlan = { ...prev };
                                const targetDayPlan = { ...(newPlan[targetDateStr] || {}) };
                                const slotMeals = [...(targetDayPlan[slot] || [])];
                                let remainingFromTransferred = remainingInInstance;

                                participantsToAdd.forEach((pName) => {
                                    const servingsFromTransferred = Math.min(
                                        1,
                                        remainingFromTransferred
                                    );
                                    const servingsFromBase = 1 - servingsFromTransferred;
                                    remainingFromTransferred -= servingsFromTransferred;

                                    if (servingsFromTransferred > 0) {
                                        const existingTransferredIdx = slotMeals.findIndex(
                                            (m) =>
                                                m.recipe.id === recipeId &&
                                                m.participant === pName &&
                                                m.recipeInstanceId === instanceId
                                        );
                                        if (existingTransferredIdx !== -1) {
                                            slotMeals[existingTransferredIdx] = {
                                                ...slotMeals[existingTransferredIdx],
                                                servings:
                                                    slotMeals[existingTransferredIdx].servings +
                                                    servingsFromTransferred
                                            };
                                        } else {
                                            slotMeals.push({
                                                recipe,
                                                servings: servingsFromTransferred,
                                                participant: pName,
                                                recipeInstanceId: instanceId || undefined
                                            });
                                        }
                                    }

                                    if (servingsFromBase > 0) {
                                        const existingBaseIdx = slotMeals.findIndex(
                                            (m) =>
                                                m.recipe.id === recipeId &&
                                                m.participant === pName &&
                                                m.recipeInstanceId === baseInstanceId
                                        );
                                        if (existingBaseIdx !== -1) {
                                            slotMeals[existingBaseIdx] = {
                                                ...slotMeals[existingBaseIdx],
                                                servings:
                                                    slotMeals[existingBaseIdx].servings +
                                                    servingsFromBase
                                            };
                                        } else {
                                            slotMeals.push({
                                                recipe,
                                                servings: servingsFromBase,
                                                participant: pName,
                                                recipeInstanceId: baseInstanceId
                                            });
                                        }
                                    }
                                });

                                targetDayPlan[slot] = slotMeals;
                                newPlan[targetDateStr] = targetDayPlan;
                                return newPlan;
                            });
                            setConfirmation(null);
                        } else if (instanceId) {
                            setMultiWeeklyCookPlan((prev) => ({
                                ...prev,
                                [weekStartStr]: {
                                    ...(prev[weekStartStr] || {}),
                                    [instanceId]: {
                                        ...(prev[weekStartStr]?.[instanceId] || {}),
                                        multiplier:
                                            (prev[weekStartStr]?.[instanceId]?.multiplier || 0) +
                                            neededMulti,
                                        servings:
                                            (prev[weekStartStr]?.[instanceId]?.servings || 0) +
                                            neededMulti * recipe.servings
                                    }
                                }
                            }));
                            performMoveOrAdd();
                        } else {
                            performMoveOrAdd();
                        }
                    }
                });
            } else {
                performMoveOrAdd();
            }
        },
        [
            canEdit,
            mealPlan,
            recipes,
            participants.length,
            selectedParticipants,
            currentWeeklyCookPlan,
            weekDays,
            weekStartStr,
            setMealPlan,
            setMultiWeeklyCookPlan,
            setConfirmation
        ]
    );

    const handleQuickAddRecipe = useCallback(
        (
            recipe: Recipe,
            date: Date,
            slot: keyof MealPlan[string],
            participant?: string
        ) => {
            if (!canEdit) return;
            const targetDateStr = format(date, 'yyyy-MM-dd');
            const recipeIdToAdd = recipe.id;

            let targetInstanceId: string | undefined;
            let needsNewInstance = true;

            const existingInstances = Object.entries(currentWeeklyCookPlan).filter(
                ([, item]) => item.recipeId === recipeIdToAdd
            );

            if (existingInstances.length > 0) {
                targetInstanceId = existingInstances[0][0];
                needsNewInstance = false;
            }

            const performAdd = (instanceId?: string) => {
                setMealPlan((prev) => {
                    const newPlan = { ...prev };
                    const targetDayPlan = { ...(newPlan[targetDateStr] || {}) };
                    const slotMeals = [...(targetDayPlan[slot] || [])];

                    const existingMealIndex = slotMeals.findIndex(
                        (m) =>
                            m.recipe.id === recipeIdToAdd &&
                            m.participant === participant &&
                            m.recipeInstanceId === instanceId
                    );

                    if (existingMealIndex !== -1) {
                        slotMeals[existingMealIndex] = {
                            ...slotMeals[existingMealIndex],
                            servings: slotMeals[existingMealIndex].servings + 1
                        };
                    } else {
                        slotMeals.push({
                            recipe,
                            servings: 1,
                            participant,
                            recipeInstanceId: instanceId || undefined
                        });
                    }

                    targetDayPlan[slot] = slotMeals;
                    newPlan[targetDateStr] = targetDayPlan;
                    return newPlan;
                });
                setQuickAddSlot(null);
                setConfirmation(null);
            };

            if (needsNewInstance) {
                const newInstanceId = generateUUID();
                setMultiWeeklyCookPlan((prev) => ({
                    ...prev,
                    [weekStartStr]: {
                        ...(prev[weekStartStr] || {}),
                        [newInstanceId]: {
                            recipeId: recipeIdToAdd,
                            multiplier: 1,
                            servings: recipe.servings
                        }
                    }
                }));
                targetInstanceId = newInstanceId;
            }

            const item = targetInstanceId
                ? currentWeeklyCookPlan[targetInstanceId]
                : null;
            const totalServings = item?.servings || recipe.servings;

            const usedForInstance = weekDays.reduce((sum, d) => {
                const dStr = format(d, 'yyyy-MM-dd');
                const dayPlan = mealPlan[dStr];
                if (!dayPlan) return sum;
                return (
                    sum +
                    getAllMealsForDay(dayPlan)
                        .filter(
                            (m) =>
                                m.recipe.id === recipeIdToAdd &&
                                m.recipeInstanceId === targetInstanceId
                        )
                        .reduce((s, m) => s + m.servings, 0)
                );
            }, 0);
            const manualUsed = item?.manualUsed || 0;
            const totalUsed = usedForInstance + manualUsed;

            if (totalUsed + 1 > totalServings) {
                const overflow = totalUsed + 1 - totalServings;
                const neededMulti = Math.ceil(overflow / recipe.servings);

                setConfirmation({
                    title: 'Increase Servings?',
                    message: `Adding this meal will exceed the planned servings for "${recipe.name}" by ${overflow} serving(s). Would you like to increase the shopping list count by adding another ${neededMulti * recipe.servings} servings?`,
                    confirmLabel: 'Increase & Add',
                    onConfirm: () => {
                        if (targetInstanceId) {
                            setMultiWeeklyCookPlan((prev) => ({
                                ...prev,
                                [weekStartStr]: {
                                    ...(prev[weekStartStr] || {}),
                                    [targetInstanceId]: {
                                        ...(prev[weekStartStr]?.[targetInstanceId] || {
                                            recipeId: recipeIdToAdd,
                                            multiplier: 0,
                                            servings: 0
                                        }),
                                        multiplier:
                                            (prev[weekStartStr]?.[targetInstanceId]?.multiplier ||
                                                0) + neededMulti,
                                        servings:
                                            (prev[weekStartStr]?.[targetInstanceId]?.servings ||
                                                0) +
                                            neededMulti * recipe.servings
                                    }
                                }
                            }));
                        }
                        performAdd(targetInstanceId);
                    }
                });
            } else {
                performAdd(targetInstanceId);
            }
        },
        [
            canEdit,
            currentWeeklyCookPlan,
            mealPlan,
            weekDays,
            weekStartStr,
            setMealPlan,
            setMultiWeeklyCookPlan,
            setQuickAddSlot,
            setConfirmation
        ]
    );

    const handleUpdateSlotServings = useCallback(
        (
            date: Date,
            slot: keyof MealPlan[string],
            recipeId: string,
            servings: number,
            instanceId?: string,
            participant?: string
        ) => {
            if (!canEdit) return;
            const dStr = format(date, 'yyyy-MM-dd');

            const currentServings =
                mealPlan[dStr]?.[slot]?.find(
                    (m) =>
                        m.recipe.id === recipeId &&
                        m.participant === participant &&
                        (!instanceId || m.recipeInstanceId === instanceId)
                )?.servings || 0;

            const performUpdate = () => {
                setMealPlan((prev) => {
                    const newPlan = { ...prev };
                    const dayPlan = { ...(newPlan[dStr] || {}) };
                    if (Array.isArray(dayPlan[slot])) {
                        dayPlan[slot] = dayPlan[slot].map((m) =>
                            m.recipe.id === recipeId &&
                            m.participant === participant &&
                            (!instanceId || m.recipeInstanceId === instanceId)
                                ? { ...m, servings: Math.max(1, servings) }
                                : m
                        );
                        newPlan[dStr] = dayPlan;
                    }
                    return newPlan;
                });
                setConfirmation(null);
            };

            if (servings > currentServings) {
                const recipe = recipes.find((r) => r.id === recipeId);
                if (recipe) {
                    const allInstances = findRecipeInstances(
                        currentWeeklyCookPlan,
                        recipe.id
                    );
                    const totalPlanned = allInstances.reduce(
                        (sum, { item }) => sum + (item.servings || 0),
                        0
                    );
                    const used = getUsedServings(recipe.id);
                    const manualUsed = allInstances.reduce(
                        (sum, { item }) => sum + (item.manualUsed || 0),
                        0
                    );
                    const diff = servings - currentServings;

                    if (used + manualUsed + diff > totalPlanned) {
                        setConfirmation({
                            title: 'Increase Servings?',
                            message: `Increasing servings will exceed the planned batch for "${recipe.name}". Would you like to increase the shopping list count by adding another ${recipe.servings} servings?`,
                            confirmLabel: 'Increase & Update',
                            onConfirm: () => {
                                const baseInstance = findBaseRecipeInstance(
                                    currentWeeklyCookPlan,
                                    recipe.id
                                );

                                if (baseInstance) {
                                    setMultiWeeklyCookPlan((prev) => ({
                                        ...prev,
                                        [weekStartStr]: {
                                            ...(prev[weekStartStr] || {}),
                                            [baseInstance.id]: {
                                                ...prev[weekStartStr]?.[baseInstance.id],
                                                multiplier:
                                                    (prev[weekStartStr]?.[baseInstance.id]
                                                        ?.multiplier || 0) + 1,
                                                servings:
                                                    (prev[weekStartStr]?.[baseInstance.id]
                                                        ?.servings || 0) + recipe.servings
                                            }
                                        }
                                    }));
                                } else {
                                    const newId = generateUUID();
                                    setMultiWeeklyCookPlan((prev) => ({
                                        ...prev,
                                        [weekStartStr]: {
                                            ...(prev[weekStartStr] || {}),
                                            [newId]: {
                                                recipeId: recipe.id,
                                                multiplier: 1,
                                                servings: recipe.servings
                                            }
                                        }
                                    }));
                                }
                                performUpdate();
                            }
                        });
                        return;
                    }
                }
            }

            performUpdate();
        },
        [
            canEdit,
            mealPlan,
            recipes,
            currentWeeklyCookPlan,
            weekStartStr,
            getUsedServings,
            setMealPlan,
            setMultiWeeklyCookPlan,
            setConfirmation
        ]
    );

    return {
        onDragStart,
        onMealDragStart,
        onDrop,
        onDragOver,
        handleQuickAddRecipe,
        handleRemoveSlotMeal,
        handleUpdateSlotServings
    };
}
