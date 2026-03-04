import { format, parseISO, startOfWeek, subWeeks } from 'date-fns';
import React, { useCallback, useEffect, useRef, useState } from 'react';
import type { MealPlan, MultiWeeklyCookPlan } from '../../../types';
import { generateUUID, getOriginalSourceWeek, getUsedServingsForWeek } from '../../../utils/mealPlanUtils';
import type { LeftoverItem } from '../weeklyPlannerTypes';

export interface UseLeftoverPromptParams {
    weekStart: Date;
    weekStartStr: string;
    multiWeeklyCookPlan: MultiWeeklyCookPlan;
    setMultiWeeklyCookPlan: React.Dispatch<React.SetStateAction<MultiWeeklyCookPlan>>;
    promptedRecipes: Record<string, string[]>;
    setPromptedRecipes: React.Dispatch<React.SetStateAction<Record<string, string[]>>>;
    mealPlan: MealPlan;
    canEdit: boolean;
}

export interface UseLeftoverPromptResult {
    showLeftoverPrompt: boolean;
    leftovers: LeftoverItem[];
    handleDoNothing: () => void;
    handleIndividualIgnore: (recipeName: string, allInstances?: { instanceId: string; weekStr: string; count: number }[]) => void;
    handleIndividualZeroOut: (
        recipeName: string,
        _count: number,
        fromWeekStr: string,
        allWeeks?: string[],
        allInstances?: { instanceId: string; weekStr: string; count: number }[]
    ) => void;
    handleIndividualTransfer: (
        recipeName: string,
        _count: number,
        fromWeekStr: string,
        allWeeks?: string[],
        sourceInstanceId?: string,
        allInstances?: { instanceId: string; weekStr: string; count: number }[]
    ) => void;
    handleTransfer: () => void;
    handleZeroOut: () => void;
}

export function useLeftoverPrompt({
    weekStart,
    weekStartStr,
    multiWeeklyCookPlan,
    setMultiWeeklyCookPlan,
    promptedRecipes,
    setPromptedRecipes,
    mealPlan,
    canEdit
}: UseLeftoverPromptParams): UseLeftoverPromptResult {
    const [showLeftoverPrompt, setShowLeftoverPrompt] = useState(false);
    const [leftovers, setLeftovers] = useState<LeftoverItem[]>([]);

    const getUsedServings = useCallback(
        (recipeName: string, date?: Date, instanceId?: string) => {
            const effectiveDate = date || parseISO(weekStartStr);
            return getUsedServingsForWeek(mealPlan, recipeName, effectiveDate, instanceId);
        },
        [mealPlan, weekStartStr]
    );

    useEffect(() => {
        setShowLeftoverPrompt(false);
        setLeftovers([]);
        setPromptedRecipes({});
    }, [weekStartStr, setPromptedRecipes]);

    const lastWeekStartRef = useRef<Date>(weekStart);
    const hasRunInitialCheck = useRef<boolean>(false);

    useEffect(() => {
        const isNavigation = weekStart.getTime() !== lastWeekStartRef.current.getTime();
        const isForward = weekStart > lastWeekStartRef.current;
        const shouldCheck = !hasRunInitialCheck.current || (isNavigation && isForward);

        lastWeekStartRef.current = weekStart;
        hasRunInitialCheck.current = true;

        if (!shouldCheck || !canEdit) return;

        if (!showLeftoverPrompt) {
            const todayStart = startOfWeek(new Date(), { weekStartsOn: 0 });
            if (weekStart < todayStart) return;

            const weeksToCheck = 1;
            const instanceLeftovers: {
                name: string;
                count: number;
                fromWeek: string;
                originalWeek: string;
                instanceId: string;
            }[] = [];
            const promptedForThisWeek = promptedRecipes[weekStartStr] || [];

            const currentPlan = multiWeeklyCookPlan[weekStartStr] || {};
            const alreadyTransferredIds = new Set(
                Object.values(currentPlan)
                    .filter((item) => item.transferredFromId)
                    .map((item) => item.transferredFromId)
            );

            for (let i = 1; i <= weeksToCheck; i++) {
                const prevWeekStart = subWeeks(parseISO(weekStartStr), i);
                const prevWeekStartStr = format(prevWeekStart, 'yyyy-MM-dd');
                const prevWeekPlan = multiWeeklyCookPlan[prevWeekStartStr];

                if (prevWeekPlan) {
                    Object.entries(prevWeekPlan).forEach(([instanceId, item]) => {
                        const recipeName = item.recipeName;
                        if (!recipeName) return;
                        if (promptedForThisWeek.includes(instanceId)) return;
                        if (alreadyTransferredIds.has(instanceId)) return;

                        const used = getUsedServings(recipeName, prevWeekStart, instanceId);
                        const totalUsed = used + (item.manualUsed || 0);
                        if (item.servings > totalUsed) {
                            const count = item.servings - totalUsed;
                            const originalWeek =
                                getOriginalSourceWeek(multiWeeklyCookPlan, item) || prevWeekStartStr;
                            instanceLeftovers.push({
                                name: recipeName,
                                count,
                                fromWeek: prevWeekStartStr,
                                originalWeek,
                                instanceId
                            });
                        }
                    });
                }
            }

            const groupedByRecipe: Record<
                string,
                { name: string; totalCount: number; instances: { instanceId: string; weekStr: string; count: number }[] }
            > = {};

            instanceLeftovers.forEach((lo) => {
                if (!groupedByRecipe[lo.name]) {
                    groupedByRecipe[lo.name] = { name: lo.name, totalCount: 0, instances: [] };
                }
                groupedByRecipe[lo.name].totalCount += lo.count;
                groupedByRecipe[lo.name].instances.push({
                    instanceId: lo.instanceId,
                    weekStr: lo.fromWeek,
                    count: lo.count
                });
            });

            const foundLeftovers: LeftoverItem[] = Object.values(groupedByRecipe).map((data) => ({
                name: data.name,
                count: data.totalCount,
                fromWeek: data.instances[0].weekStr,
                instanceId: data.instances[0].instanceId,
                allWeeks: [...new Set(data.instances.map((i) => i.weekStr))],
                allInstances: data.instances
            }));

            if (foundLeftovers.length > 0) {
                setLeftovers(foundLeftovers);
                setShowLeftoverPrompt(true);
            }
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [weekStartStr, multiWeeklyCookPlan, promptedRecipes, mealPlan, showLeftoverPrompt, getUsedServings, canEdit]);

    const handleDoNothing = useCallback(() => {
        setPromptedRecipes((prev) => ({
            ...prev,
            [weekStartStr]: [...(prev[weekStartStr] || []), ...leftovers.map((lo) => lo.name)]
        }));
        setShowLeftoverPrompt(false);
    }, [weekStartStr, leftovers, setPromptedRecipes]);

    const handleIndividualIgnore = useCallback(
        (recipeName: string, allInstances?: { instanceId: string; weekStr: string; count: number }[]) => {
            const instanceIds = allInstances?.map((i) => i.instanceId) || [recipeName];
            setPromptedRecipes((prev) => ({
                ...prev,
                [weekStartStr]: [...(prev[weekStartStr] || []), ...instanceIds]
            }));
            setLeftovers((prev) => {
                const remaining = prev.filter((lo) => lo.name !== recipeName);
                if (remaining.length === 0) setShowLeftoverPrompt(false);
                return remaining;
            });
        },
        [weekStartStr, setPromptedRecipes]
    );

    const handleIndividualZeroOut = useCallback(
        (
            recipeName: string,
            _count: number,
            fromWeekStr: string,
            allWeeks?: string[],
            allInstances?: { instanceId: string; weekStr: string; count: number }[]
        ) => {
            if (!canEdit) return;
            setMultiWeeklyCookPlan((prev) => {
                const newMultiPlan = { ...prev };

                if (allInstances && allInstances.length > 0) {
                    allInstances.forEach(({ instanceId, weekStr }) => {
                        const weekPlan = { ...newMultiPlan[weekStr] };
                        const item = weekPlan[instanceId];
                        if (item) {
                            const used = getUsedServings(recipeName, parseISO(weekStr), instanceId);
                            const left = item.servings - (used + (item.manualUsed || 0));
                            if (left > 0) {
                                weekPlan[instanceId] = {
                                    ...item,
                                    manualUsed: (item.manualUsed || 0) + left
                                };
                                newMultiPlan[weekStr] = weekPlan;
                            }
                        }
                    });
                } else {
                    const weeksToZero = allWeeks || [fromWeekStr];
                    weeksToZero.forEach((wStr) => {
                        const weekPlan = { ...newMultiPlan[wStr] };
                        Object.entries(weekPlan).forEach(([instanceId, item]) => {
                            if (item.recipeName === recipeName) {
                                const used = getUsedServings(recipeName, parseISO(wStr), instanceId);
                                const left = item.servings - (used + (item.manualUsed || 0));
                                if (left > 0) {
                                    weekPlan[instanceId] = {
                                        ...item,
                                        manualUsed: (item.manualUsed || 0) + left
                                    };
                                    newMultiPlan[wStr] = weekPlan;
                                }
                            }
                        });
                    });
                }

                return newMultiPlan;
            });
            handleIndividualIgnore(recipeName, allInstances);
        },
        [canEdit, getUsedServings, handleIndividualIgnore, setMultiWeeklyCookPlan]
    );

    const handleIndividualTransfer = useCallback(
        (
            recipeName: string,
            _count: number,
            fromWeekStr: string,
            allWeeks?: string[],
            sourceInstanceId?: string,
            allInstances?: { instanceId: string; weekStr: string; count: number }[]
        ) => {
            if (!canEdit) return;
            setMultiWeeklyCookPlan((prev) => {
                const newMultiPlan = { ...prev };
                const currentWeekPlan = { ...(newMultiPlan[weekStartStr] || {}) };

                if (allInstances && allInstances.length > 0) {
                    allInstances.forEach(({ instanceId, weekStr }) => {
                        const prevWeekPlan = { ...newMultiPlan[weekStr] };
                        const item = prevWeekPlan[instanceId];

                        if (item) {
                            const used = getUsedServings(recipeName, parseISO(weekStr), instanceId);
                            const totalUsed = used + (item.manualUsed || 0);
                            if (item.servings > totalUsed) {
                                const left = item.servings - totalUsed;
                                prevWeekPlan[instanceId] = { ...item, servings: totalUsed };
                                newMultiPlan[weekStr] = prevWeekPlan;
                                const newInstanceId = generateUUID();
                                currentWeekPlan[newInstanceId] = {
                                    recipeName,
                                    servings: left,
                                    transferredFromDate: weekStr,
                                    transferredFromId: instanceId
                                };
                            }
                        }
                    });
                } else {
                    const weeksToTransfer = allWeeks || [fromWeekStr];
                    let totalTransferred = 0;
                    let lastSourceId = sourceInstanceId;

                    weeksToTransfer.forEach((wStr) => {
                        const prevWeekPlan = { ...newMultiPlan[wStr] };
                        const instanceEntry = Object.entries(prevWeekPlan).find(
                            ([, item]) => item.recipeName === recipeName
                        );

                        if (instanceEntry) {
                            const [instId, item] = instanceEntry;
                            const used = getUsedServings(recipeName, parseISO(wStr), instId);
                            const totalUsed = used + (item.manualUsed || 0);
                            if (item.servings > totalUsed) {
                                const left = item.servings - totalUsed;
                                totalTransferred += left;
                                lastSourceId = instId;
                                prevWeekPlan[instId] = { ...item, servings: totalUsed };
                                newMultiPlan[wStr] = prevWeekPlan;
                            }
                        }
                    });

                    if (totalTransferred > 0) {
                        const newInstanceId = generateUUID();
                        currentWeekPlan[newInstanceId] = {
                            recipeName,
                            servings: totalTransferred,
                            transferredFromDate: fromWeekStr,
                            transferredFromId: lastSourceId
                        };
                    }
                }

                newMultiPlan[weekStartStr] = currentWeekPlan;
                return newMultiPlan;
            });
            handleIndividualIgnore(recipeName, allInstances);
        },
        [canEdit, getUsedServings, handleIndividualIgnore, weekStartStr, setMultiWeeklyCookPlan]
    );

    const handleZeroOut = useCallback(() => {
        leftovers.forEach((lo) =>
            handleIndividualZeroOut(lo.name, lo.count, lo.fromWeek, lo.allWeeks, lo.allInstances)
        );
    }, [leftovers, handleIndividualZeroOut]);

    const handleTransfer = useCallback(() => {
        leftovers.forEach((lo) =>
            handleIndividualTransfer(
                lo.name,
                lo.count,
                lo.fromWeek,
                lo.allWeeks,
                lo.instanceId,
                lo.allInstances
            )
        );
    }, [leftovers, handleIndividualTransfer]);

    return {
        showLeftoverPrompt,
        leftovers,
        handleDoNothing,
        handleIndividualIgnore,
        handleIndividualZeroOut,
        handleIndividualTransfer,
        handleTransfer,
        handleZeroOut
    };
}
