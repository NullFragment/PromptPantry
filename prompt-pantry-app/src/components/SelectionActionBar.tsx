import type { ReactNode } from 'react';

export interface SelectionActionBarProps {
    count: number;
    itemLabel: string;
    onClearAll: () => void;
    children?: ReactNode;
}

export function SelectionActionBar({
    count,
    itemLabel,
    onClearAll,
    children
}: SelectionActionBarProps) {
    return (
        <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700 shadow-lg z-50 p-4">
            <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-4">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {count} {itemLabel}{count === 1 ? '' : 's'} selected
                </span>
                <div className="flex flex-wrap items-center gap-2">
                    <button
                        type="button"
                        onClick={onClearAll}
                        className="px-4 py-2 text-sm font-medium text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 transition-colors"
                    >
                        Clear all selected
                    </button>
                    {children}
                </div>
            </div>
        </div>
    );
}
