import {useEffect, useState} from 'react';
import {IngredientDefinition} from '../types';
import {GitMerge, Loader2, X} from 'lucide-react';

interface IngredientMergeDialogProps {
    ingredients: IngredientDefinition[];
    selectedIds: string[];
    onMerge: (sourceIds: string[], targetId: string) => Promise<{ success: boolean; message?: string; updatedRecipeCount?: number }>;
    onCheckUsage: (id: string) => Promise<{ recipeCount: number; recipeNames: string[] } | null>;
    onClose: () => void;
}

export function IngredientMergeDialog({
    ingredients,
    selectedIds,
    onMerge,
    onCheckUsage,
    onClose
}: IngredientMergeDialogProps) {
    const [targetId, setTargetId] = useState<string | null>(null);
    const [usageCounts, setUsageCounts] = useState<Map<string, number>>(new Map());
    const [isLoadingUsage, setIsLoadingUsage] = useState(true);
    const [isMerging, setIsMerging] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const selectedIngredients = ingredients.filter(ing => selectedIds.includes(ing.id));

    // Fetch usage counts on mount
    useEffect(() => {
        const fetchUsageCounts = async () => {
            setIsLoadingUsage(true);
            const counts = new Map<string, number>();
            
            for (const id of selectedIds) {
                const usage = await onCheckUsage(id);
                if (usage) {
                    counts.set(id, usage.recipeCount);
                }
            }
            
            setUsageCounts(counts);
            setIsLoadingUsage(false);
        };
        
        fetchUsageCounts();
    }, [selectedIds, onCheckUsage]);

    // Handle escape key
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !isMerging) {
                onClose();
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, isMerging]);

    const sourceIds = selectedIds.filter(id => id !== targetId);
    const targetIngredient = targetId ? ingredients.find(ing => ing.id === targetId) : null;
    const sourceIngredients = ingredients.filter(ing => sourceIds.includes(ing.id));

    // Calculate aliases that will be added
    const aliasesToAdd = new Set<string>();
    sourceIngredients.forEach(ing => {
        // Add the ingredient name as an alias
        aliasesToAdd.add(ing.name);
        // Add existing aliases
        ing.aliases?.forEach(alias => aliasesToAdd.add(alias));
    });
    // Remove any that already exist in target
    if (targetIngredient) {
        aliasesToAdd.delete(targetIngredient.name);
        targetIngredient.aliases?.forEach(alias => aliasesToAdd.delete(alias));
    }

    // Calculate total recipe count that will be updated
    const totalRecipeCount = sourceIds.reduce((sum, id) => sum + (usageCounts.get(id) || 0), 0);

    const handleMerge = async () => {
        if (!targetId || sourceIds.length === 0) return;
        
        setIsMerging(true);
        setError(null);
        
        const result = await onMerge(sourceIds, targetId);
        
        if (result.success) {
            onClose();
        } else {
            setError(result.message || 'Failed to merge ingredients');
            setIsMerging(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div 
                className="fixed inset-0 bg-black/60 backdrop-blur-md" 
                onClick={!isMerging ? onClose : undefined}
            />
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 transition-colors">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        disabled={isMerging}
                        className="absolute top-4 right-4 p-1 hover:bg-white/20 dark:hover:bg-gray-700/50 rounded-lg transition-colors disabled:opacity-50"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <GitMerge className="h-10 w-10 mb-3 opacity-50" />
                    <h3 className="text-xl font-black leading-tight">
                        Merge {selectedIds.length} Ingredients
                    </h3>
                    <p className="text-indigo-100 mt-2 text-sm font-medium">
                        Select the target ingredient. All others will be merged into it.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {/* Target Selection */}
                    <div className="mb-6">
                        <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-2">
                            Select Target Ingredient
                        </label>
                        <div className="space-y-2">
                            {selectedIngredients.map(ing => (
                                <label
                                    key={ing.id}
                                    className={`flex items-center p-3 rounded-lg border cursor-pointer transition-colors ${
                                        targetId === ing.id
                                            ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-900/30'
                                            : 'border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800'
                                    }`}
                                >
                                    <input
                                        type="radio"
                                        name="targetIngredient"
                                        value={ing.id}
                                        checked={targetId === ing.id}
                                        onChange={() => setTargetId(ing.id)}
                                        className="sr-only"
                                    />
                                    <div className={`w-4 h-4 rounded-full border-2 mr-3 flex items-center justify-center ${
                                        targetId === ing.id
                                            ? 'border-indigo-500 bg-indigo-500'
                                            : 'border-gray-300 dark:border-gray-600'
                                    }`}>
                                        {targetId === ing.id && (
                                            <div className="w-2 h-2 rounded-full bg-white" />
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <span className="font-medium text-gray-900 dark:text-gray-100">
                                            {ing.name}
                                        </span>
                                        <span className="ml-2 text-xs text-gray-500 dark:text-gray-400">
                                            {ing.storeSectionId}
                                        </span>
                                        {isLoadingUsage ? (
                                            <Loader2 className="inline ml-2 h-3 w-3 animate-spin text-gray-400" />
                                        ) : (
                                            <span className="ml-2 text-xs text-gray-400">
                                                ({usageCounts.get(ing.id) || 0} recipes)
                                            </span>
                                        )}
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Preview */}
                    {targetId && (
                        <div className="space-y-4 border-t border-gray-200 dark:border-gray-700 pt-4">
                            <div>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Target
                                </span>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                    {targetIngredient?.name}
                                </p>
                            </div>

                            <div>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Will be merged ({sourceIngredients.length})
                                </span>
                                <p className="text-gray-600 dark:text-gray-400 text-sm">
                                    {sourceIngredients.map(ing => ing.name).join(', ')}
                                </p>
                            </div>

                            {aliasesToAdd.size > 0 && (
                                <div>
                                    <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                        Aliases to be added ({aliasesToAdd.size})
                                    </span>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {[...aliasesToAdd].slice(0, 10).map(alias => (
                                            <span
                                                key={alias}
                                                className="px-2 py-0.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 rounded"
                                            >
                                                {alias}
                                            </span>
                                        ))}
                                        {aliasesToAdd.size > 10 && (
                                            <span className="px-2 py-0.5 text-xs text-gray-400">
                                                +{aliasesToAdd.size - 10} more
                                            </span>
                                        )}
                                    </div>
                                </div>
                            )}

                            <div>
                                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                                    Recipes to be updated
                                </span>
                                <p className="text-gray-900 dark:text-gray-100 font-medium">
                                    {isLoadingUsage ? (
                                        <Loader2 className="inline h-4 w-4 animate-spin" />
                                    ) : (
                                        totalRecipeCount
                                    )}
                                </p>
                            </div>
                        </div>
                    )}

                    {/* Error */}
                    {error && (
                        <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 text-sm rounded-lg">
                            {error}
                        </div>
                    )}
                </div>

                {/* Actions */}
                <div className="p-6 border-t border-gray-200 dark:border-gray-700 flex flex-col gap-3">
                    <button
                        onClick={handleMerge}
                        disabled={!targetId || isMerging || isLoadingUsage}
                        className="w-full py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition-all shadow-md disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                        {isMerging ? (
                            <>
                                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                                Merging...
                            </>
                        ) : (
                            <>
                                <GitMerge className="h-4 w-4 mr-2" />
                                Merge Ingredients
                            </>
                        )}
                    </button>
                    <button
                        onClick={onClose}
                        disabled={isMerging}
                        className="w-full py-2 text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors disabled:opacity-50"
                    >
                        Cancel
                    </button>
                </div>
            </div>
        </div>
    );
}
