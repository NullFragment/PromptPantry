import { Check, Edit, GitMerge, Plus, Trash2, X } from 'lucide-react';
import type * as React from 'react';

export interface AliasChipListProps {
    aliases: string[];
    editingIndex: number | null;
    editingValue: string;
    onEditingValueChange: (value: string) => void;
    onStartEdit: (index: number) => void;
    onSaveEdit: () => void;
    onCancelEdit: () => void;
    onDelete: (index: number) => void;
    onMerge: (index: number) => void;
    /** When 'button', show a single "Add alias" button that calls onAddAlias. When 'inline', show input + Add button that calls onAddAliasSubmit. */
    addMode?: 'button' | 'inline' | 'none';
    onAddAlias?: () => void;
    newAliasInput?: string;
    onNewAliasInputChange?: (value: string) => void;
    onAddAliasSubmit?: () => void;
    isAddingAlias?: boolean;
    /** Optional: stop propagation on button clicks (e.g. when inside a card that has its own click handler) */
    stopPropagation?: boolean;
}

export function AliasChipList({
    aliases,
    editingIndex,
    editingValue,
    onEditingValueChange,
    onStartEdit,
    onSaveEdit,
    onCancelEdit,
    onDelete,
    onMerge,
    addMode = 'none',
    onAddAlias,
    newAliasInput = '',
    onNewAliasInputChange,
    onAddAliasSubmit,
    isAddingAlias = false,
    stopPropagation = false
}: AliasChipListProps) {
    const handleClick = (e: React.MouseEvent, fn: () => void) => {
        if (stopPropagation) e.stopPropagation();
        fn();
    };

    return (
        <div className="space-y-2">
            {aliases.map((alias, index) => (
                <div key={index} className="flex flex-wrap items-center gap-2">
                    {editingIndex === index ? (
                        <>
                            <input
                                type="text"
                                value={editingValue}
                                onChange={(e) => onEditingValueChange(e.target.value)}
                                className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 text-sm"
                                placeholder="Alias text"
                                autoFocus
                            />
                            <button
                                type="button"
                                onClick={(e) => handleClick(e, onSaveEdit)}
                                className="p-2 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors"
                                title="Save"
                            >
                                <Check className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleClick(e, onCancelEdit)}
                                className="p-2 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                title="Cancel"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </>
                    ) : (
                        <>
                            <span className="px-3 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 text-sm">
                                {alias}
                            </span>
                            <button
                                type="button"
                                onClick={(e) => handleClick(e, () => onStartEdit(index))}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Edit alias"
                            >
                                <Edit className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleClick(e, () => onDelete(index))}
                                className="p-1.5 text-gray-400 hover:text-red-500 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Delete alias"
                            >
                                <Trash2 className="h-4 w-4" />
                            </button>
                            <button
                                type="button"
                                onClick={(e) => handleClick(e, () => onMerge(index))}
                                className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
                                title="Merge into another alias"
                            >
                                <GitMerge className="h-4 w-4" />
                            </button>
                        </>
                    )}
                </div>
            ))}
            {addMode === 'button' && onAddAlias && (
                <button
                    type="button"
                    onClick={(e) => handleClick(e, onAddAlias)}
                    className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center"
                >
                    <Plus className="h-4 w-4 mr-1" />
                    Add alias
                </button>
            )}
            {addMode === 'inline' && onNewAliasInputChange != null && onAddAliasSubmit != null && (
                <div className="flex gap-2 items-center flex-wrap">
                    <input
                        type="text"
                        value={newAliasInput}
                        onChange={(e) => onNewAliasInputChange(e.target.value)}
                        placeholder="New alias..."
                        className="flex-1 min-w-[120px] px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                    />
                    <button
                        type="button"
                        onClick={(e) => handleClick(e, onAddAliasSubmit)}
                        disabled={!newAliasInput.trim() || isAddingAlias}
                        className="flex items-center gap-1 px-3 py-2 text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 disabled:opacity-50"
                    >
                        <Plus className="h-4 w-4" />
                        {isAddingAlias ? 'Adding...' : 'Add alias'}
                    </button>
                </div>
            )}
        </div>
    );
}
