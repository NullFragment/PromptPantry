import { AlertCircle, ArrowRight, CheckCircle2 } from 'lucide-react';
import type { LeftoverItem } from './weeklyPlannerTypes';

export type { LeftoverItem };

export interface LeftoverPromptModalProps {
    open: boolean;
    leftovers: LeftoverItem[];
    onTransfer: (item: LeftoverItem) => void;
    onZeroOut: (item: LeftoverItem) => void;
    onIgnore: (item: LeftoverItem) => void;
    onTransferAll: () => void;
    onZeroOutAll: () => void;
    onIgnoreAll: () => void;
}

export function LeftoverPromptModal({
    open,
    leftovers,
    onTransfer,
    onZeroOut,
    onIgnore,
    onTransferAll,
    onZeroOutAll,
    onIgnoreAll
}: LeftoverPromptModalProps) {
    if (!open) return null;

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            <div className="fixed inset-0 bg-black/60 backdrop-blur-md" onClick={onIgnoreAll} aria-hidden />
            <div className="relative bg-white dark:bg-gray-900 rounded-xl shadow-2xl w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-300 transition-colors duration-300">
                <div className="bg-indigo-600 dark:bg-indigo-700 p-8 text-white relative">
                    <AlertCircle className="h-12 w-12 mb-4 opacity-50" />
                    <h3 className="text-2xl font-black leading-tight">
                        Wait! You have leftovers from last week
                    </h3>
                    <p className="text-indigo-100 dark:text-indigo-200 mt-2 text-sm font-medium">
                        What would you like to do with these servings?
                    </p>
                </div>

                <div className="p-8 space-y-4">
                    <div className="bg-gray-50 dark:bg-gray-800 rounded-xl border border-gray-100 dark:border-gray-800 p-4 max-h-[40vh] overflow-y-auto space-y-3">
                        {leftovers.map((lo) => (
                            <div
                                key={`${lo.name}-${lo.instanceId}`}
                                className="flex flex-col bg-white dark:bg-gray-900 p-4 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 gap-3"
                            >
                                <div className="flex justify-between items-center">
                                    <span className="text-sm font-bold text-gray-700 dark:text-gray-200 truncate mr-4">
                                        {lo.name}
                                    </span>
                                    <span className="bg-indigo-100 dark:bg-indigo-900/50 text-indigo-700 dark:text-indigo-300 text-xs font-black px-2 py-1 rounded-full shrink-0">
                                        {lo.count} serving{lo.count > 1 ? 's' : ''} left
                                    </span>
                                </div>
                                <div className="grid grid-cols-3 gap-2">
                                    <button
                                        type="button"
                                        onClick={() => onTransfer(lo)}
                                        className="flex items-center justify-center p-2 bg-indigo-50 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400 hover:bg-indigo-600 dark:hover:bg-indigo-600 hover:text-white rounded-lg transition-all text-xs font-bold gap-1 group"
                                        title="Transfer to this week"
                                    >
                                        <ArrowRight className="h-3 w-3" /> Transfer
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onZeroOut(lo)}
                                        className="flex items-center justify-center p-2 bg-green-50 dark:bg-green-900/30 text-green-600 dark:text-green-400 hover:bg-green-600 dark:hover:bg-green-600 hover:text-white rounded-lg transition-all text-xs font-bold gap-1 group"
                                        title="Mark as consumed"
                                    >
                                        <CheckCircle2 className="h-3 w-3" /> Consumed
                                    </button>
                                    <button
                                        type="button"
                                        onClick={() => onIgnore(lo)}
                                        className="flex items-center justify-center p-2 bg-gray-50 dark:bg-gray-800 text-gray-400 dark:text-gray-500 hover:bg-gray-200 dark:hover:bg-gray-700 hover:text-gray-600 dark:hover:text-gray-300 rounded-lg transition-all text-xs font-bold"
                                        title="Ignore for now"
                                    >
                                        Ignore
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <button
                            type="button"
                            onClick={onTransferAll}
                            className="flex items-center justify-center gap-2 p-3 bg-indigo-600 dark:bg-indigo-700 text-white rounded-xl font-bold text-xs hover:bg-indigo-700 dark:hover:bg-indigo-600 transition-all shadow-md"
                        >
                            <ArrowRight className="h-4 w-4" /> Transfer All
                        </button>
                        <button
                            type="button"
                            onClick={onZeroOutAll}
                            className="flex items-center justify-center gap-2 p-3 bg-green-600 dark:bg-green-700 text-white rounded-xl font-bold text-xs hover:bg-green-700 dark:hover:bg-green-600 transition-all shadow-md"
                        >
                            <CheckCircle2 className="h-4 w-4" /> Consume All
                        </button>
                    </div>
                    <button
                        type="button"
                        onClick={onIgnoreAll}
                        className="w-full py-2 text-xs font-bold text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
                    >
                        Ignore all leftovers for this week
                    </button>
                </div>
            </div>
        </div>
    );
}
