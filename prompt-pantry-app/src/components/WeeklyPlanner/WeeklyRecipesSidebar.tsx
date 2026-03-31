import { Plus, RotateCcw, Utensils } from 'lucide-react';
import type * as React from 'react';
import type { Recipe } from '../../types';
import type { WeeklyRecipeCardData } from './weeklyPlannerTypes';
import { WeeklyRecipeCard } from './WeeklyRecipeCard';

export interface WeeklyRecipesSidebarProps {
    weeklyRecipeCards: WeeklyRecipeCardData[];
    hasAnyRecipes: boolean;
    canEdit: boolean;
    onClear: () => void;
    onAddRecipe: () => void;
    onDragStart: (e: React.DragEvent, recipeId: string, instanceId: string) => void;
    onRemove: (instanceId: string) => void;
    onUpdateMultiplier: (instanceId: string, value: number) => void;
    onViewRecipe: (recipe: Recipe) => void;
}

export function WeeklyRecipesSidebar({
    weeklyRecipeCards,
    hasAnyRecipes,
    canEdit,
    onClear,
    onAddRecipe,
    onDragStart,
    onRemove,
    onUpdateMultiplier,
    onViewRecipe
}: WeeklyRecipesSidebarProps) {
    return (
        <div className="w-full lg:w-80">
            <div className="lg:sticky lg:top-20 flex flex-col gap-6 lg:max-h-[calc(100vh-6rem)]">
                <div className="flex flex-col">
                    <div className="flex justify-between items-center mb-4">
                        <h3 className="eyebrow flex items-center">
                            <Utensils className="h-3 w-3 mr-2 text-indigo-500" /> Weekly Recipes
                        </h3>
                        <div className="flex gap-2">
                            {canEdit && (
                                <>
                                    <button
                                        onClick={onClear}
                                        className="icon-button border border-red-100 bg-red-50 text-red-600 hover:bg-red-100"
                                        title="Clear weekly recipes list"
                                    >
                                        <RotateCcw className="h-4 w-4" />
                                    </button>
                                    <button
                                        onClick={onAddRecipe}
                                        className="icon-button bg-indigo-600 text-white hover:bg-indigo-700 hover:text-white"
                                        title="Add Recipe"
                                    >
                                        <Plus className="h-4 w-4" />
                                    </button>
                                </>
                            )}
                        </div>
                    </div>

                    <div className="flex-1 flex flex-col gap-3 min-h-[120px] lg:max-h-[calc(100vh-12rem)] lg:overflow-y-auto lg:pr-2">
                        {weeklyRecipeCards.map((card) => (
                            <WeeklyRecipeCard
                                key={card.key}
                                card={card}
                                canEdit={canEdit}
                                onDragStart={onDragStart}
                                onRemove={onRemove}
                                onUpdateMultiplier={onUpdateMultiplier}
                                onViewRecipe={onViewRecipe}
                            />
                        ))}
                        {!hasAnyRecipes && (
                            <div className="flex-1 text-center py-8 border-2 border-dashed border-gray-100 dark:border-gray-800 rounded-xl muted-surface">
                                <p className="text-sm font-medium text-gray-400 dark:text-gray-500 px-4">
                                    Drag and drop recipes here to plan your weekly recipes
                                </p>
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
