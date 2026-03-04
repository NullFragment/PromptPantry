import { useEffect, useRef, useState } from 'react';
import { ChevronDown, Plus, X } from 'lucide-react';

export interface NameAndSectionFieldsProps {
    name: string;
    onNameChange: (value: string) => void;
    storeSection: string;
    isNewSection: boolean;
    newSectionName: string;
    onNewSectionNameChange: (value: string) => void;
    onSelectSection: (section: string) => void;
    storeSections: string[];
    nameAutoFocus?: boolean;
}

export function NameAndSectionFields({
    name,
    onNameChange,
    storeSection,
    isNewSection,
    newSectionName,
    onNewSectionNameChange,
    onSelectSection,
    storeSections,
    nameAutoFocus = false
}: NameAndSectionFieldsProps) {
    const [showDropdown, setShowDropdown] = useState(false);
    const dropdownRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
                setShowDropdown(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

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
                {isNewSection ? (
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={newSectionName}
                            onChange={(e) => onNewSectionNameChange(e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                            placeholder="New section name"
                            autoFocus
                        />
                        <button
                            type="button"
                            onClick={() => onSelectSection(storeSection || 'Unassigned')}
                            className="px-3 py-2 text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                        >
                            <X className="h-4 w-4" />
                        </button>
                    </div>
                ) : (
                    <div className="relative" ref={dropdownRef}>
                        <button
                            type="button"
                            onClick={() => setShowDropdown(!showDropdown)}
                            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 text-left flex items-center justify-between focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                        >
                            <span>{storeSection}</span>
                            <ChevronDown className="h-4 w-4 text-gray-400" />
                        </button>
                        {showDropdown && (
                            <div className="absolute z-10 mt-1 w-full bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                                {storeSections.map((section) => (
                                    <button
                                        key={section}
                                        type="button"
                                        onClick={() => {
                                            onSelectSection(section);
                                            setShowDropdown(false);
                                        }}
                                        className={`w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm ${
                                            storeSection === section
                                                ? 'bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400'
                                                : 'text-gray-700 dark:text-gray-300'
                                        }`}
                                    >
                                        {section}
                                    </button>
                                ))}
                                <button
                                    type="button"
                                    onClick={() => {
                                        onSelectSection('__new__');
                                        setShowDropdown(false);
                                    }}
                                    className="w-full px-3 py-2 text-left hover:bg-gray-100 dark:hover:bg-gray-700 text-sm text-indigo-600 dark:text-indigo-400 border-t border-gray-200 dark:border-gray-700"
                                >
                                    <Plus className="h-4 w-4 inline mr-1" />
                                    Add new section...
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </>
    );
}
