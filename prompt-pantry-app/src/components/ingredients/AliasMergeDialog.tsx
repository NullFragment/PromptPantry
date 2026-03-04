interface AliasMergeOption {
    value: number | 'canonical';
    label: string;
}

interface AliasMergeDialogProps {
    sourceText: string;
    aliasOptions: AliasMergeOption[];
    selectedTarget: number | 'canonical' | null;
    onTargetChange: (value: number | 'canonical') => void;
    onConfirm: () => void;
    onCancel: () => void;
}

export function AliasMergeDialog({
    sourceText,
    aliasOptions,
    selectedTarget,
    onTargetChange,
    onConfirm,
    onCancel
}: AliasMergeDialogProps) {
    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
            onClick={onCancel}
        >
            <div
                className="bg-white dark:bg-gray-800 rounded-xl shadow-xl max-w-md w-full p-5 space-y-4"
                onClick={(e) => e.stopPropagation()}
            >
                <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100">
                    Merge alias
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    Merge &quot;{sourceText}&quot; into:
                </p>
                <div className="space-y-2">
                    {aliasOptions.map((opt) => (
                        <label
                            key={opt.value === 'canonical' ? 'canonical' : opt.value}
                            className="flex items-center gap-2 cursor-pointer"
                        >
                            <input
                                type="radio"
                                name="merge-target"
                                checked={selectedTarget === opt.value}
                                onChange={() => onTargetChange(opt.value)}
                                className="text-indigo-600"
                            />
                            <span className="text-gray-800 dark:text-gray-200">
                                {opt.label}
                            </span>
                        </label>
                    ))}
                </div>
                <p className="text-xs text-gray-500 dark:text-gray-500">
                    Recipes using this alias will be updated.
                </p>
                <div className="flex justify-end gap-2 pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200 rounded-lg"
                    >
                        Cancel
                    </button>
                    <button
                        type="button"
                        onClick={onConfirm}
                        disabled={selectedTarget === null}
                        className="px-4 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 font-medium"
                    >
                        Merge
                    </button>
                </div>
            </div>
        </div>
    );
}
