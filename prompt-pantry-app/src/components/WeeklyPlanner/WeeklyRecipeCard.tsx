import { format, parseISO } from 'date-fns';
import { useEffect, useState } from 'react';
import type * as React from 'react';
import { Heart, Info, ThumbsDown, ThumbsUp, Trash2 } from 'lucide-react';
import type { Recipe } from '../../types';
import type { WeeklyRecipeCardData } from './weeklyPlannerTypes';

interface WeeklyRecipeCardProps {
    card: WeeklyRecipeCardData;
    canEdit: boolean;
    onDragStart: (e: React.DragEvent, recipeName: string, instanceId: string) => void;
    onRemove: (instanceId: string) => void;
    onUpdateMultiplier: (instanceId: string, value: number) => void;
    onViewRecipe: (recipe: Recipe) => void;
}

export function WeeklyRecipeCard({
    card,
    canEdit,
    onDragStart,
    onRemove,
    onUpdateMultiplier,
    onViewRecipe
}: WeeklyRecipeCardProps) {
    const { name, instanceId, item, recipe, servings, used, type } = card;
    const [multiplierInput, setMultiplierInput] = useState(() => String(item.multiplier ?? 0));

    useEffect(() => {
        setMultiplierInput(String(item.multiplier ?? 0));
    }, [item.multiplier]);

    const handleMultiplierBlur = () => {
        const n = parseInt(multiplierInput, 10);
        if (!Number.isNaN(n) && n >= 0) {
            onUpdateMultiplier(instanceId, n);
            setMultiplierInput(String(n));
        } else {
            setMultiplierInput(String(item.multiplier ?? 0));
        }
    };

    const remaining = Math.max(0, servings - used);
    const totalUsed = Math.min(servings, used);
    const isTransferredCard = type === 'transferred';

    return (
        <div
            data-testid="weekly-recipe-card"
            data-recipe-name={name}
            data-card-type={type}
            draggable={canEdit}
            onDragStart={(e) => {
                if (!canEdit) return;
                onDragStart(e, name, instanceId);
            }}
            className={`p-4 soft-card ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} transition-all group ${
                isTransferredCard
                    ? 'border-orange-200 dark:border-orange-900/50 bg-orange-50/20 dark:bg-orange-900/10'
                    : 'hover:border-indigo-300 dark:hover:border-indigo-500'
            }`}
        >
            <div className="flex justify-between items-start mb-3">
                <div className="flex-1 truncate mr-2">
                    <div className="flex items-center gap-2 mb-1">
                        <span className="font-bold text-sm text-gray-800 dark:text-gray-100 truncate">{name}</span>
                        <div className="flex gap-1 shrink-0">
                            {recipe?.isFavorite && (
                                <Heart className="h-3 w-3 text-pink-500 fill-current" />
                            )}
                            {recipe?.rating === 'up' && (
                                <ThumbsUp className="h-3 w-3 text-green-500" />
                            )}
                            {recipe?.rating === 'down' && (
                                <ThumbsDown className="h-3 w-3 text-red-500" />
                            )}
                        </div>
                    </div>
                    {isTransferredCard && card.originalSourceWeek && (
                        <div className="text-[10px] font-bold text-orange-500 dark:text-orange-400 uppercase tracking-tighter">
                            Transferred from week of {format(parseISO(card.originalSourceWeek), 'MMM d')}
                        </div>
                    )}
                </div>
                <div className="flex items-center gap-1">
                    <button
                        onClick={() => recipe && onViewRecipe(recipe)}
                        className="text-gray-300 dark:text-gray-600 hover:text-indigo-500 dark:hover:text-indigo-400 transition-colors p-1"
                        title="View Recipe Details"
                    >
                        <Info className="h-4 w-4" />
                    </button>
                    {canEdit && (
                        <button
                            onClick={() => onRemove(instanceId)}
                            className="text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors p-1"
                            title="Remove from recipes"
                        >
                            <Trash2 className="h-4 w-4" />
                        </button>
                    )}
                </div>
            </div>

            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <span className="eyebrow">Multiplier</span>
                    <input
                        type="number"
                        value={multiplierInput}
                        onChange={(e) => setMultiplierInput(e.target.value)}
                        onBlur={handleMultiplierBlur}
                        className="input-control"
                        disabled={!canEdit || isTransferredCard}
                        min={0}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <span className="eyebrow">Servings</span>
                    <div
                        className={`badge-strong ${
                            remaining > 0
                                ? isTransferredCard
                                    ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300'
                                    : 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                : 'bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400'
                        }`}
                    >
                        {totalUsed}/{servings}
                    </div>
                </div>
            </div>

            <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-full h-2">
                <div
                    className={`h-2 rounded-full transition-all duration-500 ${
                        remaining > 0 ? (isTransferredCard ? 'bg-orange-500' : 'bg-indigo-500') : 'bg-green-500'
                    }`}
                    style={{
                        width: `${servings > 0 ? Math.min(100, (totalUsed / servings) * 100) : 0}%`
                    }}
                />
            </div>
        </div>
    );
}
