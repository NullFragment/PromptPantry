import { useEffect, useMemo, useState } from 'react';
import { Check, ChevronDown, Plus, Pencil, Trash2, X } from 'lucide-react';
import type { IngredientDefinition, StoreSectionDefinition } from '../../types';

interface ManageSectionsModalProps {
    storeSections: StoreSectionDefinition[];
    ingredients: IngredientDefinition[];
    onSaveSection: (section: { name: string; emoji?: string }, isNew: boolean) => Promise<{ success: boolean; error?: string }>;
    onDeleteSection: (name: string, action: 'uncategorize' | 'merge', targetSection?: string) => Promise<{ success: boolean; error?: string }>;
    onClose: () => void;
}

type DeleteConfirmState = {
    sectionName: string;
    itemCount: number;
    action: 'uncategorize' | 'merge';
    targetSection: string;
};

export function ManageSectionsModal({
    storeSections,
    ingredients,
    onSaveSection,
    onDeleteSection,
    onClose
}: ManageSectionsModalProps) {
    const [editingSection, setEditingSection] = useState<string | null>(null);
    const [editName, setEditName] = useState('');
    const [editEmoji, setEditEmoji] = useState('');
    const [newName, setNewName] = useState('');
    const [newEmoji, setNewEmoji] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);
    const [deleteConfirm, setDeleteConfirm] = useState<DeleteConfirmState | null>(null);

    const itemCounts = useMemo(() => {
        const counts: Record<string, number> = {};
        for (const section of storeSections) {
            counts[section.name] = 0;
        }
        for (const ing of ingredients) {
            if (counts[ing.storeSection] !== undefined) {
                counts[ing.storeSection]++;
            }
        }
        return counts;
    }, [storeSections, ingredients]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                if (editingSection) {
                    setEditingSection(null);
                    setError(null);
                } else if (deleteConfirm) {
                    setDeleteConfirm(null);
                } else {
                    onClose();
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [onClose, editingSection, deleteConfirm]);

    const startEdit = (section: StoreSectionDefinition) => {
        setEditingSection(section.name);
        setEditName(section.name);
        setEditEmoji(section.emoji || '');
        setError(null);
    };

    const cancelEdit = () => {
        setEditingSection(null);
        setEditName('');
        setEditEmoji('');
        setError(null);
    };

    const saveEdit = async () => {
        const trimmedName = editName.trim();
        if (!trimmedName) {
            setError('Section name is required.');
            return;
        }
        // Check for duplicate name (different from current editing section)
        if (trimmedName !== editingSection && storeSections.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
            setError('A section with that name already exists.');
            return;
        }
        setIsSaving(true);
        setError(null);
        const result = await onSaveSection({ name: trimmedName, emoji: editEmoji.trim() || undefined }, false);
        setIsSaving(false);
        if (result.success) {
            setEditingSection(null);
        } else {
            setError(result.error || 'Failed to save section.');
        }
    };

    const handleDeleteClick = (sectionName: string) => {
        const count = itemCounts[sectionName] || 0;
        if (count === 0) {
            performDelete(sectionName, 'uncategorize');
        } else {
            setDeleteConfirm({
                sectionName,
                itemCount: count,
                action: 'uncategorize',
                targetSection: ''
            });
        }
    };

    const performDelete = async (name: string, action: 'uncategorize' | 'merge', target?: string) => {
        setIsSaving(true);
        setError(null);
        const result = await onDeleteSection(name, action, target);
        setIsSaving(false);
        if (result.success) {
            setDeleteConfirm(null);
        } else {
            setError(result.error || 'Failed to delete section.');
        }
    };

    const confirmDelete = () => {
        if (!deleteConfirm) return;
        const { sectionName, action, targetSection } = deleteConfirm;
        if (action === 'merge' && !targetSection) {
            setError('Please select a section to merge into.');
            return;
        }
        performDelete(sectionName, action, action === 'merge' ? targetSection : undefined);
    };

    const handleAddSection = async () => {
        const trimmedName = newName.trim();
        if (!trimmedName) {
            setError('Section name is required.');
            return;
        }
        if (storeSections.some(s => s.name.toLowerCase() === trimmedName.toLowerCase())) {
            setError('A section with that name already exists.');
            return;
        }
        setIsSaving(true);
        setError(null);
        const result = await onSaveSection({ name: trimmedName, emoji: newEmoji.trim() || undefined }, true);
        setIsSaving(false);
        if (result.success) {
            setNewName('');
            setNewEmoji('');
        } else {
            setError(result.error || 'Failed to add section.');
        }
    };

    const otherSections = (excludeName: string) =>
        storeSections.filter(s => s.name !== excludeName);

    return (
        <div className="fixed inset-0 z-[200] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={onClose}></div>
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 transition-colors">
                {/* Header */}
                <div className="bg-indigo-600 p-6 text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-1 hover:bg-white/20 dark:hover:bg-gray-700/50 rounded-lg transition-colors"
                        aria-label="Close"
                    >
                        <X className="h-5 w-5" />
                    </button>
                    <h2 className="text-xl font-bold">Manage Store Sections</h2>
                    <p className="text-indigo-100 text-sm mt-1">
                        Add, edit, or remove store sections for organizing ingredients.
                    </p>
                </div>

                {/* Content */}
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    {error && (
                        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 rounded-lg text-red-700 dark:text-red-300 text-sm">
                            {error}
                        </div>
                    )}

                    {/* Section List */}
                    <div className="space-y-2">
                        {storeSections.map(section => (
                            <div key={section.name}>
                                {editingSection === section.name ? (
                                    /* Edit Mode */
                                    <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                                        <input
                                            type="text"
                                            value={editEmoji}
                                            onChange={(e) => setEditEmoji(e.target.value)}
                                            maxLength={2}
                                            placeholder="🏷️"
                                            className="w-12 px-2 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                        <input
                                            type="text"
                                            value={editName}
                                            onChange={(e) => setEditName(e.target.value)}
                                            onKeyDown={(e) => e.key === 'Enter' && saveEdit()}
                                            className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                        />
                                        <button
                                            onClick={saveEdit}
                                            disabled={isSaving}
                                            className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
                                            title="Save"
                                        >
                                            <Check className="h-4 w-4" />
                                        </button>
                                        <button
                                            onClick={cancelEdit}
                                            className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                            title="Cancel"
                                        >
                                            <X className="h-4 w-4" />
                                        </button>
                                    </div>
                                ) : deleteConfirm?.sectionName === section.name ? (
                                    /* Delete Confirmation */
                                    <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg space-y-3">
                                        <p className="text-sm text-red-700 dark:text-red-300 font-medium">
                                            &quot;{section.name}&quot; has {deleteConfirm.itemCount} ingredient{deleteConfirm.itemCount !== 1 ? 's' : ''}. What should happen to them?
                                        </p>
                                        <div className="space-y-2">
                                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="deleteAction"
                                                    checked={deleteConfirm.action === 'uncategorize'}
                                                    onChange={() => setDeleteConfirm(prev => prev ? { ...prev, action: 'uncategorize', targetSection: '' } : null)}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Move to Unassigned
                                            </label>
                                            <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                                                <input
                                                    type="radio"
                                                    name="deleteAction"
                                                    checked={deleteConfirm.action === 'merge'}
                                                    onChange={() => setDeleteConfirm(prev => prev ? { ...prev, action: 'merge' } : null)}
                                                    className="text-indigo-600 focus:ring-indigo-500"
                                                />
                                                Merge into another section
                                            </label>
                                            {deleteConfirm.action === 'merge' && (
                                                <div className="ml-6 relative">
                                                    <select
                                                        value={deleteConfirm.targetSection}
                                                        onChange={(e) => setDeleteConfirm(prev => prev ? { ...prev, targetSection: e.target.value } : null)}
                                                        className="appearance-none w-full px-3 py-1.5 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                                                    >
                                                        <option value="">Select section...</option>
                                                        {otherSections(section.name).map(s => (
                                                            <option key={s.name} value={s.name}>
                                                                {s.emoji ? `${s.emoji} ` : ''}{s.name}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <ChevronDown className="absolute right-2 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex justify-end gap-2">
                                            <button
                                                onClick={() => { setDeleteConfirm(null); setError(null); }}
                                                className="px-3 py-1.5 text-sm text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                                            >
                                                Cancel
                                            </button>
                                            <button
                                                onClick={confirmDelete}
                                                disabled={isSaving}
                                                className="px-3 py-1.5 text-sm bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50"
                                            >
                                                {isSaving ? 'Deleting...' : 'Delete Section'}
                                            </button>
                                        </div>
                                    </div>
                                ) : (
                                    /* Display Mode */
                                    <div className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-800 rounded-lg group">
                                        <span className="w-8 text-center text-lg shrink-0">
                                            {section.emoji || '—'}
                                        </span>
                                        <span className="flex-1 text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                                            {section.name}
                                        </span>
                                        <span className="text-xs text-gray-500 dark:text-gray-400 tabular-nums shrink-0">
                                            {itemCounts[section.name] || 0} item{(itemCounts[section.name] || 0) !== 1 ? 's' : ''}
                                        </span>
                                        <button
                                            onClick={() => startEdit(section)}
                                            className="p-1.5 text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                            title="Edit section"
                                        >
                                            <Pencil className="h-3.5 w-3.5" />
                                        </button>
                                        {storeSections.length > 1 && (
                                            <button
                                                onClick={() => handleDeleteClick(section.name)}
                                                className="p-1.5 text-gray-400 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100 focus:opacity-100"
                                                title="Delete section"
                                            >
                                                <Trash2 className="h-3.5 w-3.5" />
                                            </button>
                                        )}
                                    </div>
                                )}
                            </div>
                        ))}
                    </div>

                    {/* Add New Section */}
                    <div className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700">
                        <div className="flex items-center gap-2">
                            <input
                                type="text"
                                value={newEmoji}
                                onChange={(e) => setNewEmoji(e.target.value)}
                                maxLength={2}
                                placeholder="🏷️"
                                className="w-12 px-2 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <input
                                type="text"
                                value={newName}
                                onChange={(e) => setNewName(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleAddSection()}
                                placeholder="New section name"
                                className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            />
                            <button
                                onClick={handleAddSection}
                                disabled={isSaving || !newName.trim()}
                                className="flex items-center px-3 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Plus className="h-4 w-4 mr-1" />
                                Add
                            </button>
                        </div>
                    </div>
                </div>

                {/* Footer */}
                <div className="border-t border-gray-200 dark:border-gray-700 p-4 flex justify-end">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-lg transition-colors"
                    >
                        Done
                    </button>
                </div>
            </div>
        </div>
    );
}
