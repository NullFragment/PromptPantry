import { useState } from 'react';
import type { StoreSectionDefinition } from '../../types';
import { NewSectionForm } from './NewSectionForm';

export interface NameAndSectionFieldsProps {
    name: string;
    onNameChange: (value: string) => void;
    storeSectionId: string;
    onSelectSection: (sectionId: string) => void;
    storeSections: StoreSectionDefinition[];
    saveSection: (section: { name: string; emoji?: string }, isNew: boolean) => Promise<{ success: boolean; error?: string; section?: StoreSectionDefinition }>;
    nameAutoFocus?: boolean;
}

export function NameAndSectionFields({
    name,
    onNameChange,
    storeSectionId,
    onSelectSection,
    storeSections,
    saveSection,
    nameAutoFocus = false
}: NameAndSectionFieldsProps) {
    const [showNewForm, setShowNewForm] = useState(false);

    return (
        <>
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Name *
                </label>
                <input
                    type="text"
                    value={name}
                    onChange={(e) => onNameChange(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    placeholder="e.g., garlic"
                    autoFocus={nameAutoFocus}
                />
            </div>
            <div>
                <label className="block text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider mb-1">
                    Store Section *
                </label>
                {showNewForm ? (
                    <NewSectionForm
                        existingSections={storeSections.map(s => s.name)}
                        onSave={async (sectionName, emoji) => {
                            const result = await saveSection({ name: sectionName, emoji }, true);
                            if (result.success && result.section) {
                                setShowNewForm(false);
                                onSelectSection(result.section.id);
                            }
                            return { success: result.success, error: result.error };
                        }}
                        onCancel={() => setShowNewForm(false)}
                    />
                ) : (
                    <select
                        value={storeSectionId}
                        onChange={(e) => {
                            if (e.target.value === '__new__') {
                                setShowNewForm(true);
                            } else {
                                onSelectSection(e.target.value);
                            }
                        }}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                    >
                        <option value="">-- Select a section --</option>
                        {storeSections.map((section) => (
                            <option key={section.id} value={section.id}>
                                {section.emoji ? `${section.emoji} ` : ''}{section.name}
                            </option>
                        ))}
                        <option value="__new__">Add new section...</option>
                    </select>
                )}
            </div>
        </>
    );
}
