import { ChevronDown, ChevronRight, Plus, X } from 'lucide-react';
import type { IngredientConversions } from '../../types';

const WEIGHT_UNITS = ['g', 'kg', 'oz', 'lb'];
const VOLUME_UNITS = ['ml', 'l', 'cup', 'tbsp', 'tsp', 'fl oz'];

interface ConversionsSectionProps {
    open: boolean;
    onToggleOpen: () => void;
    conversions: IngredientConversions | undefined;
    onConversionsChange: (conv: IngredientConversions) => void;
}

export function ConversionsSection({
    open,
    onToggleOpen,
    conversions = {},
    onConversionsChange
}: ConversionsSectionProps) {
    const setWeightToVolume = (wq: number, wu: string, vq: number, vu: string) => {
        onConversionsChange({
            ...conversions,
            weightToVolume: {
                weight: { quantity: wq, unit: wu },
                volume: { quantity: vq, unit: vu }
            }
        });
    };
    const clearWeightToVolume = () => {
        const next = { ...conversions };
        delete next.weightToVolume;
        onConversionsChange(next);
    };
    const setPortionToVolume = (pq: number, desc: string, vq: number, vu: string) => {
        onConversionsChange({
            ...conversions,
            portionToVolume: {
                portion: { quantity: pq, description: desc },
                volume: { quantity: vq, unit: vu }
            }
        });
    };
    const clearPortionToVolume = () => {
        const next = { ...conversions };
        delete next.portionToVolume;
        onConversionsChange(next);
    };

    const wv = conversions?.weightToVolume;
    const pv = conversions?.portionToVolume;

    return (
        <div>
            <button
                type="button"
                onClick={onToggleOpen}
                className="flex items-center gap-2 w-full text-left"
            >
                {open ? (
                    <ChevronDown className="h-4 w-4 text-gray-500" />
                ) : (
                    <ChevronRight className="h-4 w-4 text-gray-500" />
                )}
                <span className="text-xs font-bold text-gray-500 dark:text-gray-400 uppercase tracking-wider">
                    Conversions
                </span>
                {(wv || pv) && (
                    <span className="text-xs px-2 py-0.5 rounded-full bg-gray-200 dark:bg-gray-700 text-gray-600 dark:text-gray-400">
                        configured
                    </span>
                )}
            </button>
            {open && (
                <div className="mt-2 space-y-3 pl-6">
                    {wv ? (
                        <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-full">
                                Weight ↔ Volume
                            </span>
                            <input
                                type="number"
                                min={0.01}
                                step={0.1}
                                value={wv.weight?.quantity ?? ''}
                                onChange={(e) =>
                                    setWeightToVolume(
                                        parseFloat(e.target.value) || 0,
                                        wv.weight?.unit ?? 'g',
                                        wv.volume?.quantity ?? 1,
                                        wv.volume?.unit ?? 'cup'
                                    )
                                }
                                className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                placeholder="Qty"
                            />
                            <select
                                value={wv.weight?.unit ?? 'g'}
                                onChange={(e) =>
                                    setWeightToVolume(
                                        wv.weight?.quantity ?? 1,
                                        e.target.value,
                                        wv.volume?.quantity ?? 1,
                                        wv.volume?.unit ?? 'cup'
                                    )
                                }
                                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                            >
                                {WEIGHT_UNITS.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                            <span className="text-gray-400">=</span>
                            <input
                                type="number"
                                min={0.01}
                                step={0.1}
                                value={wv.volume?.quantity ?? ''}
                                onChange={(e) =>
                                    setWeightToVolume(
                                        wv.weight?.quantity ?? 1,
                                        wv.weight?.unit ?? 'g',
                                        parseFloat(e.target.value) || 0,
                                        wv.volume?.unit ?? 'cup'
                                    )
                                }
                                className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                placeholder="Qty"
                            />
                            <select
                                value={wv.volume?.unit ?? 'cup'}
                                onChange={(e) =>
                                    setWeightToVolume(
                                        wv.weight?.quantity ?? 1,
                                        wv.weight?.unit ?? 'g',
                                        wv.volume?.quantity ?? 1,
                                        e.target.value
                                    )
                                }
                                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                            >
                                {VOLUME_UNITS.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={clearWeightToVolume}
                                className="p-1.5 text-gray-400 hover:text-red-500"
                                title="Clear"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                setWeightToVolume(100, 'g', 1, 'cup')
                            }
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center"
                        >
                            <Plus className="h-4 w-4 mr-1" /> Add Weight↔Volume
                        </button>
                    )}
                    {pv ? (
                        <div className="flex flex-wrap items-center gap-2 p-2 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400 w-full">
                                Portion ↔ Volume
                            </span>
                            <input
                                type="number"
                                min={0.01}
                                step={0.1}
                                value={pv.portion?.quantity ?? ''}
                                onChange={(e) =>
                                    setPortionToVolume(
                                        parseFloat(e.target.value) || 0,
                                        pv.portion?.description ?? 'clove',
                                        pv.volume?.quantity ?? 1,
                                        pv.volume?.unit ?? 'tsp'
                                    )
                                }
                                className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                placeholder="Qty"
                            />
                            <input
                                type="text"
                                value={pv.portion?.description ?? ''}
                                onChange={(e) =>
                                    setPortionToVolume(
                                        pv.portion?.quantity ?? 1,
                                        e.target.value,
                                        pv.volume?.quantity ?? 1,
                                        pv.volume?.unit ?? 'tsp'
                                    )
                                }
                                className="w-24 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                placeholder="e.g. clove"
                            />
                            <span className="text-gray-400">=</span>
                            <input
                                type="number"
                                min={0.01}
                                step={0.1}
                                value={pv.volume?.quantity ?? ''}
                                onChange={(e) =>
                                    setPortionToVolume(
                                        pv.portion?.quantity ?? 1,
                                        pv.portion?.description ?? 'clove',
                                        parseFloat(e.target.value) || 0,
                                        pv.volume?.unit ?? 'tsp'
                                    )
                                }
                                className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                                placeholder="Qty"
                            />
                            <select
                                value={pv.volume?.unit ?? 'tsp'}
                                onChange={(e) =>
                                    setPortionToVolume(
                                        pv.portion?.quantity ?? 1,
                                        pv.portion?.description ?? 'clove',
                                        pv.volume?.quantity ?? 1,
                                        e.target.value
                                    )
                                }
                                className="px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm"
                            >
                                {VOLUME_UNITS.map((u) => (
                                    <option key={u} value={u}>{u}</option>
                                ))}
                            </select>
                            <button
                                type="button"
                                onClick={clearPortionToVolume}
                                className="p-1.5 text-gray-400 hover:text-red-500"
                                title="Clear"
                            >
                                <X className="h-4 w-4" />
                            </button>
                        </div>
                    ) : (
                        <button
                            type="button"
                            onClick={() =>
                                setPortionToVolume(1, 'clove', 1, 'tsp')
                            }
                            className="text-sm text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center"
                        >
                            <Plus className="h-4 w-4 mr-1" /> Add Portion↔Volume
                        </button>
                    )}
                </div>
            )}
        </div>
    );
}
