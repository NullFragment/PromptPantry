import {Macros, Participant} from '../types';
import {calculateParticipantTargets, getParticipantStatus} from '../utils/mealPlanUtils';

interface ParticipantProgressProps {
    participant: Participant;
    currentMacros: Macros;
    compact?: boolean;
    showName?: boolean;
    stackMacrosInline?: boolean;
    showMacros?: boolean;
}

export function ParticipantProgress({participant, currentMacros, compact = false, showName = true, stackMacrosInline = false, showMacros = true}: ParticipantProgressProps) {
    const targets = calculateParticipantTargets(participant);

    const macroStatuses = [
        {label: 'P', current: currentMacros.protein, target: targets.protein, status: getParticipantStatus(currentMacros.protein, targets.protein)},
        {label: 'F', current: currentMacros.fat, target: targets.fat, status: getParticipantStatus(currentMacros.fat, targets.fat)},
        {label: 'C', current: currentMacros.carbs, target: targets.carbs, status: getParticipantStatus(currentMacros.carbs, targets.carbs)}
    ];

    const kcalStatus = getParticipantStatus(currentMacros.calories, targets.calories);

    const kcalText = `Kcal: ${Math.round(currentMacros.calories)} / ${Math.round(targets.calories)}`;


    if (compact) {
        return (
            <div className="flex flex-col gap-1">
                {showName && (
                    <div className="text-xs font-bold text-gray-400 dark:text-gray-500 uppercase truncate text-left"
                         title={participant.name}>{participant.name}</div>
                )}
                <div className={`text-[11px] font-black uppercase tracking-tighter text-left ${kcalStatus.color}`}
                     title={kcalText}>
                    {kcalText}
                </div>
                <div className="h-[6px] w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                    <div
                        className={`h-full ${kcalStatus.bg} transition-all`}
                        style={{width: `${Math.min(110, (currentMacros.calories / (targets.calories || 1)) * 100)}%`}}
                        title={kcalText}
                    />
                </div>
                {showMacros && (
                    stackMacrosInline ? (
                        <>
                            <div className="grid grid-cols-3 gap-1 text-[10px] font-black uppercase tracking-tighter mt-0.5">
                                {macroStatuses.map(({label, current, target, status}) => {
                                    const text = `${label}: ${Math.round(current)}/${Math.round(target)}`;
                                    return (
                                        <span key={label} className={`${status.color} truncate text-left`} title={text}>{text}</span>
                                    );
                                })}
                            </div>
                            <div className="flex gap-1 h-[4px] w-full">
                                {macroStatuses.map(({label, current, target, status}) => {
                                    const safeTarget = target || 1;
                                    const text = `${label}: ${Math.round(current)}/${Math.round(target)}`;
                                    return (
                                        <div key={label} className="flex-1 bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                data-testid="compact-macro-bar"
                                                className={`h-full ${status.bg} transition-all`}
                                                style={{width: `${Math.min(110, (current / safeTarget) * 100)}%`}}
                                                title={text}
                                            />
                                        </div>
                                    );
                                })}
                            </div>
                        </>
                    ) : (
                        <div className="flex flex-col gap-1 mt-0.5">
                            {macroStatuses.map(({label, current, target, status}) => {
                                const text = `${label}: ${Math.round(current)}/${Math.round(target)}`;
                                const safeTarget = target || 1;
                                return (
                                    <div key={label} className="flex flex-col gap-0.5">
                                        <span data-testid="compact-macro-label" className={`${status.color} text-[10px] font-black uppercase tracking-tighter truncate text-left`}
                                              title={text}>{text}</span>
                                        <div className="h-[4px] w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                                            <div
                                                data-testid="compact-macro-bar"
                                                className={`h-full ${status.bg} transition-all`}
                                                style={{width: `${Math.min(110, (current / safeTarget) * 100)}%`}}
                                                title={text}
                                            />
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )
                )}
            </div>
        );
    }

    return (
        <div className="space-y-2">
            <div className="text-xs font-bold text-gray-700 dark:text-gray-300"
                 title={participant.name}>{participant.name}</div>
            <div className={`text-[9px] font-black text-left ${kcalStatus.color}`} title={kcalText}>
                {kcalText}
            </div>
            <div className="h-[6px] w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full ${kcalStatus.bg} transition-all`}
                    style={{width: `${Math.min(110, (currentMacros.calories / (targets.calories || 1)) * 100)}%`}}
                    title={kcalText}
                />
            </div>
            {showMacros && (
                <div className="grid grid-cols-3 gap-1 w-full">
                    {macroStatuses.map(({label, current, target, status}) => (
                        <MacroProgress key={label} label={label} current={current} target={target} status={status}/>
                    ))}
                </div>
            )}
        </div>
    );
}

function MacroProgress({label, current, target, status}: {
    label: string;
    current: number;
    target: number;
    status: Status
}) {
    const safeTarget = target || 1;
    const text = `${label}: ${Math.round(current)}/${Math.round(target)}`;
    return (
        <div className="space-y-1">
            <div className={`text-[8px] font-bold uppercase text-left ${status.color}`} title={text}>
                {text}
            </div>
            <div className="h-[4px] w-full bg-gray-100 dark:bg-gray-800 rounded-full overflow-hidden">
                <div
                    className={`h-full ${status.bg} transition-all`}
                    style={{width: `${Math.min(110, (current / safeTarget) * 100)}%`}}
                    title={text}
                />
            </div>
        </div>
    );
}

type Status = { color: string; bg: string; diffPercent?: number };
