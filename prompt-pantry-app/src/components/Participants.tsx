import React, {useEffect, useRef, useState} from 'react';
import {Participant, type ParticipantEditing} from '../types';
import type {MacroLimits} from '../hooks/useUIState';
import {
  ChevronDown,
  Edit,
  Plus,
  RotateCcw,
  Save,
  Trash2,
  Users
} from 'lucide-react';
import {ConfirmationDialog} from './ConfirmationDialog';
import {useAppContext} from '../hooks/useAppContext';
import {useConfirmation} from '../hooks/useConfirmation';

const COMMON_EMOJIS = [
    // People
    '👤', '👨', '👩', '👧', '👦', '👵', '👴', '👶', '🤵', '👰', '🤰',
    // Food
    '🍎', '🍏', '🍐', '🍊', '🍋', '🍌', '🍉', '🍇', '🍓', '🍈', '🍒', '🍑', '🍍', '🥥', '🥝', '🍅', '🍆', '🥑', '🥦', '🥒', '🌽', '🥕', '🥔', '🍠', '🥐', '🍞', '🥖', '🥨', '🧀', '🥚', '🍳', '🥓', '🥩', '🍗', '🍖', '🌭', '🍔', '🍟', '🍕', '🥪', '🥙', '🌮', '🌯', '🥗', '🥘', '🥣', '🍲', '🍿', '🍱', '🍘', '🍙', '🍚', '🍛', '🍜', '🍝', '🍣', '🍤', '🍥', '🍡', '🥟', '🥠', '🍦', '🍧', '🍨', '🍩', '🍪', '🎂', '🍰', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯',
    // Drinks
    '🍼', '🥛', '☕', '🍵', '🍶', '🍺', '🍻', '🥂', '🍷', '🥃', '🍸', '🍹', '🥤',
    // Animals
    '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🐤', '🦆', '🦅', '🦉', '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞', '🐜', '🦟', '🐢', '🐍', '🦎', '🐙', '🦑', '🦐', '🦞', '🦀', '🐡', '🐠', '🐟', '🐬', '🐳', '🐋', '🦈', '🐊', '🐅', '🐆', '🦓', '🦍', '🐘', '🦏', '🐪', '🐫', '🦒', '🦘', '🐃', '🐂', '🐄', '🐎', '🐖', '🐏', '🐑', '🐐', '🦌', '🐕', '🐩', '🐈', '🐓', '🦃', '🕊', '🐇', '🐁', '🐀', '🐿', '🦔',
    // Activities
    '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸', '🥅', '⛳', '⛸', '🎣', '🛶', '🏄', '🏇', '🚴', '🚵', '🤸', '🤺', '🤾', '🏌', '🧘', '💪', '🏃',
    // Travel/Places
    '🚗', '🚕', '🚙', '🚌', '🚎', '🏎', '🚓', '🚑', '🚒', '🚐', '🚚', '🚛', '🚜', '🚲', '🛴', '🛵', '🏍', '🚤', '🛳', '✈', '🏠', '🏘', '🏢', '🏗', '🏭', '🏟', '🏙', '🏚', '🏛', '🏜', '🏝', '🏞',
    // Objects
    '⌚', '📱', '💻', '⌨', '🖥', '🖨', '🖱', '🖲', '🕹', '🗜', '💽', '💾', '💿', '📀', '📼', '📷', '📹', '🎥', '📽', '🎞', '📞', '📠', '📺', '📻', '🎙', '🎚', '🎛', '🧭', '⏱', '⏲', '⏰', '🕰', '⌛', '⏳', '📡', '🔋', '🔌', '💡', '🔦', '🕯', '🪔', '🧯', '🛢', '💸', '💵', '💴', '💶', '💷', '🪙', '💰', '💳', '💎', '⚖', '🪜', '🧰', '🪛', '🔧', '🔨', '⚒', '🛠', '⛏', '🪚', '💣', '🪃', '🔪', '🗡', '⚔', '🛡', '🚬', '⚰', '🪦', '⚱', '🏺', '🔮', '📿', '🧿', '💈', '⚗', '🔭', '🔬', '🕳', '🩹', '🩺', '💊', '💉', '🩸', '🧬', '🦠', '🧫', '🧪', '🌡', '🧹', '🪠', '🧺', '🧻', '🚽', '🚰', '🚿', '🛁', '🛀', '🧼', '🪥', '🪒', '🧽', '🪣', '🧴', '🛎', '🗝', '🚪', '🪑', '🛋', '🛏', '🛌', '🧸', '🪆', '🖼', '🪞', '🪟', '🛍', '🛒', '🎁', '🎈', '🎏', '🎀', '🪄', '🎊', '🎉', '🎎', '🏮', '🎐', '🧧', '✉', '📩', '📨', '📧', '💌', '📥', '📤', '📦', '🏷', '🪧', '📪', '📫', '📬', '📭', '📮', '📯', '📜', '📃', '📄', '📑', '🧾', '📊', '📈', '📉', '🗒', '🗓', '📆', '📅', '🗑', '📇', '🗃', '🗳', '🗄', '📋', '📁', '📂', '🗂', '🗞', '📰', '📓', '📔', '📒', '📕', '📗', '📘', '📙', '📚', '📖', '🔖', '🧷', '🔗', '📎', '🖇', '📐', '📏', '🧮', '📌', '📍', '✂', '🖊', '🖋', '✒', '🖌', '🖍', '📝', '🔍', '🔎', '🔏', '🔐', '🔑', '🔒', '🔓',
    // Symbols
    '❤', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔', '❣', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '💟', '☮', '✝', '☪', '🕉', '☸', '✡', '🔯', '🕎', '☯', '☦', '🛐', '⛎', '♈', '♉', '♊', '♋', '♌', '♍', '♎', '♏', '♐', '♑', '♒', '♓', '🆔', '⚛', '⚕', '☢', '☣', '⚠️', '★', '☆', '✴', '✳', '➕', '➖', '➗', '✖', '♾', '💲', '💱', '©', '®', '™'
];

const DEFAULT_MACRO_LIMITS: MacroLimits = {
    proteinPercentMin: 0,
    proteinPercentMax: 100,
    fatPercentMin: 0,
    fatPercentMax: 100,
    calorieDeficitMax: 25
};

interface ParticipantsProps {
    participants: Participant[];
    onSave: (participants: Participant[], showSuccess?: boolean) => void;
    macroLimits?: MacroLimits;
}

export function Participants({
                                 participants: initialParticipants,
                                 onSave,
                                 macroLimits = DEFAULT_MACRO_LIMITS
                             }: ParticipantsProps) {
    const { canEdit } = useAppContext();
    const [participants, setParticipants] = useState<ParticipantEditing[]>(initialParticipants);
    const [editingIndices, setEditingIndices] = useState<Set<number>>(new Set());
    const [showIconPicker, setShowIconPicker] = useState<number | null>(null);
    const iconPickerRef = useRef<HTMLDivElement>(null);


    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (iconPickerRef.current && !iconPickerRef.current.contains(event.target as Node)) {
                setShowIconPicker(null);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const { confirmation, show: showConfirmation, dismiss: dismissConfirmation } = useConfirmation();

    // Use a ref to track editing indices without triggering re-renders
    const editingIndicesRef = React.useRef(editingIndices);
    editingIndicesRef.current = editingIndices;

    useEffect(() => {
        setParticipants(prev => {
            // Create a new array that matches initialParticipants in length
            // but preserves local changes for those being edited.
            return initialParticipants.map((p, i) => {
                if (editingIndicesRef.current.has(i)) return prev[i] || p;
                return p;
            });
        });
    }, [initialParticipants]);

    const addParticipant = () => {
        const newParticipant: Participant = {
            name: '',
            maintenanceCalories: 2000,
            calorieDeficit: 10,
            proteinPercent: 25,
            carbsPercent: 50,
            fatPercent: 25,
        };
        const newIndex = participants.length;
        setParticipants([...participants, newParticipant]);
        setEditingIndices(prev => new Set(prev).add(newIndex));
    };

    const removeParticipantFromList = (index: number) => {
        const newParticipants = participants.filter((_, i) => i !== index);
        setParticipants(newParticipants);
        // Update editing indices
        setEditingIndices(prev => {
            const next = new Set<number>();
            prev.forEach(idx => {
                if (idx < index) next.add(idx);
                if (idx > index) next.add(idx - 1);
            });
            return next;
        });
    };

    const updateParticipant = (index: number, field: keyof ParticipantEditing, value: string | number) => {
        const newParticipants = [...participants];
        const updatedParticipant: ParticipantEditing = {...newParticipants[index], [field]: value};

        if (field === 'proteinPercent' || field === 'fatPercent') {
            const p = parseFloat(String(updatedParticipant.proteinPercent)) || 0;
            const f = parseFloat(String(updatedParticipant.fatPercent)) || 0;
            updatedParticipant.carbsPercent = Math.max(0, 100 - p - f);
        }

        newParticipants[index] = updatedParticipant;
        setParticipants(newParticipants);
    };

    const clampParticipant = (p: ParticipantEditing): Participant => {
        const protein = Math.max(macroLimits.proteinPercentMin, Math.min(macroLimits.proteinPercentMax, parseFloat(String(p.proteinPercent)) || 0));
        const fat = Math.max(macroLimits.fatPercentMin, Math.min(macroLimits.fatPercentMax, parseFloat(String(p.fatPercent)) || 0));
        const carbs = Math.max(0, 100 - protein - fat);
        return {
            ...p,
            maintenanceCalories: Math.max(0, parseInt(String(p.maintenanceCalories), 10) || 0),
            calorieDeficit: Math.max(0, Math.min(macroLimits.calorieDeficitMax, parseFloat(String(p.calorieDeficit)) || 0)),
            proteinPercent: protein,
            fatPercent: fat,
            carbsPercent: carbs
        };
    };

    const validateAndClamp = (index: number) => {
        const newParticipants = [...participants];
        newParticipants[index] = clampParticipant(newParticipants[index]);
        setParticipants(newParticipants);
    };

    const handleIndividualSave = (index: number) => {
        // To save an individual, we apply its changes to the last known roster from parent.
        const clamped = clampParticipant(participants[index]);

        // Update local state first to keep it in sync for the upcoming prop update
        setParticipants(prev => {
            const next = [...prev];
            next[index] = clamped;
            return next;
        });
        setEditingIndices(prev => {
            const next = new Set(prev);
            next.delete(index);
            return next;
        });

        let newList: Participant[];
        if (index >= initialParticipants.length) {
            // New participant
            newList = [...initialParticipants, clamped];
        } else {
            // Existing participant
            newList = initialParticipants.map((p, i) => i === index ? clamped : p);
        }
        onSave(newList, false);
    };

    const handleIndividualRevert = (index: number) => {
        if (index >= initialParticipants.length) {
            // It's a new unsaved participant, revert means remove
            removeParticipantFromList(index);
        } else {
            setParticipants(prev => {
                const next = [...prev];
                next[index] = initialParticipants[index];
                return next;
            });
            setEditingIndices(prev => {
                const next = new Set(prev);
                next.delete(index);
                return next;
            });
        }
    };

    const handleIndividualDelete = (index: number) => {
        const participantName = participants[index].name || 'this participant';

        showConfirmation({
            title: 'Delete Participant',
            message: `Are you sure you want to delete ${participantName}?`,
            confirmLabel: 'Delete',
            variant: 'danger',
            onConfirm: () => {
                if (index >= initialParticipants.length) {
                    // Just remove from local state
                    removeParticipantFromList(index);
                } else {
                    const newList = initialParticipants.filter((_, i) => i !== index);

                    // Update local state first to keep it in sync for the upcoming prop update
                    setParticipants(prev => prev.filter((_, i) => i !== index));
                    setEditingIndices(prev => {
                        const next = new Set<number>();
                        prev.forEach(idx => {
                            if (idx < index) next.add(idx);
                            if (idx > index) next.add(idx - 1);
                        });
                        return next;
                    });

                    onSave(newList, false);
                }
                dismissConfirmation();
            }
        });
    };

    const handleSaveAll = () => {
        const clampedList = participants.map(p => clampParticipant(p));
        setParticipants(clampedList);
        setEditingIndices(new Set());
        onSave(clampedList, true);
    };

    const handleDiscardAll = () => {
        setParticipants(initialParticipants);
        setEditingIndices(new Set());
    };

    const calculateGrams = (p: ParticipantEditing) => {
        const maintenance = parseFloat(String(p.maintenanceCalories)) || 0;
        const deficit = parseFloat(String(p.calorieDeficit)) || 0;
        const proteinPct = parseFloat(String(p.proteinPercent)) || 0;
        const carbsPct = parseFloat(String(p.carbsPercent)) || 0;
        const fatPct = parseFloat(String(p.fatPercent)) || 0;

        const deficitKcal = (maintenance * (deficit / 100));
        const targetCalories = maintenance - deficitKcal;
        const proteinGrams = (targetCalories * (proteinPct / 100)) / 4;
        const carbsGrams = (targetCalories * (carbsPct / 100)) / 4;
        const fatGrams = (targetCalories * (fatPct / 100)) / 9;
        return {
            targetCalories: Math.round(targetCalories),
            proteinGrams: Math.round(proteinGrams),
            carbsGrams: Math.round(carbsGrams),
            fatGrams: Math.round(fatGrams),
        };
    };

    return (
        <div className="space-y-6 transition-colors duration-300">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
                <h1 className="text-2xl sm:text-3xl font-extrabold text-gray-900 dark:text-gray-100 flex items-center">
                    <Users className="h-8 w-8 mr-3 text-indigo-600 shrink-0"/>
                    <span className="truncate">Meal Plan Participants</span>
                </h1>
                <div className="flex flex-wrap gap-2 sm:gap-4 w-full sm:w-auto">
                    {canEdit && (
                        <button
                            onClick={addParticipant}
                            className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-indigo-600 text-white rounded-lg font-bold text-sm hover:bg-indigo-700 transition-colors shadow-sm"
                        >
                            <Plus className="h-4 w-4 mr-2"/> <span className="whitespace-nowrap">Add Participant</span>
                        </button>
                    )}
                    {canEdit && editingIndices.size > 0 && (
                        <div className="flex flex-1 sm:flex-none gap-2">
                            <button
                                onClick={handleDiscardAll}
                                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700 rounded-lg font-bold text-sm transition-colors shadow-sm"
                            >
                                <RotateCcw className="h-4 w-4 mr-2"/> Discard
                            </button>
                            <button
                                onClick={handleSaveAll}
                                className="flex-1 sm:flex-none flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg font-bold text-sm hover:bg-green-700 transition-colors shadow-sm"
                            >
                                <Save className="h-4 w-4 mr-2"/> Save
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {participants.map((p, index) => {
                    const {targetCalories, proteinGrams, carbsGrams, fatGrams} = calculateGrams(p);
                    const isEditing = editingIndices.has(index);

                    return (
                        <div key={index}
                             className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-200 dark:border-gray-800 overflow-hidden flex flex-col p-4 sm:p-6 space-y-4 transition-colors">
                            <div className="flex justify-between items-start">
                                <div className="flex gap-4 flex-1 items-end min-w-0">
                                    <div className="relative w-16 sm:w-20 shrink-0"
                                         ref={showIconPicker === index ? iconPickerRef : null}>
                                        <label
                                            className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Icon</label>
                                        <div
                                            className={`flex items-center gap-1 border-b transition-colors ${isEditing ? 'border-indigo-500 dark:border-indigo-400' : 'border-transparent'}`}>
                                            <input
                                                type="text"
                                                value={p.icon || ''}
                                                onChange={(e) => {
                                                    const val = e.target.value;
                                                    const asciiRegex = /[a-zA-Z0-9\s!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?~`]/;
                                                    if (val === '' || !asciiRegex.test(val)) {
                                                        updateParticipant(index, 'icon', val);
                                                    }
                                                }}
                                                placeholder="👤"
                                                readOnly={!isEditing}
                                                className="w-full text-lg font-bold outline-none pb-1 bg-transparent text-left text-gray-900 dark:text-white"
                                            />
                                            {isEditing && (
                                                <button
                                                    onClick={() => setShowIconPicker(showIconPicker === index ? null : index)}
                                                    className="pb-1 text-gray-400 hover:text-indigo-500 transition-colors"
                                                    aria-label="Toggle icon picker"
                                                >
                                                    <ChevronDown className="h-4 w-4"/>
                                                </button>
                                            )}
                                        </div>
                                        {isEditing && showIconPicker === index && (
                                            <div
                                                className="absolute left-0 mt-2 p-2 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[60] grid grid-cols-6 gap-1 w-64 max-h-60 overflow-y-auto">
                                                {COMMON_EMOJIS.map(emoji => (
                                                    <button
                                                        key={emoji}
                                                        onClick={() => {
                                                            updateParticipant(index, 'icon', emoji);
                                                            setShowIconPicker(null);
                                                        }}
                                                        className="p-1.5 hover:bg-indigo-50 dark:hover:bg-indigo-900/40 rounded-lg transition-colors text-lg"
                                                    >
                                                        {emoji}
                                                    </button>
                                                ))}
                                            </div>
                                        )}
                                    </div>
                                    <div className="flex-1 min-w-0">
                                        <label
                                            className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1">Name</label>
                                        <input
                                            type="text"
                                            value={p.name}
                                            onChange={(e) => updateParticipant(index, 'name', e.target.value)}
                                            placeholder="Name"
                                            readOnly={!isEditing}
                                            className={`w-full text-lg font-bold border-b outline-none pb-1 transition-colors bg-transparent truncate ${
                                                isEditing ? 'border-indigo-500 dark:border-indigo-400 text-gray-900 dark:text-white' : 'border-transparent text-gray-900 dark:text-gray-100'
                                            }`}
                                        />
                                    </div>
                                </div>
                                {canEdit && (
                                    <div className="flex gap-1 ml-2 shrink-0">
                                        {!isEditing ? (
                                            <button
                                                onClick={() => setEditingIndices(prev => new Set(prev).add(index))}
                                                className="p-2 text-gray-300 dark:text-gray-600 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
                                                title="Edit Participant"
                                            >
                                                <Edit className="h-5 w-5"/>
                                            </button>
                                        ) : (
                                            <>
                                                <button
                                                    onClick={() => handleIndividualDelete(index)}
                                                    className="p-2 text-gray-300 dark:text-gray-600 hover:text-red-500 dark:hover:text-red-400 transition-colors"
                                                    title="Delete Participant"
                                                >
                                                    <Trash2 className="h-5 w-5"/>
                                                </button>
                                                <button
                                                    onClick={() => handleIndividualRevert(index)}
                                                    className="p-2 text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                                                    title="Revert Changes"
                                                >
                                                    <RotateCcw className="h-5 w-5"/>
                                                </button>
                                                <button
                                                    onClick={() => handleIndividualSave(index)}
                                                    className="p-2 text-green-500 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300 transition-colors"
                                                    title="Save Changes"
                                                >
                                                    <Save className="h-5 w-5"/>
                                                </button>
                                            </>
                                        )}
                                    </div>
                                )}
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label
                                        className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 truncate">Maint.
                                        Kcal</label>
                                    <input
                                        type="number"
                                        value={typeof p.maintenanceCalories === 'string' ? p.maintenanceCalories : String(p.maintenanceCalories)}
                                        onChange={(e) => updateParticipant(index, 'maintenanceCalories', e.target.value)}
                                        onBlur={() => validateAndClamp(index)}
                                        readOnly={!isEditing}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm font-bold transition-colors ${
                                            isEditing ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white' : 'bg-transparent border-transparent text-gray-900 dark:text-gray-100'
                                        }`}
                                    />
                                </div>
                                <div>
                                    <label
                                        className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-1 truncate">Deficit
                                        (%)</label>
                                    <input
                                        type="number"
                                        value={typeof p.calorieDeficit === 'string' ? p.calorieDeficit : String(p.calorieDeficit)}
                                        min={0}
                                        max={macroLimits.calorieDeficitMax}
                                        aria-label="Calorie deficit percentage"
                                        onChange={(e) => updateParticipant(index, 'calorieDeficit', e.target.value)}
                                        onBlur={() => validateAndClamp(index)}
                                        readOnly={!isEditing}
                                        className={`w-full px-3 py-2 border rounded-lg text-sm font-bold transition-colors ${
                                            isEditing ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white' : 'bg-transparent border-transparent text-gray-900 dark:text-gray-100'
                                        }`}
                                    />
                                </div>
                            </div>

                            <div className="space-y-3">
                                <label
                                    className="block text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest">Macro
                                    Distribution (%)</label>
                                <div className="grid grid-cols-3 gap-2">
                                    <div>
                                        <span
                                            className="text-[9px] font-bold text-gray-500 dark:text-gray-400 block text-center mb-1 truncate">Protein</span>
                                        <input
                                            type="number"
                                            value={typeof p.proteinPercent === 'string' ? p.proteinPercent : String(p.proteinPercent)}
                                            min={macroLimits.proteinPercentMin}
                                            max={macroLimits.proteinPercentMax}
                                            aria-label="Protein percentage"
                                            onChange={(e) => updateParticipant(index, 'proteinPercent', e.target.value)}
                                            onBlur={() => validateAndClamp(index)}
                                            readOnly={!isEditing}
                                            className={`w-full px-2 py-1 border rounded-lg text-xs font-bold text-center transition-colors ${
                                                isEditing ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white' : 'bg-transparent border-transparent text-gray-900 dark:text-gray-100'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <span
                                            className="text-[9px] font-bold text-gray-500 dark:text-gray-400 block text-center mb-1 truncate">Fat</span>
                                        <input
                                            type="number"
                                            value={typeof p.fatPercent === 'string' ? p.fatPercent : String(p.fatPercent)}
                                            min={macroLimits.fatPercentMin}
                                            max={macroLimits.fatPercentMax}
                                            aria-label="Fat percentage"
                                            onChange={(e) => updateParticipant(index, 'fatPercent', e.target.value)}
                                            onBlur={() => validateAndClamp(index)}
                                            readOnly={!isEditing}
                                            className={`w-full px-2 py-1 border rounded-lg text-xs font-bold text-center transition-colors ${
                                                isEditing ? 'bg-gray-50 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-900 dark:text-white' : 'bg-transparent border-transparent text-gray-900 dark:text-gray-100'
                                            }`}
                                        />
                                    </div>
                                    <div>
                                        <span
                                            className="text-[9px] font-bold text-gray-500 dark:text-gray-400 block text-center mb-1 truncate">Carbs</span>
                                        <div
                                            className={`w-full px-2 py-1 border rounded-lg text-xs font-bold text-center transition-colors ${
                                                isEditing ? 'bg-gray-100 dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500 dark:text-gray-400' : 'bg-transparent border-transparent text-gray-900 dark:text-gray-100'
                                            }`}
                                            aria-label="Carbs percentage"
                                        >
                                            {p.carbsPercent}%
                                        </div>
                                    </div>
                                </div>
                            </div>

                            <div className="pt-4 border-t border-gray-100 dark:border-gray-800 mt-2">
                                <h4 className="text-[10px] font-bold text-gray-400 dark:text-gray-500 uppercase tracking-widest mb-3">Daily
                                    Targets</h4>
                                <div className="grid grid-cols-2 gap-y-2 text-sm font-bold">
                                    <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Calories:</div>
                                    <div
                                        className="text-indigo-600 dark:text-indigo-400 text-right text-xs sm:text-sm">{targetCalories} kcal
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Protein:</div>
                                    <div className="text-right dark:text-gray-200 text-xs sm:text-sm">{proteinGrams}g
                                    </div>
                                    <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Fat:</div>
                                    <div className="text-right dark:text-gray-200 text-xs sm:text-sm">{fatGrams}g</div>
                                    <div className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm">Carbs:</div>
                                    <div className="text-right dark:text-gray-200 text-xs sm:text-sm">{carbsGrams}g
                                    </div>
                                </div>
                            </div>
                        </div>
                    );
                })}
                {participants.length === 0 && (
                    <div
                        className="col-span-full text-center py-20 bg-white dark:bg-gray-900 rounded-xl border border-dashed border-gray-300 dark:border-gray-700 px-4">
                        <p className="text-gray-500 dark:text-gray-400">No participants added yet. Add someone to see
                            their nutritional targets.</p>
                    </div>
                )}
            </div>

            {confirmation && (
                <ConfirmationDialog
                    {...confirmation}
                    onCancel={dismissConfirmation}
                />
            )}
        </div>
    );
}
