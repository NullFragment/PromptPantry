import { useEffect, useMemo, useState } from 'react';
import type { ContainerSize, IngredientDefinition } from '../types';
import {
    Check,
    ChevronDown,
    GitMerge,
    Package,
    Plus,
    Search,
    Square,
    Trash2,
    X
} from 'lucide-react';
import type { AliasUpdateResult } from '../hooks/useIngredients';
import { buildIngredientPayload, validateAliases } from '../utils/ingredientFormUtils';
import { normalizeStoreSection } from '../utils/storeSectionUtils';
import { AliasDeleteDialog } from './ingredients/AliasDeleteDialog';
import { AliasMergeDialog as AliasMergeDialogComponent } from './ingredients/AliasMergeDialog';
import { ConfirmationDialog } from './ConfirmationDialog';
import { IngredientCard } from './ingredients/IngredientCard';
import { IngredientEditForm } from './ingredients/IngredientEditForm';
import { DEFAULT_FORM_DATA, type EditFormData } from './ingredients/ingredientFormTypes';
import { IngredientMergeDialog } from './IngredientMergeDialog';
import { IngredientDetailPopup } from './IngredientDetailPopup';
import { SelectionActionBar } from './SelectionActionBar';
import { useAppContext } from '../hooks/useAppContext';
import { useConfirmation } from '../hooks/useConfirmation';
import { useAliasManagement } from '../hooks/useAliasManagement';

interface IngredientsToolbarProps {
    searchQuery: string;
    setSearchQuery: (query: string) => void;
    sectionFilter: string | null;
    setSectionFilter: (section: string | null) => void;
    storeSections: string[];
    canEdit: boolean;
    filteredCount: number;
    isAllSelected: boolean;
    selectAll: () => void;
    clearSelection: () => void;
}

function IngredientsToolbar({
    searchQuery, setSearchQuery, sectionFilter, setSectionFilter,
    storeSections, canEdit, filteredCount, isAllSelected, selectAll, clearSelection
}: IngredientsToolbarProps) {
    return (
        <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search ingredients..."
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                {searchQuery && (
                    <button
                        onClick={() => setSearchQuery('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
                    >
                        <X className="h-4 w-4" />
                    </button>
                )}
            </div>
            <div className="relative">
                <select
                    value={sectionFilter || ''}
                    onChange={(e) => setSectionFilter(e.target.value || null)}
                    className="appearance-none px-4 py-2 pr-10 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent min-w-[180px]"
                >
                    <option value="">All Sections</option>
                    {storeSections.map(section => (
                        <option key={section} value={section}>{section}</option>
                    ))}
                </select>
                <ChevronDown className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
            </div>
            {canEdit && filteredCount > 0 && (
                <button
                    onClick={isAllSelected ? clearSelection : selectAll}
                    className="flex items-center px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors text-sm font-medium"
                >
                    {isAllSelected ? (
                        <>
                            <Square className="h-4 w-4 mr-2" />
                            Deselect All
                        </>
                    ) : (
                        <>
                            <Check className="h-4 w-4 mr-2" />
                            Select All
                        </>
                    )}
                </button>
            )}
        </div>
    );
}

interface IngredientsProps {
    ingredients: IngredientDefinition[];
    storeSections: string[];
    onSave: (ingredient: Partial<IngredientDefinition> & { name: string; storeSection: string }, isNew: boolean) => Promise<{ success: boolean; error?: string }>;
    onDelete: (id: string) => Promise<{ success: boolean; error?: string }>;
    onCheckUsage: (id: string) => Promise<{ recipeCount: number; recipeNames: string[] } | null>;
    onMerge: (sourceIds: string[], targetId: string) => Promise<{ success: boolean; message?: string; updatedRecipeCount?: number; mergedIngredientCount?: number }>;
    onRecipeClick?: (recipeName: string) => void;
    onCheckAliasUsage?: (ingredientId: string, aliasText: string) => Promise<{ recipeCount: number; recipeNames: string[] } | null>;
    onUpdateAlias?: (ingredientId: string, aliasIndex: number, newAlias: string, updateRecipes: boolean) => Promise<AliasUpdateResult>;
    onDeleteAlias?: (ingredientId: string, aliasIndex: number, options?: { useCanonicalName?: boolean; replacementAlias?: string }) => Promise<AliasUpdateResult>;
    onMergeAlias?: (ingredientId: string, sourceIndex: number, targetIndex: number | 'canonical') => Promise<AliasUpdateResult>;
}

export function Ingredients({
    ingredients,
    storeSections,
    onSave,
    onDelete,
    onCheckUsage,
    onMerge,
    onRecipeClick,
    onCheckAliasUsage,
    onUpdateAlias,
    onDeleteAlias,
    onMergeAlias
}: IngredientsProps) {
    const { canEdit } = useAppContext();
    const [searchQuery, setSearchQuery] = useState('');
    const [sectionFilter, setSectionFilter] = useState<string | null>(null);
    const [editingId, setEditingId] = useState<string | null>(null);
    const [isAddingNew, setIsAddingNew] = useState(false);
    const [formData, setFormData] = useState<EditFormData>(DEFAULT_FORM_DATA);
    const [formError, setFormError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    // Selection state
    const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
    const [showMergeDialog, setShowMergeDialog] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [selectedIngredient, setSelectedIngredient] = useState<IngredientDefinition | null>(null);

    const { confirmation, show: showConfirmation, dismiss: dismissConfirmation } = useConfirmation();

    const aliasManagement = useAliasManagement({
        editingId,
        ingredients,
        formData,
        setFormData,
        onCheckAliasUsage,
        onUpdateAlias,
        onDeleteAlias: onDeleteAlias,
        onMergeAlias,
        showConfirmation,
        dismissConfirmation
    });
    const {
        editingAliasIndex,
        editingAliasValue,
        setEditingAliasValue: setEditingAliasValueFromHook,
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
    } = aliasManagement;
    const [containerSectionOpen, setContainerSectionOpen] = useState(true);
    const [conversionsSectionOpen, setConversionsSectionOpen] = useState(true);
    const [isBulkSettingSection, setIsBulkSettingSection] = useState(false);
    const [bulkSectionSelectValue, setBulkSectionSelectValue] = useState('');
    const [bulkSectionNewName, setBulkSectionNewName] = useState('');

    const filteredIngredients = useMemo(() => {
        return ingredients
            .filter(ing => {
                // Search filter
                if (searchQuery) {
                    const query = searchQuery.toLowerCase();
                    const matchesName = ing.name.toLowerCase().includes(query);
                    const matchesAlias = ing.aliases?.some(a => a.toLowerCase().includes(query));
                    if (!matchesName && !matchesAlias) return false;
                }
                // Section filter
                if (sectionFilter && ing.storeSection !== sectionFilter) return false;
                return true;
            })
            .sort((a, b) => a.name.localeCompare(b.name));
    }, [ingredients, searchQuery, sectionFilter]);

    // Clear selection when search query changes
    useEffect(() => {
        setSelectedIds(new Set());
    }, [searchQuery]);

    // Selection helpers
    const toggleSelection = (id: string) => {
        setSelectedIds(prev => {
            const next = new Set(prev);
            if (next.has(id)) {
                next.delete(id);
            } else {
                next.add(id);
            }
            return next;
        });
    };

    const selectAll = () => {
        setSelectedIds(new Set(filteredIngredients.map(i => i.id)));
    };

    const clearSelection = () => {
        setSelectedIds(new Set());
    };

    const isAllSelected = filteredIngredients.length > 0 && 
        filteredIngredients.every(ing => selectedIds.has(ing.id));

    // Delete selected handler
    const handleDeleteSelected = async () => {
        if (selectedIds.size === 0) return;

        setIsDeleting(true);

        const idsToCheck = [...selectedIds]
            .map(id => ({ id, ing: ingredients.find(i => i.id === id) }))
            .filter((entry): entry is { id: string; ing: IngredientDefinition } => !!entry.ing);

        const usageChecks = await Promise.all(
            idsToCheck.map(async ({ id, ing }) => {
                const usage = await onCheckUsage(id);
                return usage && usage.recipeCount > 0
                    ? { id, name: ing.name, count: usage.recipeCount }
                    : null;
            })
        );
        const usageResults = usageChecks.filter((r): r is { id: string; name: string; count: number } => r !== null);

        setIsDeleting(false);

        if (usageResults.length > 0) {
            // Some ingredients are in use
            const usageList = usageResults
                .slice(0, 5)
                .map(u => `• ${u.name}: used in ${u.count} recipe${u.count === 1 ? '' : 's'}`)
                .join('\n');
            const moreText = usageResults.length > 5 ? `\n...and ${usageResults.length - 5} more` : '';

            showConfirmation({
                title: 'Cannot Delete',
                message: `${usageResults.length} ingredient${usageResults.length === 1 ? ' is' : 's are'} used in recipes:\n\n${usageList}${moreText}\n\nRemove from selection or merge into another ingredient instead.`,
                confirmLabel: 'OK',
                cancelLabel: 'none',
                variant: 'info',
                onConfirm: () => dismissConfirmation()
            });
            return;
        }

        // None are in use, confirm deletion
        showConfirmation({
            title: 'Delete Ingredients',
            message: `Delete ${selectedIds.size} ingredient${selectedIds.size === 1 ? '' : 's'}? This cannot be undone.`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                for (const id of selectedIds) {
                    await onDelete(id);
                }
                clearSelection();
                dismissConfirmation();
            },
            onCancel: () => dismissConfirmation()
        });
    };

    // Merge handler
    const handleMerge = async (sourceIds: string[], targetId: string) => {
        const result = await onMerge(sourceIds, targetId);
        if (result.success) {
            clearSelection();
        }
        return result;
    };

    const BULK_SET_SECTION_LIMIT = 50;
    const handleBulkSetStoreSection = async (section: string) => {
        const normalized = normalizeStoreSection(section);
        if (!normalized || selectedIds.size === 0) return;
        if (selectedIds.size > BULK_SET_SECTION_LIMIT) return; // guard: avoid accidental bulk update of huge sets
        setIsBulkSettingSection(true);
        let allOk = true;
        for (const id of selectedIds) {
            const ing = ingredients.find(i => i.id === id);
            if (!ing) continue;
            const result = await onSave(
                { ...ing, name: ing.name, storeSection: normalized },
                false
            );
            if (!result.success) allOk = false;
        }
        setIsBulkSettingSection(false);
        if (allOk) clearSelection();
    };

    const handleBulkApplyNewSection = () => {
        const normalized = normalizeStoreSection(bulkSectionNewName);
        if (normalized) {
            handleBulkSetStoreSection(normalized);
            setBulkSectionSelectValue('');
            setBulkSectionNewName('');
        }
    };

    const startEditing = (ingredient: IngredientDefinition) => {
        if (!canEdit) return;
        setEditingId(ingredient.id);
        setIsAddingNew(false);
        setFormData({
            name: ingredient.name,
            storeSection: ingredient.storeSection,
            aliases: ingredient.aliases || [],
            containerSizes: ingredient.containerSizes ? [...ingredient.containerSizes] : [],
            conversions: ingredient.conversions ? { ...ingredient.conversions } : {},
            isNewSection: false,
            newSectionName: ''
        });
        setFormError(null);
    };

    const startAddingNew = () => {
        setIsAddingNew(true);
        setEditingId(null);
        setFormData({...DEFAULT_FORM_DATA});
        setFormError(null);
    };

    const cancelEditing = () => {
        setEditingId(null);
        setIsAddingNew(false);
        setFormData({...DEFAULT_FORM_DATA});
        setFormError(null);
        resetAliasState();
    };

    const handleSave = async () => {
        // Validation
        setFormError(null);

        const name = formData.name.trim();
        if (!name) {
            setFormError('Name is required');
            return;
        }

        const storeSectionInput = formData.isNewSection ? formData.newSectionName : formData.storeSection;
        const storeSection = normalizeStoreSection(storeSectionInput);

        if (!storeSection) {
            setFormError('Store section is required');
            return;
        }

        const aliases = formData.aliases
            .map(a => a.trim())
            .filter(a => a.length > 0);

        const aliasError = validateAliases(aliases, name, ingredients, editingId);
        if (aliasError) {
            setFormError(aliasError);
            return;
        }

        setIsSaving(true);
        const ingredientData = buildIngredientPayload(
            name,
            storeSection,
            aliases,
            { containerSizes: formData.containerSizes, conversions: formData.conversions },
            editingId
        );

        const result = await onSave(ingredientData, isAddingNew);
        setIsSaving(false);

        if (result.success) {
            cancelEditing();
        } else {
            setFormError(result.error || 'Failed to save ingredient');
        }
    };

    const handleDelete = async (ingredient: IngredientDefinition) => {
        // Check usage first
        const usage = await onCheckUsage(ingredient.id);

        if (usage && usage.recipeCount > 0) {
            showConfirmation({
                title: 'Cannot Delete',
                message: `"${ingredient.name}" is used in ${usage.recipeCount} recipe${usage.recipeCount === 1 ? '' : 's'}. Remove it from all recipes before deleting.`,
                confirmLabel: 'OK',
                cancelLabel: 'none',
                variant: 'info',
                onConfirm: () => dismissConfirmation()
            });
            return;
        }

        showConfirmation({
            title: 'Delete Ingredient',
            message: `Are you sure you want to delete "${ingredient.name}"?`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: async () => {
                const result = await onDelete(ingredient.id);
                if (!result.success) {
                    showConfirmation({
                        title: 'Error',
                        message: result.error || 'Failed to delete ingredient',
                        confirmLabel: 'OK',
                        cancelLabel: 'none',
                        variant: 'danger',
                        onConfirm: () => dismissConfirmation()
                    });
                } else {
                    if (editingId === ingredient.id) {
                        cancelEditing();
                    }
                    dismissConfirmation();
                }
            },
            onCancel: () => dismissConfirmation()
        });
    };


    const updateContainerSize = (index: number, field: keyof ContainerSize, value: number | string) => {
        setFormData(prev => {
            const next = [...(prev.containerSizes || [])];
            if (!next[index]) return prev;
            next[index] = { ...next[index], [field]: value };
            return { ...prev, containerSizes: next };
        });
    };

    const addContainerSize = () => {
        setFormData(prev => ({
            ...prev,
            containerSizes: [...(prev.containerSizes || []), { quantity: 1, unit: 'cup' }]
        }));
    };

    const removeContainerSize = (index: number) => {
        setFormData(prev => ({
            ...prev,
            containerSizes: prev.containerSizes.filter((_, i) => i !== index)
        }));
    };


    const selectSection = (section: string) => {
        if (section === '__new__') {
            setFormData(prev => ({...prev, isNewSection: true, newSectionName: ''}));
        } else {
            setFormData(prev => ({...prev, storeSection: section, isNewSection: false}));
        }
    };

    const ingredientEditFormProps = {
        formData,
        setFormData,
        storeSections,
        editingAliasIndex,
        editingAliasValue,
        setEditingAliasValue: setEditingAliasValueFromHook,
        containerSectionOpen,
        setContainerSectionOpen,
        conversionsSectionOpen,
        setConversionsSectionOpen,
        formError,
        isSaving,
        onSave: handleSave,
        onCancel: cancelEditing,
        startEditAlias,
        saveEditAlias,
        cancelEditAlias,
        onDeleteAlias: handleDeleteAliasClick,
        onMergeAlias: handleMergeAliasClick,
        addAlias,
        updateAlias,
        removeAlias,
        updateContainerSize,
        addContainerSize,
        removeContainerSize,
        aliasActionError,
        selectSection
    };

    const handleIngredientClick = (ingredient: IngredientDefinition) => {
        if (!onRecipeClick) return;
        if (editingId) return;
        setSelectedIngredient(ingredient);
    };

    return (
        <div className="space-y-6 transition-colors duration-300">
            {/* Header */}
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center">
                    <Package className="h-8 w-8 mr-3 text-indigo-600 shrink-0" />
                    <span className="truncate">Ingredients</span>
                    <span className="ml-2 text-lg font-normal text-gray-400">({ingredients.length})</span>
                </h1>
                {canEdit && !isAddingNew && (
                    <button
                        onClick={startAddingNew}
                        className="flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Ingredient
                    </button>
                )}
            </div>

            <IngredientsToolbar
                searchQuery={searchQuery}
                setSearchQuery={setSearchQuery}
                sectionFilter={sectionFilter}
                setSectionFilter={setSectionFilter}
                storeSections={storeSections}
                canEdit={canEdit}
                filteredCount={filteredIngredients.length}
                isAllSelected={isAllSelected}
                selectAll={selectAll}
                clearSelection={clearSelection}
            />

            {/* Add New Form */}
            {isAddingNew && (
                <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-indigo-200 dark:border-indigo-800 p-6">
                    <h2 className="text-lg font-bold text-gray-900 dark:text-gray-100 mb-4">
                        New Ingredient
                    </h2>
                    <IngredientEditForm
                        {...ingredientEditFormProps}
                        isInline={false}
                        hasAliasApis={false}
                    />
                </div>
            )}

            {/* Ingredients Grid */}
            {filteredIngredients.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {filteredIngredients.map(ingredient => (
                        <IngredientCard
                            key={ingredient.id}
                            ingredient={ingredient}
                            isEditing={editingId === ingredient.id}
                            isSelected={selectedIds.has(ingredient.id)}
                            canEdit={canEdit}
                            onToggleSelect={toggleSelection}
                            onEdit={startEditing}
                            onDelete={handleDelete}
                            onClick={handleIngredientClick}
                        >
                            {editingId === ingredient.id && (
                                <IngredientEditForm
                                    {...ingredientEditFormProps}
                                    isInline
                                    hasAliasApis={hasAliasApis}
                                />
                            )}
                        </IngredientCard>
                    ))}
                </div>
            ) : (
                <div className="text-center py-12">
                    <Package className="h-12 w-12 mx-auto text-gray-300 dark:text-gray-600 mb-4" />
                    <p className="text-gray-500 dark:text-gray-400">
                        {ingredients.length === 0
                            ? 'No ingredients yet. Add your first ingredient to get started.'
                            : 'No ingredients match your search.'}
                    </p>
                </div>
            )}

            {/* Action Bar (when items selected) */}
            {canEdit && selectedIds.size > 0 && (
                <SelectionActionBar
                    count={selectedIds.size}
                    itemLabel="ingredient"
                    onClearAll={clearSelection}
                >
                    {bulkSectionSelectValue === '__new__' ? (
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={bulkSectionNewName}
                                onChange={(e) => setBulkSectionNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleBulkApplyNewSection()}
                                placeholder="Type new section name"
                                disabled={isBulkSettingSection}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-indigo-500 disabled:opacity-50 min-w-[160px]"
                            />
                            <button
                                type="button"
                                onClick={handleBulkApplyNewSection}
                                disabled={!normalizeStoreSection(bulkSectionNewName) || isBulkSettingSection}
                                className="px-3 py-2 text-sm font-medium text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors disabled:opacity-50"
                            >
                                Apply
                            </button>
                            <button
                                type="button"
                                onClick={() => { setBulkSectionSelectValue(''); setBulkSectionNewName(''); }}
                                className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
                                title="Cancel"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-1.5">
                            <label htmlFor="bulk-set-section" className="text-sm text-gray-600 dark:text-gray-400 whitespace-nowrap">
                                Set section to
                            </label>
                            <select
                                id="bulk-set-section"
                                value={bulkSectionSelectValue}
                                onChange={(e) => {
                                    const v = e.target.value;
                                    if (v === '__new__') {
                                        setBulkSectionSelectValue('__new__');
                                        setBulkSectionNewName('');
                                    } else if (v) {
                                        handleBulkSetStoreSection(v);
                                        setBulkSectionSelectValue('');
                                    }
                                }}
                                disabled={isBulkSettingSection}
                                className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm font-medium focus:ring-2 focus:ring-indigo-500 disabled:opacity-50"
                            >
                                <option value="">Choose...</option>
                                {storeSections.map(sec => (
                                    <option key={sec} value={sec}>{sec}</option>
                                ))}
                                <option value="__new__">New section...</option>
                            </select>
                        </div>
                    )}
                    <button
                        onClick={() => setShowMergeDialog(true)}
                        disabled={selectedIds.size < 2}
                        className="flex items-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title={selectedIds.size < 2 ? 'Select at least 2 ingredients to merge' : 'Merge selected ingredients'}
                    >
                        <GitMerge className="h-4 w-4 mr-2" />
                        Merge Selected
                    </button>
                    <button
                        onClick={handleDeleteSelected}
                        disabled={isDeleting}
                        className="flex items-center px-4 py-2 bg-red-600 text-white rounded-lg font-bold text-sm hover:bg-red-700 transition-colors disabled:opacity-50"
                    >
                        <Trash2 className="h-4 w-4 mr-2" />
                        {isDeleting ? 'Checking...' : 'Delete Selected'}
                    </button>
                </SelectionActionBar>
            )}

            {/* Confirmation Dialog */}
            {confirmation && (
                <ConfirmationDialog
                    {...confirmation}
                    onCancel={dismissConfirmation}
                />
            )}

            {/* Merge Dialog */}
            {showMergeDialog && (
                <IngredientMergeDialog
                    ingredients={ingredients}
                    selectedIds={[...selectedIds]}
                    onMerge={handleMerge}
                    onCheckUsage={onCheckUsage}
                    onClose={() => setShowMergeDialog(false)}
                />
            )}

            {/* Alias Delete Dialog (when alias is used in recipes) */}
            {aliasDeleteState && (
                <AliasDeleteDialog
                    ingredientName={aliasDeleteState.ingredientName}
                    aliasText={aliasDeleteState.aliasText}
                    recipeCount={aliasDeleteState.recipeCount}
                    replacementOptions={formData.aliases.filter((a) => a?.trim() && a.trim() !== aliasDeleteState.aliasText)}
                    replacementValue={aliasDeleteReplacement}
                    onReplacementChange={setAliasDeleteReplacement}
                    onReplaceWithCanonical={() => confirmAliasDeleteWithReplacement(true)}
                    onReplaceWithSelected={(replacement) => confirmAliasDeleteWithReplacement(false, replacement)}
                    onCancel={() => {
                        setAliasDeleteState(null);
                        setAliasDeleteReplacement('');
                    }}
                />
            )}

            {/* Alias Merge Dialog */}
            {aliasMergeState && (
                <AliasMergeDialogComponent
                    sourceText={aliasMergeState.sourceText}
                    aliasOptions={aliasMergeState.aliasOptions}
                    selectedTarget={aliasMergeTarget}
                    onTargetChange={setAliasMergeTarget}
                    onConfirm={() => aliasMergeTarget !== null && confirmAliasMerge(aliasMergeTarget)}
                    onCancel={() => {
                        setAliasMergeState(null);
                        setAliasMergeTarget(null);
                    }}
                />
            )}

            {/* Ingredient Detail Popup */}
            {selectedIngredient && (
                <IngredientDetailPopup
                    ingredient={selectedIngredient}
                    onClose={() => setSelectedIngredient(null)}
                    onCheckUsage={onCheckUsage}
                    onRecipeClick={onRecipeClick ? (recipeName) => {
                        setSelectedIngredient(null);
                        onRecipeClick(recipeName);
                    } : undefined}
                    canEdit={canEdit}
                    onCheckAliasUsage={canEdit ? onCheckAliasUsage : undefined}
                    onUpdateAlias={canEdit ? onUpdateAlias : undefined}
                    onDeleteAlias={canEdit ? onDeleteAlias : undefined}
                    onMergeAlias={canEdit ? onMergeAlias : undefined}
                    onSave={canEdit ? (ing) => onSave(ing, false) : undefined}
                    onIngredientUpdated={canEdit ? (updated) => setSelectedIngredient(prev => prev && prev.id === updated.id ? updated : prev) : undefined}
                />
            )}
        </div>
    );
}

