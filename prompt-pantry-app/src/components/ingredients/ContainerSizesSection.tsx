import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import type { ContainerSize } from '../../types';

interface ContainerSizesSectionProps {
    open: boolean;
    onToggleOpen: () => void;
    containerSizes: ContainerSize[];
    onUpdate: (index: number, field: keyof ContainerSize, value: number | string) => void;
    onAdd: () => void;
    onRemove: (index: number) => void;
}

export function ContainerSizesSection({
    open,
    onToggleOpen,
    containerSizes,
    onUpdate,
    onAdd,
    onRemove
}: ContainerSizesSectionProps) {
    return (
        <div>
            <button
                type="button"
                onClick={onToggleOpen}
                className="flex items-center gap-2 w-full text-left"
            >
                {open ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Container Sizes
                </span>
                {containerSizes.length > 0 && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        {containerSizes.length} size{containerSizes.length === 1 ? '' : 's'}
                    </span>
                )}
            </button>
            {open && (
                <div className="mt-2 space-y-2 pl-6">
                    {containerSizes.map((size, index) => (
                        <div key={index} className="flex flex-wrap items-center gap-2">
                            <input
                                type="number"
                                min={0.01}
                                step={0.1}
                                value={size.quantity || ''}
                                onChange={(e) =>
                                    onUpdate(
                                        index,
                                        'quantity',
                                        e.target.value === '' ? 0 : parseFloat(e.target.value)
                                    )
                                }
                                className="w-20 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                                placeholder="Qty"
                            />
                            <input
                                type="text"
                                value={size.unit || ''}
                                onChange={(e) => onUpdate(index, 'unit', e.target.value)}
                                className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                                placeholder="Unit"
                            />
                            <input
                                type="text"
                                value={size.label || ''}
                                onChange={(e) => onUpdate(index, 'label', e.target.value)}
                                className="flex-1 min-w-[80px] px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                                placeholder="Label (e.g. gallon)"
                            />
                            <button
                                type="button"
                                onClick={() => onRemove(index)}
                                className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                                title="Remove"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ))}
                    <button
                        type="button"
                        onClick={onAdd}
                        className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center"
                    >
                        <Plus className="h-4 w-4 mr-1" />
                        Add Container Size
                    </button>
                </div>
            )}
        </div>
    );
}
