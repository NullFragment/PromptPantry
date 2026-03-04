import type * as React from 'react';
import { format } from 'date-fns';
import { Calendar as CalendarIcon, ChevronDown, ChevronLeft, ChevronRight, RotateCcw, Users } from 'lucide-react';
import type { Participant } from '../../types';

export interface PlannerHeaderProps {
    participantSelectorRef: React.RefObject<HTMLDivElement>;
    showParticipantSelector: boolean;
    setShowParticipantSelector: (v: boolean) => void;
    participants: Participant[];
    selectedParticipants: string[];
    setSelectedParticipants: (v: string[] | ((prev: string[]) => string[])) => void;
    showMacros: boolean;
    setShowMacros: (v: boolean | ((prev: boolean) => boolean)) => void;
    weekStart: Date;
    weekEnd: Date;
    selectedDate: Date;
    onCurrentWeek: () => void;
    onPrevWeek: () => void;
    onNextWeek: () => void;
    onOpenDatePicker: () => void;
    canEdit: boolean;
    onClearBatch: () => void;
}

export function PlannerHeader({
    participantSelectorRef,
    showParticipantSelector,
    setShowParticipantSelector,
    participants,
    selectedParticipants,
    setSelectedParticipants,
    showMacros,
    setShowMacros,
    weekStart,
    weekEnd,
    onCurrentWeek,
    onPrevWeek,
    onNextWeek,
    onOpenDatePicker,
    canEdit,
    onClearBatch
}: PlannerHeaderProps) {
    return (
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
            <div className="flex flex-col gap-3">
                <h2 className="section-title">
                    <CalendarIcon className="h-8 w-8 text-indigo-600 shrink-0" />
                    <span className="truncate">Weekly Planner</span>
                </h2>
                <div className="flex flex-wrap items-center gap-3">
                    {participants.length > 0 && (
                        <div className="relative" ref={participantSelectorRef}>
                            <button
                                type="button"
                                onClick={() => setShowParticipantSelector(!showParticipantSelector)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg shadow-sm hover:border-indigo-300 dark:hover:border-indigo-500 transition-all text-xs font-bold text-gray-700 dark:text-gray-300"
                            >
                                <Users className="h-3.5 w-3.5 text-indigo-500" />
                                <span>{selectedParticipants.length} Selected</span>
                                <ChevronDown
                                    className={`h-3 w-3 transition-transform ${showParticipantSelector ? 'rotate-180' : ''}`}
                                />
                            </button>

                            {showParticipantSelector && (
                                <div className="absolute left-0 mt-2 w-64 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl shadow-xl z-[60] animate-in fade-in zoom-in-95 duration-200 overflow-hidden">
                                    <div className="p-3 border-b border-gray-100 dark:border-gray-700 bg-gray-50/50 dark:bg-gray-800/50">
                                        <span className="text-[10px] font-black uppercase tracking-widest text-gray-400">
                                            Select Participants
                                        </span>
                                    </div>
                                    <div className="p-2 max-h-60 overflow-y-auto">
                                        {participants.map((p) => (
                                            <label
                                                key={p.name}
                                                htmlFor={`participant-${p.name}`}
                                                className="flex items-center gap-3 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg cursor-pointer transition-colors group"
                                            >
                                                <div className="relative flex items-center justify-center">
                                                    <input
                                                        type="checkbox"
                                                        id={`participant-${p.name}`}
                                                        checked={selectedParticipants.includes(p.name)}
                                                        onChange={(e) => {
                                                            if (e.target.checked) {
                                                                setSelectedParticipants([...selectedParticipants, p.name]);
                                                            } else {
                                                                setSelectedParticipants(
                                                                    selectedParticipants.filter((name) => name !== p.name)
                                                                );
                                                            }
                                                        }}
                                                        className="peer h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-indigo-600 focus:ring-indigo-500 transition-all"
                                                    />
                                                </div>
                                                <span
                                                    className={`text-xs font-bold transition-colors flex items-center gap-2 ${selectedParticipants.includes(p.name) ? 'text-indigo-600 dark:text-indigo-400' : 'text-gray-600 dark:text-gray-400'}`}
                                                >
                                                    {p.icon && <span className="text-sm">{p.icon}</span>}
                                                    {p.name}
                                                </span>
                                            </label>
                                        ))}
                                    </div>
                                    <div className="p-2 border-t border-gray-100 dark:border-gray-700 flex items-center justify-between bg-gray-50/50 dark:bg-gray-800/50">
                                        <button
                                            type="button"
                                            onClick={() => setSelectedParticipants(participants.map((p) => p.name))}
                                            className="px-2 py-1 text-[10px] font-black text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded transition-colors uppercase"
                                        >
                                            All
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => setSelectedParticipants([])}
                                            className="px-2 py-1 text-[10px] font-black text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-700 rounded transition-colors uppercase"
                                        >
                                            Clear
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <div className="flex items-center gap-2">
                        <button
                            type="button"
                            onClick={() => setShowMacros(!showMacros)}
                            aria-label="Toggle macro visibility"
                            className={`relative inline-flex h-5 w-9 items-center rounded-full transition-colors focus:outline-none ${showMacros ? 'bg-indigo-600' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                            <span
                                className={`inline-block h-3.5 w-3.5 transform rounded-full bg-white transition-transform ${showMacros ? 'translate-x-5' : 'translate-x-1'}`}
                            />
                        </button>
                        <span className="eyebrow">Macros {showMacros ? 'On' : 'Off'}</span>
                    </div>
                </div>
            </div>

            <div className="flex flex-wrap items-stretch gap-2 sm:gap-4 w-full sm:w-auto">
                <button type="button" onClick={onCurrentWeek} className="btn-ghost flex-1 sm:flex-none">
                    Current week
                </button>

                <div className="muted-surface rounded-lg p-1 flex items-center flex-1 sm:flex-none justify-between">
                    <button
                        type="button"
                        onClick={onPrevWeek}
                        className="p-1.5 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="Previous Week"
                    >
                        <ChevronLeft className="h-5 w-5" />
                    </button>

                    <div
                        role="button"
                        tabIndex={0}
                        onClick={onOpenDatePicker}
                        onKeyDown={(e) => e.key === 'Enter' && onOpenDatePicker()}
                        className="px-3 flex flex-col items-center justify-center relative group cursor-pointer min-w-[120px]"
                    >
                        <span className="label-strong leading-none mb-1 group-hover:text-indigo-400 transition-colors text-[8px] sm:text-[10px]">
                            Weekly View
                        </span>
                        <span className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap group-hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                            {format(weekStart, 'MMM d')} – {format(weekEnd, 'MMM d')}
                        </span>
                    </div>

                    <button
                        type="button"
                        onClick={onNextWeek}
                        className="p-1.5 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                        title="Next Week"
                    >
                        <ChevronRight className="h-5 w-5" />
                    </button>
                </div>

                {canEdit && (
                    <button
                        type="button"
                        onClick={onClearBatch}
                        className="btn-danger-soft flex-1 sm:flex-none"
                    >
                        <RotateCcw className="h-4 w-4 mr-2" /> Clear
                    </button>
                )}
            </div>
        </div>
    );
}
