import type React from 'react';
import {useEffect, useRef, useState} from 'react';
import {IngredientDefinition, StoreSectionDefinition} from '../types';
import type {AliasUpdateResult} from '../hooks/useIngredients';
import { Package, Tag, MapPin, BookOpen, X, Loader2 } from 'lucide-react';
import { AliasChipList } from './AliasChipList';
import { AliasDeleteDialog } from './ingredients/AliasDeleteDialog';
import { AliasMergeDialog } from './ingredients/AliasMergeDialog';

interface IngredientDetailPopupProps {
    ingredient: IngredientDefinition;
    onClose: () => void;
    onCheckUsage: (id: string) => Promise<{ recipeCount: number; recipeNames: string[] } | null>;
    onRecipeClick?: (recipeName: string) => void;
    canEdit?: boolean;
    /** Alias management (when set, edit/add/merge happen in the popup) */
    onCheckAliasUsage?: (ingredientId: string, aliasText: string) => Promise<{ recipeCount: number; recipeNames: string[] } | null>;
    onUpdateAlias?: (ingredientId: string, aliasIndex: number, newAlias: string, updateRecipes: boolean) => Promise<AliasUpdateResult>;
    onDeleteAlias?: (ingredientId: string, aliasIndex: number, options?: { useCanonicalName?: boolean; replacementAlias?: string }) => Promise<AliasUpdateResult>;
    onMergeAlias?: (ingredientId: string, sourceIndex: number, targetIndex: number | 'canonical') => Promise<AliasUpdateResult>;
    onSave?: (ingredient: Partial<IngredientDefinition> & { name: string; storeSectionId: string }, isNew: boolean) => Promise<{ success: boolean; error?: string; ingredient?: IngredientDefinition }>;
    onIngredientUpdated?: (ingredient: IngredientDefinition) => void;
    storeSections?: StoreSectionDefinition[];
}

export function IngredientDetailPopup({
    ingredient,
    onClose,
    onCheckUsage,
    onRecipeClick,
    canEdit,
    onCheckAliasUsage,
    onUpdateAlias,
    onDeleteAlias,
    onMergeAlias,
    onSave,
    onIngredientUpdated,
    storeSections = []
}: IngredientDetailPopupProps) {
    const [usage, setUsage] = useState<{ recipeCount: number; recipeNames: string[] } | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    // Alias management state
    const [editingAliasIndex, setEditingAliasIndex] = useState<number | null>(null);
    const [editingAliasValue, setEditingAliasValue] = useState('');
    const [aliasDeleteState, setAliasDeleteState] = useState<{
        ingredientId: string;
        ingredientName: string;
        aliasIndex: number;
        aliasText: string;
        recipeCount: number;
        recipeNames: string[];
    } | null>(null);
    const [aliasMergeState, setAliasMergeState] = useState<{
        ingredientId: string;
        ingredientName: string;
        sourceIndex: number;
        sourceText: string;
        aliasOptions: { value: number | 'canonical'; label: string }[];
    } | null>(null);
    const [aliasActionError, setAliasActionError] = useState<string | null>(null);
    const [aliasDeleteReplacement, setAliasDeleteReplacement] = useState('');
    const [aliasMergeTarget, setAliasMergeTarget] = useState<number | 'canonical' | null>(null);
    const [newAliasInput, setNewAliasInput] = useState('');
    const [isAddingAlias, setIsAddingAlias] = useState(false);
    const contentRef = useRef<HTMLDivElement>(null);

    const aliases = ingredient.aliases || [];
    const hasAliasApis = Boolean(
        canEdit &&
        onCheckAliasUsage &&
        onUpdateAlias &&
        onDeleteAlias &&
        onMergeAlias &&
        onIngredientUpdated
    );

    useEffect(() => {
        const fetchUsage = async () => {
            setIsLoading(true);
            const result = await onCheckUsage(ingredient.id);
            setUsage(result);
            setIsLoading(false);
        };
        fetchUsage();
    }, [ingredient.id, onCheckUsage]);

    useEffect(() => {
        const t = setTimeout(() => {
            const first = contentRef.current?.querySelector<HTMLInputElement | HTMLTextAreaElement>('input:not([type="hidden"]), textarea');
            first?.focus();
        }, 0);
        return () => clearTimeout(t);
    }, [ingredient.id]);

    // Close on escape (close dialogs first, then popup)
    useEffect(() => {
        const handleEscape = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (aliasMergeState) {
                    setAliasMergeState(null);
                    setAliasMergeTarget(null);
                } else if (aliasDeleteState) {
                    setAliasDeleteState(null);
                    setAliasDeleteReplacement('');
                } else {
                    onClose();
                }
            }
        };
        document.addEventListener('keydown', handleEscape);
        return () => document.removeEventListener('keydown', handleEscape);
    }, [onClose, aliasMergeState, aliasDeleteState]);

    const handleBackdropClick = (e: React.MouseEvent) => {
        if (e.target === e.currentTarget && !aliasMergeState && !aliasDeleteState) {
            onClose();
        }
    };

    const startEditAlias = (index: number) => {
        setEditingAliasIndex(index);
        setEditingAliasValue(aliases[index] ?? '');
        setAliasActionError(null);
    };

    const cancelEditAlias = () => {
        setEditingAliasIndex(null);
        setEditingAliasValue('');
        setAliasActionError(null);
    };

    const saveEditAlias = async () => {
        if (editingAliasIndex == null || !onUpdateAlias || !onIngredientUpdated) return;
        const trimmed = editingAliasValue.trim();
        if (!trimmed) {
            setAliasActionError('Alias cannot be empty');
            return;
        }
        const current = aliases[editingAliasIndex];
        if (current?.trim().toLowerCase() === trimmed.toLowerCase()) {
            cancelEditAlias();
            return;
        }
        setAliasActionError(null);
        const result = await onUpdateAlias(ingredient.id, editingAliasIndex, trimmed, true);
        if (result.success && result.ingredient) {
            onIngredientUpdated(result.ingredient);
            cancelEditAlias();
        } else {
            setAliasActionError(result.error ?? 'Failed to update alias');
        }
    };

    const handleDeleteAliasClick = async (aliasIndex: number) => {
        if (!onCheckAliasUsage || !onDeleteAlias || !onIngredientUpdated) return;
        const aliasText = aliases[aliasIndex];
        if (!aliasText?.trim()) return;
        const usageResult = await onCheckAliasUsage(ingredient.id, aliasText.trim());
        const recipeCount = usageResult?.recipeCount ?? 0;
        const recipeNames = usageResult?.recipeNames ?? [];
        if (recipeCount > 0) {
            setAliasDeleteState({
                ingredientId: ingredient.id,
                ingredientName: ingredient.name,
                aliasIndex,
                aliasText: aliasText.trim(),
                recipeCount,
                recipeNames
            });
            setAliasDeleteReplacement(ingredient.name);
            setAliasActionError(null);
        } else {
            const result = await onDeleteAlias(ingredient.id, aliasIndex);
            if (result.success && result.ingredient) {
                onIngredientUpdated(result.ingredient);
            } else {
                setAliasActionError(result.error ?? 'Failed to delete alias');
            }
        }
    };

    const confirmAliasDeleteWithReplacement = async (useCanonicalName: boolean, replacementAlias?: string) => {
        if (!aliasDeleteState || !onDeleteAlias || !onIngredientUpdated) return;
        const { ingredientId, aliasIndex } = aliasDeleteState;
        const options = useCanonicalName ? { useCanonicalName: true } : { replacementAlias: replacementAlias ?? '' };
        const result = await onDeleteAlias(ingredientId, aliasIndex, options);
        if (result.success && result.ingredient) {
            onIngredientUpdated(result.ingredient);
        } else if (!result.success) {
            setAliasActionError(result.error ?? 'Failed to delete alias');
        }
        setAliasDeleteState(null);
        setAliasDeleteReplacement('');
    };

    const handleMergeAliasClick = (aliasIndex: number) => {
        if (!onMergeAlias) return;
        const sourceText = aliases[aliasIndex];
        if (!sourceText?.trim()) return;
        const options: { value: number | 'canonical'; label: string }[] = [
            { value: 'canonical', label: `${ingredient.name} (canonical name)` }
        ];
        aliases.forEach((a, i) => {
            if (i !== aliasIndex && a?.trim()) options.push({ value: i, label: a });
        });
        if (options.length <= 1) return;
        setAliasMergeState({
            ingredientId: ingredient.id,
            ingredientName: ingredient.name,
            sourceIndex: aliasIndex,
            sourceText: sourceText.trim(),
            aliasOptions: options
        });
        setAliasMergeTarget(options[0]?.value ?? null);
        setAliasActionError(null);
    };

    const confirmAliasMerge = async (targetValue: number | 'canonical') => {
        if (!aliasMergeState || !onMergeAlias || !onIngredientUpdated) return;
        const { ingredientId, sourceIndex } = aliasMergeState;
        const result = await onMergeAlias(ingredientId, sourceIndex, targetValue);
        if (result.success && result.ingredient) {
            onIngredientUpdated(result.ingredient);
        } else if (!result.success) {
            setAliasActionError(result.error ?? 'Failed to merge alias');
        }
        setAliasMergeState(null);
        setAliasMergeTarget(null);
    };

    const handleAddAlias = async () => {
        const trimmed = newAliasInput.trim();
        if (!trimmed || !onSave || !onIngredientUpdated) return;
        const nameLower = ingredient.name.toLowerCase();
        if (trimmed.toLowerCase() === nameLower) {
            setAliasActionError('Alias cannot match the ingredient name');
            return;
        }
        if (aliases.some(a => a.trim().toLowerCase() === trimmed.toLowerCase())) {
            setAliasActionError('This alias already exists');
            return;
        }
        setAliasActionError(null);
        setIsAddingAlias(true);
        const updatedIngredient = {
            ...ingredient,
            name: ingredient.name,
            aliases: [...aliases, trimmed]
        };
        const result = await onSave(updatedIngredient, false);
        setIsAddingAlias(false);
        if (result.success && result.ingredient) {
            onIngredientUpdated(result.ingredient);
            setNewAliasInput('');
        } else {
            setAliasActionError(result.error ?? 'Failed to add alias');
        }
    };

    return (
        <div
            className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
            onClick={handleBackdropClick}
        >
            <div className="bg-white dark:bg-gray-900 rounded-xl shadow-xl max-w-lg w-full max-h-[85vh] overflow-hidden flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                        <Package className="h-6 w-6 text-indigo-600" />
                        <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                            {ingredient.name}
                        </h2>
                    </div>
                    <button
                        onClick={onClose}
                        aria-label="Close"
                        className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition-colors rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
                    >
                        <X className="h-5 w-5" />
                    </button>
                </div>

                {/* Content */}
                <div ref={contentRef} className="flex-1 overflow-y-auto p-4 space-y-4">
                    {/* Store Section */}
                    <div className="flex items-center gap-2">
                        <MapPin className="h-4 w-4 text-gray-400" />
                        <span className="text-sm text-gray-500 dark:text-gray-400">Store Section:</span>
                        <span className="px-2 py-0.5 text-sm font-medium rounded-full bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400">
                            {storeSections.find(s => s.id === ingredient.storeSectionId)?.name ?? ingredient.storeSectionId}
                        </span>
                    </div>

                    {/* Aliases */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <Tag className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Aliases {aliases.length > 0 ? `(${aliases.length})` : ''}
                            </span>
                        </div>
                        {hasAliasApis ? (
                            <AliasChipList
                                aliases={aliases}
                                editingIndex={editingAliasIndex}
                                editingValue={editingAliasValue}
                                onEditingValueChange={setEditingAliasValue}
                                onStartEdit={startEditAlias}
                                onSaveEdit={saveEditAlias}
                                onCancelEdit={cancelEditAlias}
                                onDelete={handleDeleteAliasClick}
                                onMerge={handleMergeAliasClick}
                                addMode={onSave ? 'inline' : 'none'}
                                newAliasInput={newAliasInput}
                                onNewAliasInputChange={setNewAliasInput}
                                onAddAliasSubmit={handleAddAlias}
                                isAddingAlias={isAddingAlias}
                            />
                        ) : (
                            <>
                                {aliases.length > 0 ? (
                                    <div className="flex flex-wrap gap-2">
                                        {aliases.map((a, i) => (
                                            <span key={i} className="px-2 py-1 text-sm bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-lg">
                                                {a}
                                            </span>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-sm text-gray-500 dark:text-gray-400 italic">No aliases.</p>
                                )}
                            </>
                        )}
                        {aliasActionError && (
                            <p className="mt-1 text-sm text-red-600 dark:text-red-400">{aliasActionError}</p>
                        )}
                    </div>

                    {/* Recipes */}
                    <div>
                        <div className="flex items-center gap-2 mb-2">
                            <BookOpen className="h-4 w-4 text-gray-400" />
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                                Used in Recipes {usage && `(${usage.recipeCount})`}
                            </span>
                        </div>
                        {isLoading ? (
                            <div className="flex items-center justify-center py-4">
                                <Loader2 className="h-5 w-5 text-indigo-600 animate-spin" />
                                <span className="ml-2 text-sm text-gray-500">Loading recipes...</span>
                            </div>
                        ) : usage && usage.recipeCount > 0 ? (
                            <div className="space-y-1">
                                {usage.recipeNames.map((recipeName, index) => (
                                    <button
                                        key={index}
                                        onClick={() => onRecipeClick?.(recipeName)}
                                        className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 hover:text-indigo-700 dark:hover:text-indigo-300 rounded-lg transition-colors"
                                    >
                                        {recipeName}
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <p className="text-sm text-gray-500 dark:text-gray-400 italic py-2">
                                This ingredient is not used in any recipes.
                            </p>
                        )}
                    </div>
                </div>

                {/* Footer */}
                <div className="p-4 border-t border-gray-200 dark:border-gray-700">
                    <button
                        onClick={onClose}
                        className="w-full px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 rounded-lg font-medium hover:bg-gray-200 dark:hover:bg-gray-700 transition-colors"
                    >
                        Close
                    </button>
                </div>
            </div>

            {aliasDeleteState && (
                <AliasDeleteDialog
                    ingredientName={aliasDeleteState.ingredientName}
                    aliasText={aliasDeleteState.aliasText}
                    recipeCount={aliasDeleteState.recipeCount}
                    replacementOptions={[aliasDeleteState.ingredientName, ...aliases.filter(a => a?.trim() && a.trim() !== aliasDeleteState.aliasText)]}
                    replacementValue={aliasDeleteReplacement}
                    onReplacementChange={setAliasDeleteReplacement}
                    onReplaceWithCanonical={() => confirmAliasDeleteWithReplacement(true)}
                    onReplaceWithSelected={(replacement) => confirmAliasDeleteWithReplacement(false, replacement)}
                    onCancel={() => { setAliasDeleteState(null); setAliasDeleteReplacement(''); }}
                />
            )}

            {aliasMergeState && (
                <AliasMergeDialog
                    sourceText={aliasMergeState.sourceText}
                    aliasOptions={aliasMergeState.aliasOptions}
                    selectedTarget={aliasMergeTarget}
                    onTargetChange={setAliasMergeTarget}
                    onConfirm={() => aliasMergeTarget !== null && confirmAliasMerge(aliasMergeTarget)}
                    onCancel={() => { setAliasMergeState(null); setAliasMergeTarget(null); }}
                />
            )}
        </div>
    );
}
