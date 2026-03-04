import { useState, useCallback } from 'react';
import type { IngredientDefinition } from '../types';
import type { AliasUpdateResult } from './useIngredients';
import type { ConfirmationState } from './useConfirmation';

interface FormDataWithAliases {
    aliases: string[];
    [key: string]: unknown;
}

export interface AliasDeleteState {
    ingredientId: string;
    ingredientName: string;
    aliasIndex: number;
    aliasText: string;
    recipeCount: number;
    recipeNames: string[];
}

export interface AliasMergeState {
    ingredientId: string;
    ingredientName: string;
    sourceIndex: number;
    sourceText: string;
    aliasOptions: { value: number | 'canonical'; label: string }[];
}

interface UseAliasManagementParams {
    editingId: string | null;
    ingredients: IngredientDefinition[];
    formData: FormDataWithAliases;
    setFormData: React.Dispatch<React.SetStateAction<any>>;
    onCheckAliasUsage?: (ingredientId: string, aliasText: string) => Promise<{ recipeCount: number; recipeNames: string[] } | null>;
    onUpdateAlias?: (ingredientId: string, aliasIndex: number, newAlias: string, updateRecipes: boolean) => Promise<AliasUpdateResult>;
    onDeleteAlias?: (ingredientId: string, aliasIndex: number, options?: { useCanonicalName?: boolean; replacementAlias?: string }) => Promise<AliasUpdateResult>;
    onMergeAlias?: (ingredientId: string, sourceIndex: number, targetIndex: number | 'canonical') => Promise<AliasUpdateResult>;
    showConfirmation: (state: ConfirmationState) => void;
    dismissConfirmation: () => void;
}

export function useAliasManagement({
    editingId,
    ingredients,
    formData,
    setFormData,
    onCheckAliasUsage,
    onUpdateAlias,
    onDeleteAlias,
    onMergeAlias,
    showConfirmation,
    dismissConfirmation
}: UseAliasManagementParams) {
    const [editingAliasIndex, setEditingAliasIndex] = useState<number | null>(null);
    const [editingAliasValue, setEditingAliasValue] = useState('');
    const [aliasDeleteState, setAliasDeleteState] = useState<AliasDeleteState | null>(null);
    const [aliasMergeState, setAliasMergeState] = useState<AliasMergeState | null>(null);
    const [aliasActionError, setAliasActionError] = useState<string | null>(null);
    const [aliasDeleteReplacement, setAliasDeleteReplacement] = useState<string>('');
    const [aliasMergeTarget, setAliasMergeTarget] = useState<number | 'canonical' | null>(null);

    const hasAliasApis = Boolean(editingId && onCheckAliasUsage && onUpdateAlias && onDeleteAlias && onMergeAlias);

    const resetAliasState = useCallback(() => {
        setEditingAliasIndex(null);
        setAliasDeleteState(null);
        setAliasMergeState(null);
        setAliasActionError(null);
    }, []);

    const startEditAlias = useCallback((index: number) => {
        setEditingAliasIndex(index);
        setEditingAliasValue(formData.aliases[index] ?? '');
        setAliasActionError(null);
    }, [formData.aliases]);

    const cancelEditAlias = useCallback(() => {
        setEditingAliasIndex(null);
        setEditingAliasValue('');
        setAliasActionError(null);
    }, []);

    const saveEditAlias = useCallback(async () => {
        if (editingId == null || editingAliasIndex == null || !onUpdateAlias) return;
        const trimmed = editingAliasValue.trim();
        if (!trimmed) {
            setAliasActionError('Alias cannot be empty');
            return;
        }
        const current = formData.aliases[editingAliasIndex];
        if (current?.trim().toLowerCase() === trimmed.toLowerCase()) {
            cancelEditAlias();
            return;
        }
        setAliasActionError(null);
        const result = await onUpdateAlias(editingId, editingAliasIndex, trimmed, true);
        if (result.success) {
            if (result.ingredient?.aliases) {
                setFormData((prev: FormDataWithAliases) => ({ ...prev, aliases: result.ingredient!.aliases ?? prev.aliases }));
            }
            cancelEditAlias();
        } else {
            setAliasActionError(result.error ?? 'Failed to update alias');
        }
    }, [editingId, editingAliasIndex, editingAliasValue, formData.aliases, onUpdateAlias, setFormData, cancelEditAlias]);

    const handleDeleteAliasClick = useCallback(async (aliasIndex: number) => {
        if (!editingId || !onCheckAliasUsage || !onDeleteAlias) return;
        const aliasText = formData.aliases[aliasIndex];
        if (!aliasText?.trim()) return;
        const usage = await onCheckAliasUsage(editingId, aliasText.trim());
        const recipeCount = usage?.recipeCount ?? 0;
        const recipeNames = usage?.recipeNames ?? [];
        const ingredient = ingredients.find(i => i.id === editingId);
        if (recipeCount > 0) {
            setAliasDeleteState({
                ingredientId: editingId,
                ingredientName: ingredient?.name ?? '',
                aliasIndex,
                aliasText: aliasText.trim(),
                recipeCount,
                recipeNames
            });
            setAliasDeleteReplacement(ingredient?.name ?? '');
            setAliasActionError(null);
        } else {
            showConfirmation({
                title: 'Delete alias',
                message: `Remove alias "${aliasText}"?`,
                confirmLabel: 'Delete',
                variant: 'danger',
                onConfirm: async () => {
                    const result = await onDeleteAlias(editingId, aliasIndex);
                    if (result.success && result.ingredient?.aliases) {
                        setFormData((prev: FormDataWithAliases) => ({ ...prev, aliases: result.ingredient!.aliases ?? prev.aliases }));
                    } else if (!result.success) {
                        setAliasActionError(result.error ?? 'Failed to delete alias');
                    }
                    dismissConfirmation();
                },
                onCancel: () => dismissConfirmation()
            });
        }
    }, [editingId, formData.aliases, ingredients, onCheckAliasUsage, onDeleteAlias, setFormData, showConfirmation, dismissConfirmation]);

    const confirmAliasDeleteWithReplacement = useCallback(async (useCanonicalName: boolean, replacementAlias?: string) => {
        if (!aliasDeleteState || !onDeleteAlias) return;
        const { ingredientId, aliasIndex } = aliasDeleteState;
        const options = useCanonicalName ? { useCanonicalName: true } : { replacementAlias: replacementAlias ?? '' };
        const result = await onDeleteAlias(ingredientId, aliasIndex, options);
        if (result.success && result.ingredient?.aliases !== undefined) {
            setFormData((prev: FormDataWithAliases) => ({ ...prev, aliases: result.ingredient!.aliases ?? prev.aliases }));
        } else if (!result.success) {
            setAliasActionError(result.error ?? 'Failed to delete alias');
        }
        setAliasDeleteState(null);
        setAliasDeleteReplacement('');
    }, [aliasDeleteState, onDeleteAlias, setFormData]);

    const handleMergeAliasClick = useCallback((aliasIndex: number) => {
        if (!editingId || !onMergeAlias) return;
        const sourceText = formData.aliases[aliasIndex];
        if (!sourceText?.trim()) return;
        const ingredient = ingredients.find(i => i.id === editingId);
        const name = ingredient?.name ?? '';
        const aliases = ingredient?.aliases ?? formData.aliases;
        const options: { value: number | 'canonical'; label: string }[] = [
            { value: 'canonical', label: `${name} (canonical name)` }
        ];
        aliases.forEach((a: string, i: number) => {
            if (i !== aliasIndex && a?.trim()) options.push({ value: i, label: a });
        });
        if (options.length <= 1) return;
        setAliasMergeState({
            ingredientId: editingId,
            ingredientName: name,
            sourceIndex: aliasIndex,
            sourceText: sourceText.trim(),
            aliasOptions: options
        });
        setAliasMergeTarget(options[0]?.value ?? null);
        setAliasActionError(null);
    }, [editingId, formData.aliases, ingredients, onMergeAlias]);

    const confirmAliasMerge = useCallback(async (targetValue: number | 'canonical') => {
        if (!aliasMergeState || !onMergeAlias) return;
        const { ingredientId, sourceIndex } = aliasMergeState;
        const result = await onMergeAlias(ingredientId, sourceIndex, targetValue);
        if (result.success && result.ingredient?.aliases !== undefined) {
            setFormData((prev: FormDataWithAliases) => ({ ...prev, aliases: result.ingredient!.aliases ?? prev.aliases }));
        } else if (!result.success) {
            setAliasActionError(result.error ?? 'Failed to merge alias');
        }
        setAliasMergeState(null);
        setAliasMergeTarget(null);
    }, [aliasMergeState, onMergeAlias, setFormData]);

    const addAlias = useCallback(() => {
        const newIndex = formData.aliases.length;
        setFormData((prev: FormDataWithAliases) => ({
            ...prev,
            aliases: [...prev.aliases, '']
        }));
        setEditingAliasIndex(newIndex);
        setEditingAliasValue('');
    }, [formData.aliases.length, setFormData]);

    const updateAlias = useCallback((index: number, value: string) => {
        setFormData((prev: FormDataWithAliases) => {
            const newAliases = [...prev.aliases];
            newAliases[index] = value;
            return { ...prev, aliases: newAliases };
        });
    }, [setFormData]);

    const removeAlias = useCallback((index: number) => {
        setFormData((prev: FormDataWithAliases) => ({
            ...prev,
            aliases: prev.aliases.filter((_: string, i: number) => i !== index)
        }));
    }, [setFormData]);

    return {
        editingAliasIndex,
        editingAliasValue,
        setEditingAliasValue,
        aliasDeleteState,
        setAliasDeleteState,
        aliasMergeState,
        setAliasMergeState,
        aliasActionError,
        aliasDeleteReplacement,
        setAliasDeleteReplacement,
        aliasMergeTarget,
        setAliasMergeTarget,
        hasAliasApis,
        resetAliasState,
        startEditAlias,
        cancelEditAlias,
        saveEditAlias,
        handleDeleteAliasClick,
        confirmAliasDeleteWithReplacement,
        handleMergeAliasClick,
        confirmAliasMerge,
        addAlias,
        updateAlias,
        removeAlias
    };
}
