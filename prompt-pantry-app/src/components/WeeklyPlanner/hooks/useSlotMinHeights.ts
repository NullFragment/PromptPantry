import { format } from 'date-fns';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import type { MealPlan, Participant } from '../../../types';
import { ALL_MEAL_TYPES } from '../../../utils/mealPlanUtils';

const BASE_SLOT_MIN_HEIGHT = 80;

export interface UseSlotMinHeightsParams {
    weekDays: Date[];
    mealPlan: MealPlan;
    participants: Participant[];
    selectedParticipants: string[];
}

export interface UseSlotMinHeightsResult {
    slotMinHeights: Record<string, number>;
    fallbackSlotMinHeights: Record<string, number>;
    baseSlotMinHeight: number;
    plannerContainerRef: React.RefObject<HTMLDivElement>;
}

export function useSlotMinHeights({
    weekDays,
    mealPlan,
    participants,
    selectedParticipants
}: UseSlotMinHeightsParams): UseSlotMinHeightsResult {
    const plannerContainerRef = useRef<HTMLDivElement>(null);
    const fallbackSlotMinHeights = useMemo(() => {
        const maxPerSlot: Record<string, number> = {};
        weekDays.forEach((day) => {
            const dStr = format(day, 'yyyy-MM-dd');
            const dayPlan = mealPlan[dStr];
            ALL_MEAL_TYPES.forEach((slot) => {
                const slotMeals = (Array.isArray(dayPlan?.[slot]) ? dayPlan[slot] ?? [] : []).filter(
                    (m) =>
                        participants.length === 0 ||
                        (m.participant && selectedParticipants.includes(m.participant)) ||
                        !m.participant
                );
                const uniqueRecipeCount = slotMeals.length;
                maxPerSlot[slot] = Math.max(maxPerSlot[slot] || 0, uniqueRecipeCount);
            });
        });
        return ALL_MEAL_TYPES.reduce(
            (acc, slot) => ({
                ...acc,
                [slot]: Math.max(BASE_SLOT_MIN_HEIGHT, Math.max(1, maxPerSlot[slot] || 0) * 140)
            }),
            {} as Record<string, number>
        );
    }, [weekDays, mealPlan, participants.length, selectedParticipants]);

    const [slotMinHeights, setSlotMinHeights] = useState<Record<string, number>>({});

    useEffect(() => {
        const measure = () => {
            const container = plannerContainerRef.current;
            if (!container) return;

            const measured: Record<string, number> = {};
            container.querySelectorAll('[data-slot]').forEach((el) => {
                const slot = (el as HTMLElement).dataset.slot;
                if (!slot) return;
                const element = el as HTMLElement;
                const prevMinHeight = element.style.minHeight;
                element.style.minHeight = '';
                const height = element.getBoundingClientRect().height;
                element.style.minHeight = prevMinHeight;
                measured[slot] = Math.max(measured[slot] || 0, height);
            });

            const normalized = ALL_MEAL_TYPES.reduce(
                (acc, slot) => {
                    const measuredHeight = measured[slot] || 0;
                    const fallbackHeight = fallbackSlotMinHeights[slot] || 0;
                    return {
                        ...acc,
                        [slot]: Math.max(
                            BASE_SLOT_MIN_HEIGHT,
                            measuredHeight > 0 ? measuredHeight : fallbackHeight
                        )
                    };
                },
                {} as Record<string, number>
            );

            setSlotMinHeights(normalized);
        };

        const id = requestAnimationFrame(measure);
        return () => cancelAnimationFrame(id);
    }, [weekDays, mealPlan, selectedParticipants, participants.length, fallbackSlotMinHeights]);

    return {
        slotMinHeights,
        fallbackSlotMinHeights,
        baseSlotMinHeight: BASE_SLOT_MIN_HEIGHT,
        plannerContainerRef
    };
}
