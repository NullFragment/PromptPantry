import type * as React from 'react';
import { format } from 'date-fns';
import { Plus } from 'lucide-react';
import type { MealPlan, Participant } from '../../types';
import { ALL_MEAL_TYPES, calculateDayTotals } from '../../utils/mealPlanUtils';
import type { MealType } from '../../utils/mealPlanUtils';
import { ParticipantProgress } from '../ParticipantProgress';
import { MealSlotCard } from './MealSlotCard';

export interface DayColumnProps {
    day: Date;
    dayPlan: MealPlan[string] | undefined;
    participants: Participant[];
    selectedParticipants: string[];
    showMacros: boolean;
    slotMinHeights: Record<string, number>;
    fallbackSlotMinHeights: Record<string, number>;
    baseSlotMinHeight: number;
    canEdit: boolean;
    onDrop: (e: React.DragEvent, date: Date, slot: MealType) => void;
    onDragOver: (e: React.DragEvent) => void;
    onMealDragStart: (e: React.DragEvent, recipeId: string, dateStr: string, slot: MealType, participant: string | undefined, recipeInstanceId: string | undefined) => void;
    onUpdateSlotServings: (day: Date, slot: MealType, recipeId: string, servings: number, recipeInstanceId: string | undefined, participant: string | undefined) => void;
    onRemoveSlotMeal: (day: Date, slot: MealType, recipeId: string, recipeInstanceId: string | undefined, participant: string | undefined) => void;
    onQuickAdd: (date: string, slot: MealType) => void;
}

export function DayColumn({
    day,
    dayPlan,
    participants,
    selectedParticipants,
    showMacros,
    slotMinHeights,
    fallbackSlotMinHeights,
    baseSlotMinHeight,
    canEdit,
    onDrop,
    onDragOver,
    onMealDragStart,
    onUpdateSlotServings,
    onRemoveSlotMeal,
    onQuickAdd
}: DayColumnProps) {
    const dStr = format(day, 'yyyy-MM-dd');
    const isToday = dStr === format(new Date(), 'yyyy-MM-dd');

    return (
        <div className="space-y-3">
            <div
                className={`text-center p-3 rounded-xl transition-all ${isToday ? 'bg-indigo-50/30 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 shadow-sm' : 'muted-surface'}`}
            >
                <div className="label-strong mb-1">{format(day, 'EEE')}</div>
                <div
                    className={`text-xl font-black mb-1 ${isToday ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-700 dark:text-gray-300'}`}
                >
                    {format(day, 'd')}
                </div>
                {participants.length > 0 && (
                    <div className="pt-2 border-t border-gray-200/50 dark:border-gray-700/50 space-y-2">
                        {participants
                            .filter(p => selectedParticipants.includes(p.name))
                            .map(p => {
                                const pDayTotals = calculateDayTotals(dayPlan, [p.name]);
                                return (
                                    <ParticipantProgress
                                        key={p.name}
                                        participant={p}
                                        currentMacros={pDayTotals}
                                        compact={true}
                                        showMacros={showMacros}
                                    />
                                );
                            })}
                    </div>
                )}
            </div>

            {ALL_MEAL_TYPES.map(slot => {
                const slotMeals = (Array.isArray(dayPlan?.[slot]) ? dayPlan[slot] ?? [] : [])
                    .filter(m =>
                        participants.length === 0 ||
                        (m.participant && selectedParticipants.includes(m.participant)) ||
                        !m.participant
                    );
                const minHeight = Math.max(
                    baseSlotMinHeight,
                    slotMinHeights[slot] || 0,
                    fallbackSlotMinHeights[slot] || 0
                );

                return (
                    <div
                        key={slot}
                        onDrop={(e) => onDrop(e, day, slot)}
                        onDragOver={onDragOver}
                        data-slot={slot}
                        data-day={dStr}
                        style={{ minHeight: `${minHeight}px` }}
                        className="p-2 muted-surface border-2 border-dashed border-gray-200 dark:border-gray-700 rounded-xl flex flex-col gap-2 hover:bg-indigo-50/30 dark:hover:bg-indigo-900/20 hover:border-indigo-200 dark:hover:border-indigo-800 transition-all"
                    >
                        <div className="label-strong mb-1 text-center border-b card-divider pb-1 text-gray-300 dark:text-gray-600">
                            {slot}
                        </div>
                        {slotMeals.map((meal, idx) => (
                            <MealSlotCard
                                key={`${meal.recipe.name}-${meal.participant || idx}`}
                                meal={meal}
                                participants={participants}
                                canEdit={canEdit}
                                onDecrement={() =>
                                    onUpdateSlotServings(
                                        day,
                                        slot,
                                        meal.recipe.id,
                                        meal.servings - 1,
                                        meal.recipeInstanceId,
                                        meal.participant
                                    )
                                }
                                onIncrement={() =>
                                    onUpdateSlotServings(
                                        day,
                                        slot,
                                        meal.recipe.id,
                                        meal.servings + 1,
                                        meal.recipeInstanceId,
                                        meal.participant
                                    )
                                }
                                onRemove={() =>
                                    onRemoveSlotMeal(
                                        day,
                                        slot,
                                        meal.recipe.id,
                                        meal.recipeInstanceId,
                                        meal.participant
                                    )
                                }
                                onDragStart={
                                    canEdit
                                        ? (e) =>
                                              onMealDragStart(
                                                  e,
                                                  meal.recipe.id,
                                                  dStr,
                                                  slot,
                                                  meal.participant,
                                                  meal.recipeInstanceId
                                              )
                                        : undefined
                                }
                            />
                        ))}
                        {canEdit && participants.length > 0 && (
                            <button
                                onClick={() => onQuickAdd(dStr, slot)}
                                className="w-full mt-auto flex items-center justify-center gap-2 py-2 px-3 bg-indigo-50 dark:bg-indigo-900/30 hover:bg-indigo-100 dark:hover:bg-indigo-900/50 text-indigo-600 dark:text-indigo-400 rounded-lg transition-all text-xs font-bold border border-indigo-100 dark:border-indigo-800 hover:border-indigo-300 dark:hover:border-indigo-600"
                                title="Quick add recipe to slot"
                                data-testid="quick-add-recipe"
                            >
                                <Plus className="h-3.5 w-3.5" />
                                <span>Quick Add</span>
                            </button>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
