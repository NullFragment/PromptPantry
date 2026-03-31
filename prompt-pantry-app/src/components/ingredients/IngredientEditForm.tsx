import { Plus, RotateCcw, Save, X } from 'lucide-react';
import type * as React from 'react';
import type { StoreSectionDefinition } from '../../types';
import { AliasChipList } from '../AliasChipList';
import { ContainerSizesSection } from './ContainerSizesSection';
import { ConversionsSection } from './ConversionsSection';
import type { EditFormData } from './ingredientFormTypes';
import { NameAndSectionFields } from './NameAndSectionFields';

export interface IngredientEditFormProps {
    formData: EditFormData;
    setFormData: React.Dispatch<React.SetStateAction<EditFormData>>;
    storeSections: StoreSectionDefinition[];
    isInline?: boolean;
    hasAliasApis: boolean;
    editingAliasIndex: number | null;
    editingAliasValue: string;
    setEditingAliasValue: (v: string) => void;
    containerSectionOpen: boolean;
    setContainerSectionOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
    conversionsSectionOpen: boolean;
    setConversionsSectionOpen: (v: boolean | ((prev: boolean) => boolean)) => void;
    formError: string | null;
    isSaving: boolean;
    onSave: () => void;
    onCancel: () => void;
    startEditAlias: (index: number) => void;
    saveEditAlias: () => void;
    cancelEditAlias: () => void;
    onDeleteAlias: (index: number) => void;
    onMergeAlias: (index: number) => void;
    addAlias: () => void;
    updateAlias: (index: number, value: string) => void;
    removeAlias: (index: number) => void;
    updateContainerSize: (index: number, field: 'quantity' | 'unit' | 'label', value: number | string) => void;
    addContainerSize: () => void;
    removeContainerSize: (index: number) => void;
    aliasActionError: string | null;
    selectSection: (section: string) => void;
    saveSection: (section: { name: string; emoji?: string }, isNew: boolean) => Promise<{ success: boolean; error?: string; section?: StoreSectionDefinition }>;
}

export function IngredientEditForm({
    formData,
    setFormData,
    storeSections,
    isInline = false,
    hasAliasApis,
    editingAliasIndex,
    editingAliasValue,
    setEditingAliasValue,
    containerSectionOpen,
    setContainerSectionOpen,
    conversionsSectionOpen,
    setConversionsSectionOpen,
    formError,
    isSaving,
    onSave,
    onCancel,
    startEditAlias,
    saveEditAlias,
    cancelEditAlias,
    onDeleteAlias,
    onMergeAlias,
    addAlias,
    updateAlias,
    removeAlias,
    updateContainerSize,
    addContainerSize,
    removeContainerSize,
    aliasActionError,
    selectSection,
    saveSection
}: IngredientEditFormProps) {
    return (
        <div className={`space-y-4 ${isInline ? 'p-4 bg-gray-50 dark:bg-gray-800 rounded-lg' : ''}`}>
            <NameAndSectionFields
                name={formData.name}
                onNameChange={(v) => setFormData((prev) => ({ ...prev, name: v }))}
                storeSectionId={formData.storeSectionId}
                onSelectSection={selectSection}
                storeSections={storeSections}
                nameAutoFocus={!isInline}
                saveSection={saveSection}
            />

            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Aliases
                </label>
                {hasAliasApis ? (
                    <AliasChipList
                        aliases={formData.aliases}
                        editingIndex={editingAliasIndex}
                        editingValue={editingAliasValue}
                        onEditingValueChange={setEditingAliasValue}
                        onStartEdit={startEditAlias}
                        onSaveEdit={saveEditAlias}
                        onCancelEdit={cancelEditAlias}
                        onDelete={onDeleteAlias}
                        onMerge={onMergeAlias}
                        addMode="button"
                        onAddAlias={addAlias}
                        stopPropagation
                    />
                ) : (
                    <div className="space-y-2">
                        {formData.aliases.map((alias, index) => (
                            <div key={index} className="flex gap-2">
                                <input
                                    type="text"
                                    value={alias}
                                    onChange={(e) => updateAlias(index, e.target.value)}
                                    className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                                    placeholder="e.g., garlic, minced"
                                />
                                <button
                                    type="button"
                                    onClick={() => removeAlias(index)}
                                    className="px-2 py-2 text-gray-400 hover:text-red-500 transition-colors"
                                >
                                    <X className="h-4 w-4" />
                                </button>
                            </div>
                        ))}
                        <button
                            type="button"
                            onClick={addAlias}
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 dark:hover:text-indigo-300 flex items-center"
                        >
                            <Plus className="h-4 w-4 mr-1" />
                            Add alias
                        </button>
                    </div>
                )}
                {aliasActionError && (
                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{aliasActionError}</p>
                )}
            </div>

            <ContainerSizesSection
                open={containerSectionOpen}
                onToggleOpen={() => setContainerSectionOpen((prev) => !prev)}
                containerSizes={formData.containerSizes}
                onUpdate={updateContainerSize}
                onAdd={addContainerSize}
                onRemove={removeContainerSize}
            />

            <ConversionsSection
                open={conversionsSectionOpen}
                onToggleOpen={() => setConversionsSectionOpen((prev) => !prev)}
                conversions={formData.conversions}
                onConversionsChange={(c) => setFormData((prev) => ({ ...prev, conversions: c }))}
            />

            {formError && (
                <div className="text-sm text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-3 py-2 rounded-lg">
                    {formError}
                </div>
            )}

            <div className="flex gap-2 pt-2">
                <button
                    type="button"
                    onClick={onSave}
                    disabled={isSaving}
                    className="flex-1 flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors disabled:opacity-50"
                >
                    <Save className="h-4 w-4 mr-2" />
                    {isSaving ? 'Saving...' : 'Save'}
                </button>
                <button
                    type="button"
                    onClick={onCancel}
                    className="flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-600 rounded-lg font-bold text-sm transition-colors"
                >
                    <RotateCcw className="h-4 w-4 mr-2" />
                    Cancel
                </button>
            </div>
        </div>
    );
}
