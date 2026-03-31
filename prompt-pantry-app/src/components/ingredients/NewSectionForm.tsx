import { useState } from 'react';
import { Check, X } from 'lucide-react';

export interface NewSectionFormProps {
    existingSections: string[];
    onSave: (name: string, emoji?: string) => Promise<{ success: boolean; error?: string }>;
    onCancel: () => void;
}

export function NewSectionForm({ existingSections, onSave, onCancel }: NewSectionFormProps) {
    const [emoji, setEmoji] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState<string | null>(null);
    const [isSaving, setIsSaving] = useState(false);

    const handleConfirm = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            setError('Name is required.');
            return;
        }
        if (existingSections.some(s => s.toLowerCase() === trimmedName.toLowerCase())) {
            setError(`"${trimmedName}" already exists.`);
            return;
        }
        setIsSaving(true);
        setError(null);
        const result = await onSave(trimmedName, emoji.trim() || '');
        setIsSaving(false);
        if (!result.success) {
            setError(result.error || 'Failed to add section.');
        }
    };

    return (
        <div className="space-y-2">
            <div className="flex items-center gap-2 p-3 bg-indigo-50 dark:bg-indigo-900/20 border border-indigo-200 dark:border-indigo-800 rounded-lg">
                <input
                    type="text"
                    value={emoji}
                    onChange={(e) => setEmoji(e.target.value)}
                    maxLength={2}
                    placeholder="Emoji"
                    className="w-12 px-2 py-1.5 text-center border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleConfirm(); }}
                    placeholder="Section name"
                    className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-sm focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
                <button
                    onClick={handleConfirm}
                    disabled={isSaving}
                    aria-label="Add"
                    className="p-1.5 text-green-600 dark:text-green-400 hover:bg-green-50 dark:hover:bg-green-900/30 rounded-lg transition-colors disabled:opacity-50"
                >
                    <Check className="h-4 w-4" />
                </button>
                <button
                    onClick={onCancel}
                    aria-label="Cancel"
                    className="p-1.5 text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
                >
                    <X className="h-4 w-4" />
                </button>
            </div>
            {error && (
                <p className="px-1 text-sm text-red-600 dark:text-red-400">{error}</p>
            )}
        </div>
    );
}
