interface AliasDeleteDialogProps {
    ingredientName: string;
    aliasText: string;
    recipeCount: number;
    replacementOptions: string[];
    replacementValue: string;
    onReplacementChange: (value: string) => void;
    onReplaceWithCanonical: () => void;
    onReplaceWithSelected: (replacement: string) => void;
    onCancel: () => void;
}

export function AliasDeleteDialog({
    ingredientName,
    aliasText,
    recipeCount,
    replacementOptions,
    replacementValue,
    onReplacementChange,
    onReplaceWithCanonical,
    onReplaceWithSelected,
    onCancel
}: AliasDeleteDialogProps) {
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
                    Delete alias
                </h3>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                    This alias &quot;{aliasText}&quot; is used in {recipeCount} recipe
                    {recipeCount === 1 ? '' : 's'}. Choose how to handle:
                </p>
                <div className="flex flex-col gap-2">
                    <button
                        type="button"
                        onClick={onReplaceWithCanonical}
                        className="w-full px-4 py-2 text-left rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                    >
                        Replace with canonical name (&quot;{ingredientName}&quot;)
                    </button>
                    <div className="flex gap-2 items-center">
                        <label className="text-sm text-gray-600 dark:text-gray-400 shrink-0">
                            Replace with:
                        </label>
                        <select
                            value={replacementValue}
                            onChange={(e) => onReplacementChange(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-sm"
                        >
                            <option value={ingredientName}>
                                {ingredientName} (canonical)
                            </option>
                            {replacementOptions.map((a, i) => (
                                <option key={i} value={a}>
                                    {a}
                                </option>
                            ))}
                        </select>
                    </div>
                    <button
                        type="button"
                        onClick={() => onReplaceWithSelected(replacementValue)}
                        className="w-full px-4 py-2 rounded-lg bg-indigo-600 text-white hover:bg-indigo-700 transition-colors text-sm font-medium"
                    >
                        Replace with selected
                    </button>
                </div>
                <div className="flex justify-end pt-2">
                    <button
                        type="button"
                        onClick={onCancel}
                        className="px-4 py-2 text-gray-600 dark:text-gray-400 hover:text-gray-800 dark:hover:text-gray-200"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
