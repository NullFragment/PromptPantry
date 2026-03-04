import type * as React from 'react';
import { Heart, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import type { MealSlot, Participant } from '../../types';

export interface MealSlotCardProps {
    meal: MealSlot;
    participants: Participant[];
    canEdit: boolean;
    onDecrement: () => void;
    onIncrement: () => void;
    onRemove: () => void;
    onDragStart?: (e: React.DragEvent) => void;
}

export function MealSlotCard({
    meal,
    participants,
    canEdit,
    onDecrement,
    onIncrement,
    onRemove,
    onDragStart
}: MealSlotCardProps) {
    const participantIcon = meal.participant
        ? participants.find(p => p.name === meal.participant)?.icon
        : undefined;

    return (
        <div
            draggable={canEdit && !!onDragStart}
            onDragStart={onDragStart}
            className={`soft-card p-2.5 text-xs group relative hover:shadow-md transition-shadow ${canEdit && onDragStart ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        >
            {meal.participant && (
                <div className="mb-1">
                    <span className="text-[9px] font-black px-1.5 py-0.5 rounded bg-indigo-50 dark:bg-indigo-900/40 text-indigo-600 dark:text-indigo-400 uppercase tracking-tighter border border-indigo-100 dark:border-indigo-800 inline-flex items-center gap-1">
                        {participantIcon && <span className="text-[10px]">{participantIcon}</span>}
                        {meal.participant}
                    </span>
                </div>
            )}
            <div className="flex justify-between items-start mb-1 gap-2">
                <div className="font-bold text-gray-800 dark:text-gray-200 leading-tight break-words">
                    {meal.recipe.name}
                </div>
                <div className="flex gap-1 shrink-0">
                    {meal.recipe.isFavorite && (
                        <Heart className="h-3 w-3 text-pink-500 fill-current" />
                    )}
                    {meal.recipe.rating === 'up' && (
                        <ThumbsUp className="h-3 w-3 text-green-500" />
                    )}
                    {meal.recipe.rating === 'down' && (
                        <ThumbsDown className="h-3 w-3 text-red-500" />
                    )}
                </div>
            </div>
            {canEdit && (
                <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center bg-gray-50 dark:bg-gray-900 rounded border border-gray-100 dark:border-gray-700 p-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onDecrement();
                            }}
                            className="w-4 h-4 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded transition-colors text-xs font-bold dark:text-gray-300"
                        >
                            -
                        </button>
                        <span className="font-bold w-5 text-center text-[11px] dark:text-gray-300">
                            {meal.servings}
                        </span>
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onIncrement();
                            }}
                            className="w-4 h-4 flex items-center justify-center hover:bg-white dark:hover:bg-gray-700 rounded transition-colors text-xs font-bold dark:text-gray-300"
                        >
                            +
                        </button>
                    </div>
                    <div className="flex items-center gap-1">
                        <button
                            onClick={(e) => {
                                e.stopPropagation();
                                onRemove();
                            }}
                            className="text-gray-300 dark:text-gray-600 hover:text-red-500 transition-colors p-1"
                            title="Remove meal"
                        >
                            <Trash2 className="h-3.5 w-3.5" />
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
