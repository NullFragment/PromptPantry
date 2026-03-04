import { Check, Edit, Trash2 } from 'lucide-react';
import type * as React from 'react';
import type { IngredientDefinition } from '../../types';

export interface IngredientCardProps {
    ingredient: IngredientDefinition;
    isEditing: boolean;
    isSelected: boolean;
    canEdit: boolean;
    onToggleSelect: (id: string) => void;
    onEdit: (ingredient: IngredientDefinition) => void;
    onDelete: (ingredient: IngredientDefinition) => void;
    onClick: (ingredient: IngredientDefinition) => void;
    children?: React.ReactNode;
}

export function IngredientCard({
    ingredient,
    isEditing,
    isSelected,
    canEdit,
    onToggleSelect,
    onEdit,
    onDelete,
    onClick,
    children
}: IngredientCardProps) {
    return (
        <div
            onClick={() => onClick(ingredient)}
            className={`bg-white dark:bg-gray-900 rounded-xl shadow-sm border overflow-hidden transition-colors ${
                isSelected
                    ? 'border-indigo-500 ring-2 ring-indigo-500/20'
                    : 'border-gray-200 dark:border-gray-800'
            }`}
        >
            {isEditing ? (
                <div className="p-4">{children}</div>
            ) : (
                <div className="p-4">
                    <div className="flex items-start justify-between">
                        {canEdit && (
                            <button
                                onClick={(e) => {
                                    e.stopPropagation();
                                    onToggleSelect(ingredient.id);
                                }}
                                className={`mr-3 mt-1 flex-shrink-0 w-5 h-5 rounded border-2 flex items-center justify-center transition-colors ${
                                    isSelected
                                        ? 'bg-indigo-600 border-indigo-600 text-white'
                                        : 'border-gray-300 dark:border-gray-600 hover:border-indigo-400'
                                }`}
                                title={isSelected ? 'Deselect' : 'Select'}
                            >
                                {isSelected && <Check className="h-3 w-3" />}
                            </button>
                        )}
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                                {ingredient.name}
                            </h3>
                            <span className="inline-block mt-1 px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                                {ingredient.storeSection}
                            </span>
                            {ingredient.aliases && ingredient.aliases.length > 0 && (
                                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                                    <span className="font-medium">
                                        +{ingredient.aliases.length} alias
                                        {ingredient.aliases.length === 1 ? '' : 'es'}
                                    </span>
                                    <span className="hidden sm:inline">
                                        : {ingredient.aliases.slice(0, 3).join(', ')}
                                        {ingredient.aliases.length > 3 ? '...' : ''}
                                    </span>
                                </p>
                            )}
                        </div>
                        {canEdit && (
                            <div className="flex gap-1 ml-2" onClick={(e) => e.stopPropagation()}>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onEdit(ingredient);
                                    }}
                                    className="p-2 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                    title="Edit"
                                >
                                    <Edit className="h-4 w-4" />
                                </button>
                                <button
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        onDelete(ingredient);
                                    }}
                                    className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                                    title="Delete"
                                >
                                    <Trash2 className="h-4 w-4" />
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}
