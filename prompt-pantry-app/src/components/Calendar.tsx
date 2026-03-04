import React, {useState} from 'react';
import {
    addDays,
    addMonths,
    endOfMonth,
    endOfWeek,
    format,
    isBefore,
    isSameDay,
    isSameMonth,
    startOfMonth,
    startOfToday,
    startOfWeek,
    subMonths
} from 'date-fns';
import {Calendar as CalendarIcon, ChevronLeft, ChevronRight, Info, RotateCcw, Utensils} from 'lucide-react';
import {MealPlan, MultiWeeklyCookPlan, Participant, Recipe} from '../types';
import {ALL_MEAL_TYPES, calculateDayTotals} from '../utils/mealPlanUtils';
// Helper to render participant name possessively
const getPossessive = (name: string) => name.endsWith('s') ? `${name}'` : `${name}'s`;
import {ParticipantProgress} from './ParticipantProgress';
import {ConfirmationDialog} from './ConfirmationDialog';
import {getMealTypeStyle, MealTypeKey} from '../styles/designTokens';
import {useAppContext} from '../hooks/useAppContext';
import {useConfirmation} from '../hooks/useConfirmation';

interface MealEntryProps {
    meal: {recipe: Recipe; servings: number; participant?: string; recipeInstanceId?: string};
    type: string;
    dateStr: string;
    typeStyle: string;
    onDragStart: (e: React.DragEvent, meal: {recipe: Recipe; servings: number; participant?: string; recipeInstanceId?: string}, dateStr: string, type: string) => void;
    onClick: (meal: {recipe: Recipe; servings: number; participant?: string; recipeInstanceId?: string}) => void;
    canEdit: boolean;
    icon?: string;
}

const MealEntry = ({meal, type, dateStr, typeStyle, onDragStart, onClick, canEdit, icon}: MealEntryProps) => (
    <div
        draggable={canEdit}
        onDragStart={(e) => {
            if (!canEdit) return;
            e.stopPropagation();
            onDragStart(e, meal, dateStr, type);
        }}
        onClick={(e) => {
            e.stopPropagation();
            onClick(meal);
        }}
        className={`group flex items-center justify-between p-2 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-800 border border-transparent hover:border-gray-100 dark:hover:border-gray-700 transition-all ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'}`}
        title={meal.recipe.name}
    >
        <div className="flex items-center gap-3 min-w-0">
            <div className={`w-8 h-8 rounded-lg ${typeStyle} flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0`}>
                <Utensils className="h-4 w-4" />
            </div>
            <div className="truncate">
                <div className="text-xs font-bold text-gray-800 dark:text-gray-200 truncate leading-tight">{meal.recipe.name}</div>
                <div className="text-[10px] text-gray-400 dark:text-gray-500 font-medium">{meal.recipe.macros.calories} kcal</div>
                <div className="text-[9px] text-gray-400 dark:text-gray-500 font-semibold truncate">
                    P {meal.recipe.macros.protein}g · C {meal.recipe.macros.carbs}g · F {meal.recipe.macros.fat}g
                </div>
            </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
            {meal.participant && (
                <span className="text-sm" title={meal.participant}>{icon || '👤'}</span>
            )}
            <Info className="h-4 w-4 text-gray-300 dark:text-gray-600 group-hover:text-indigo-400" />
        </div>
    </div>
);

type MealItem = {recipe: Recipe; servings: number; participant?: string; recipeInstanceId?: string};

interface DaySidebarMealsProps {
    dayPlan: MealPlan[string] | undefined;
    dateStr: string;
    participantFilter?: string;
    participants: Participant[];
    canEdit: boolean;
    onDragStart: (e: React.DragEvent, recipeName: string, dateStr: string, type: string, instanceId?: string, participant?: string) => void;
    onMealClick: (meal: MealItem) => void;
    expandMealsByServings: (meals: NonNullable<MealPlan[string][MealTypeKey]>) => MealItem[];
}

function DaySidebarMeals({
    dayPlan, dateStr, participantFilter, participants, canEdit,
    onDragStart, onMealClick, expandMealsByServings
}: DaySidebarMealsProps) {
    return (
        <div className="space-y-3">
            {ALL_MEAL_TYPES.map(type => {
                const allMeals = dayPlan?.[type];
                if (!allMeals || allMeals.length === 0) return null;
                const meals = participantFilter
                    ? allMeals.filter(m => m.participant === participantFilter)
                    : allMeals;
                if (!meals.length) return null;
                const typeStyle = getMealTypeStyle(type as MealTypeKey);
                return (
                    <div key={`${participantFilter ?? 'all'}-${type}`}>
                        <div className="label-strong mb-1 capitalize flex items-center gap-2">
                            {participantFilter && <span className={`w-2 h-2 rounded-full ${typeStyle.split(' ')[0]}`}></span>}
                            {type}
                        </div>
                        <div className="space-y-2">
                            {expandMealsByServings(meals).map((meal, idx) => (
                                <MealEntry
                                    key={`${participantFilter ?? 'all'}-${type}-${idx}`}
                                    meal={meal}
                                    type={type}
                                    dateStr={dateStr}
                                    typeStyle={typeStyle}
                                    onDragStart={(e, m, date, t) => onDragStart(e, m.recipe.name, date, t, m.recipeInstanceId, m.participant)}
                                    onClick={onMealClick}
                                    canEdit={canEdit}
                                    icon={meal.participant ? participants.find(p => p.name === meal.participant)?.icon : undefined}
                                />
                            ))}
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

interface CalendarProps {
    currentMonth: Date;
    setCurrentMonth: (d: Date) => void;
    selectedDate: Date;
    setSelectedDate: (d: Date) => void;
    mealPlan: MealPlan;
    setMealPlan: (mp: MealPlan | ((prev: MealPlan) => MealPlan)) => void;
    setMultiWeeklyCookPlan: (mwcp: MultiWeeklyCookPlan | ((prev: MultiWeeklyCookPlan) => MultiWeeklyCookPlan)) => void;
    recipes: Recipe[];
    setSelectedRecipe: (data: { recipe: Recipe, highlightedIngredients?: string[] } | null) => void;
    participants: Participant[];
}

export function Calendar({
                             currentMonth,
                             setCurrentMonth,
                             selectedDate,
                             setSelectedDate,
                             mealPlan,
                             setMealPlan,
                             setMultiWeeklyCookPlan,
                             recipes,
                             setSelectedRecipe,
                             participants
                         }: CalendarProps) {
    const { canEdit } = useAppContext();
    const { confirmation, show: showConfirmation, dismiss: dismissConfirmation, handleCancel: handleConfirmationCancel } = useConfirmation();
    const [participantFilter, setParticipantFilter] = useState<string>('all');

    const monthStart = startOfMonth(currentMonth);
    const monthEnd = endOfMonth(monthStart);
    const startDate = startOfWeek(monthStart, {weekStartsOn: 0});
    const endDate = endOfWeek(monthEnd, {weekStartsOn: 0});

    const calendarDays = [];
    let day = startDate;
    while (day <= endDate) {
        calendarDays.push(day);
        day = addDays(day, 1);
    }

    const filteredParticipants = participantFilter === 'all'
        ? participants
        : participants.filter(p => p.name === participantFilter);

    const onMealDragStart = (e: React.DragEvent, recipeName: string, sourceDate: string, sourceSlot: string, recipeInstanceId?: string, participant?: string) => {
        e.dataTransfer.setData('recipeName', recipeName);
        e.dataTransfer.setData('sourceDate', sourceDate);
        e.dataTransfer.setData('sourceSlot', sourceSlot);
        e.dataTransfer.setData('isMove', 'true');
        if (recipeInstanceId) e.dataTransfer.setData('recipeInstanceId', recipeInstanceId);
        if (participant) e.dataTransfer.setData('participant', participant);
    };

    const onDrop = (e: React.DragEvent, date: Date, targetSlot?: keyof MealPlan[string]) => {
        e.preventDefault();
        if (!canEdit) return;
        const recipeName = e.dataTransfer.getData('recipeName');
        const sourceDateStr = e.dataTransfer.getData('sourceDate');
        const sourceSlot = e.dataTransfer.getData('sourceSlot') as keyof MealPlan[string];
        const isMove = e.dataTransfer.getData('isMove') === 'true';
        const recipeInstanceId = e.dataTransfer.getData('recipeInstanceId') || undefined;
        const participant = e.dataTransfer.getData('participant') || undefined;

        const targetDateStr = format(date, 'yyyy-MM-dd');
        const finalTargetSlot = targetSlot || sourceSlot || 'dinner';

        if (isMove && sourceDateStr === targetDateStr && sourceSlot === finalTargetSlot) return;

        const recipe = recipes.find(r => r.name === recipeName);
        if (!recipe) return;

        // Find the specific meal being moved using recipeInstanceId and participant
        const sourceMeal = isMove
            ? mealPlan[sourceDateStr]?.[sourceSlot]?.find(m =>
                m.recipe.name === recipeName &&
                (!recipeInstanceId || m.recipeInstanceId === recipeInstanceId) &&
                (!participant || m.participant === participant)
            )
            : null;
        const servingsToMove = sourceMeal?.servings || 1;

        setMealPlan(prev => {
            const newPlan = {...prev};

            if (isMove) {
                const sourceDayPlan = {...(newPlan[sourceDateStr] || {})};
                const sourceMeals = Array.isArray(sourceDayPlan[sourceSlot]) ? sourceDayPlan[sourceSlot] : [];
                // Filter using recipeInstanceId and participant for precise matching
                sourceDayPlan[sourceSlot] = sourceMeals.filter(m =>
                    !(m.recipe.name === recipeName &&
                      (!recipeInstanceId || m.recipeInstanceId === recipeInstanceId) &&
                      (!participant || m.participant === participant))
                );
                newPlan[sourceDateStr] = sourceDayPlan;
            }

            const targetDayPlan = {...(newPlan[targetDateStr] || {})};
            let slotMeals = targetDayPlan[finalTargetSlot];
            if (!Array.isArray(slotMeals)) {
                slotMeals = [];
            }

            // Find existing meal matching by recipeName, recipeInstanceId, and participant
            const existingMealIndex = slotMeals.findIndex(m =>
                m.recipe.name === recipeName &&
                (!recipeInstanceId || m.recipeInstanceId === recipeInstanceId) &&
                (!participant || m.participant === participant)
            );
            if (existingMealIndex !== -1) {
                slotMeals = slotMeals.map((m, i) =>
                    i === existingMealIndex ? {...m, servings: m.servings + servingsToMove} : m
                );
            } else {
                // Preserve recipeInstanceId and participant when adding to target
                slotMeals = [...slotMeals, {
                    recipe,
                    servings: servingsToMove,
                    ...(recipeInstanceId && { recipeInstanceId }),
                    ...(participant && { participant })
                }];
            }

            targetDayPlan[finalTargetSlot] = slotMeals;
            newPlan[targetDateStr] = targetDayPlan;
            return newPlan;
        });
    };

    const expandMealsByServings = (meals: NonNullable<MealPlan[string][MealTypeKey]> = []) =>
        meals.flatMap(meal => Array.from({length: Math.max(1, meal.servings || 1)}, () => ({...meal, servings: 1})));

    return (
        <div className="app-panel-padded overflow-hidden">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-8">
                <h2 className="section-title">
                    <CalendarIcon className="h-8 w-8 text-indigo-600 shrink-0"/>
                    <span className="truncate">Plan Overview</span>
                </h2>

                <div className="flex flex-wrap items-stretch gap-2 sm:gap-4 w-full sm:w-auto">
                    {canEdit && (
                        <button
                            onClick={() => {
                                showConfirmation({
                                    title: 'Clear All Meals',
                                    message: 'Are you sure you want to clear the entire meal plan and all weekly cook plans? This action cannot be undone.',
                                    confirmLabel: 'Clear Everything',
                                    variant: 'danger',
                                    onConfirm: () => {
                                        setMealPlan({});
                                        setMultiWeeklyCookPlan({});
                                        dismissConfirmation();
                                    }
                                });
                            }}
                            className="btn-danger-soft flex-1 sm:flex-none"
                        >
                            <RotateCcw className="h-4 w-4 mr-2"/> Clear Plan
                        </button>
                    )}

                    <button
                        onClick={() => setCurrentMonth(new Date())}
                        className="btn-ghost flex-1 sm:flex-none"
                    >
                        Today
                    </button>

                    <div className="muted-surface rounded-lg p-1 flex items-center flex-1 sm:flex-none justify-between">
                        <button
                            onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
                            className="p-1.5 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Previous Month"
                        >
                            <ChevronLeft className="h-5 w-5"/>
                        </button>

                        <div className="px-3 flex flex-col items-center justify-center min-w-[100px] sm:min-w-[140px]">
                            <span
                                className="label-strong leading-none mb-1 text-[8px] sm:text-[10px]">Monthly View</span>
                            <span
                                className="text-[10px] sm:text-xs font-bold text-gray-700 dark:text-gray-300 whitespace-nowrap">
                {format(currentMonth, 'MMMM yyyy')}
              </span>
                        </div>

                        <button
                            onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
                            className="p-1.5 hover:bg-white dark:hover:bg-gray-700 hover:shadow-sm rounded-md transition-all text-gray-500 dark:text-gray-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                            title="Next Month"
                        >
                            <ChevronRight className="h-5 w-5"/>
                        </button>
                    </div>
                </div>
            </div>

            <div className="flex flex-col lg:flex-row gap-8 transition-colors duration-300">
                <div className="flex-1 min-w-0">
                    <div
                        className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 overflow-x-auto custom-scrollbar">
                        <div className="min-w-[600px]">
                            <div
                                className="grid grid-cols-7 bg-gray-50 dark:bg-gray-800/50 border-b dark:border-gray-800">
                                {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map(d => (
                                    <div key={d} className="py-3 text-center eyebrow">{d}</div>
                                ))}
                            </div>
                            <div className="grid grid-cols-7">
                                {calendarDays.map((date, idx) => {
                                    const dStr = format(date, 'yyyy-MM-dd');
                                    const plan = mealPlan[dStr];
                                    const isSelected = selectedDate && isSameDay(date, selectedDate);
                                    const isToday = isSameDay(date, new Date());
                                    const isPast = isBefore(date, startOfToday());


                                    return (
                                        <div
                                            key={idx}
                                            onClick={() => setSelectedDate(date)}
                                            onDragOver={(e) => e.preventDefault()}
                                            onDrop={(e) => onDrop(e, date)}
                                            className={`min-h-[100px] sm:min-h-[130px] p-2 border-b border-r dark:border-gray-800 last:border-r-0 cursor-pointer transition-all ${
                                                !isSameMonth(date, monthStart) || isPast ? 'bg-gray-50/50 dark:bg-gray-900/50 text-gray-400 dark:text-gray-600' : 'text-gray-900 dark:text-gray-100'
                                            } ${isSelected ? 'bg-indigo-50/50 dark:bg-indigo-900/20 ring-2 ring-inset ring-indigo-500 z-10' : 'hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}
                                        >
                                            <div className="flex justify-between items-start mb-1">
                        <span
                            className={`label-strong text-xs sm:text-sm w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center rounded-full ${
                                isToday ? 'bg-indigo-600 text-white' : ''
                            }`}>{format(date, 'd')}</span>
                                            </div>

                                            <div className="space-y-1">
                                                {ALL_MEAL_TYPES.map(type => {
                                                    const slots = plan?.[type];
                                                    if (!slots || slots.length === 0) return null;
                                                    const typeStyle = getMealTypeStyle(type as MealTypeKey);
                                                    return expandMealsByServings(slots).map((meal, mIdx) => (
                                                        <div
                                                            key={`${type}-${mIdx}`}
                                                            draggable={canEdit}
                                                            onDragStart={(e) => {
                                                                if (!canEdit) return;
                                                                e.stopPropagation();
                                                                onMealDragStart(e, meal.recipe.name, dStr, type, meal.recipeInstanceId, meal.participant);
                                                            }}
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                setSelectedRecipe({recipe: meal.recipe});
                                                            }}
                                                            className={`text-[9px] sm:text-[10px] p-0.5 sm:p-1 rounded font-bold border truncate ${canEdit ? 'cursor-grab active:cursor-grabbing' : 'cursor-pointer'} ${
                                                                isPast ? `${typeStyle} opacity-60` : `${typeStyle} hover:opacity-80`
                                                            }`}
                                                            title={meal.recipe.name}
                                                        >
                                                            <div className="flex justify-between items-center gap-1 min-w-0">
                                                                <span className="truncate">{meal.recipe.name}</span>
                                                                {meal.participant && (
                                                                    <span className="shrink-0" title={meal.participant}>
                                                                        {participants.find(p => p.name === meal.participant)?.icon || '👤'}
                                                                    </span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    ));
                                                 })}
                                             </div>
                                         </div>
                                     );
                                 })}
                            </div>
                        </div>
                    </div>
                </div>

                <div className="w-full lg:w-80 space-y-6">
                     {selectedDate ? (
                         <div className="app-panel p-4 sm:p-6 lg:sticky lg:top-24 transition-colors duration-300">
                             <div className="flex flex-col gap-3 mb-4">
                                 <h3 className="text-lg font-black text-gray-900 dark:text-gray-100">{format(selectedDate, 'EEEE, MMM do')}</h3>
                                 {participants.length > 0 && (
                                     <label className="text-[11px] font-semibold text-gray-500 dark:text-gray-400 flex items-center gap-2">
                                         <span className="shrink-0">Participant</span>
                                         <select
                                             value={participantFilter}
                                             onChange={(e) => setParticipantFilter(e.target.value)}
                                             className="w-full text-xs px-2 py-1.5 rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 text-gray-800 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/30"
                                         >
                                             <option value="all">All participants</option>
                                             {participants.map(p => (
                                                 <option key={p.name} value={p.name}>{p.name}</option>
                                             ))}
                                         </select>
                                     </label>
                                 )}
                             </div>

                             {participants.length === 0 && (() => {
                                  const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
                                  return (
                                      <div className="mb-4">
                                          <DaySidebarMeals
                                              dayPlan={mealPlan[selectedDateStr]}
                                              dateStr={selectedDateStr}
                                              participants={participants}
                                              canEdit={canEdit}
                                              onDragStart={onMealDragStart}
                                              onMealClick={(m) => setSelectedRecipe({recipe: m.recipe})}
                                              expandMealsByServings={expandMealsByServings}
                                          />
                                      </div>
                                  );
                              })()}

                             {filteredParticipants.length > 0 && (
                                 <h4 className="label-strong mb-2">{participantFilter === 'all' ? 'Participant Plans' : `${getPossessive(filteredParticipants[0].name)} Plan`}</h4>
                             )}
                             {filteredParticipants.map(p => {
                                   const selectedDateStr = format(selectedDate, 'yyyy-MM-dd');
                                   const selectedDayPlan = mealPlan[selectedDateStr];
                                   const pDayTotals = calculateDayTotals(selectedDayPlan, [p.name]);

                                   return (
                                        <div key={p.name} className="border border-gray-100 dark:border-gray-800 rounded-xl p-3 sm:p-4 mb-4 bg-gray-50/60 dark:bg-gray-900/40">
                                           <div className="flex items-start gap-2 min-w-0">
                                               <span className="text-lg sm:text-xl" title={p.name}>{p.icon || '👤'}</span>
                                               <div className="min-w-0">
                                                   <div className="text-sm font-bold text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                                               </div>
                                           </div>

                                          <div className="mt-3">
                                              <ParticipantProgress participant={p} currentMacros={pDayTotals} compact stackMacrosInline showName={false} />
                                          </div>

                                          <div className="mt-3">
                                              <DaySidebarMeals
                                                  dayPlan={selectedDayPlan}
                                                  dateStr={selectedDateStr}
                                                  participantFilter={p.name}
                                                  participants={participants}
                                                  canEdit={canEdit}
                                                  onDragStart={onMealDragStart}
                                                  onMealClick={(m) => setSelectedRecipe({recipe: m.recipe})}
                                                  expandMealsByServings={expandMealsByServings}
                                              />
                                          </div>
                                      </div>
                                  );
                              })}
                        </div>
                    ) : (
                        <div
                            className="bg-white dark:bg-gray-900 rounded-xl shadow-sm border border-gray-100 dark:border-gray-800 p-8 text-center transition-colors duration-300">
                            <div
                                className="w-16 h-16 bg-indigo-50 dark:bg-indigo-900/20 rounded-full flex items-center justify-center text-indigo-200 dark:text-indigo-800 mx-auto mb-4">
                                <Utensils className="h-8 w-8"/>
                            </div>
                            <h3 className="text-sm font-bold text-gray-900 dark:text-gray-100 mb-1">No meals
                                planned</h3>
                            <p className="text-xs text-gray-400 dark:text-gray-500">Select a day to see nutrition
                                details</p>
                        </div>
                    )}
                </div>
            </div>

            {confirmation && (
                <ConfirmationDialog
                    {...confirmation}
                    onCancel={handleConfirmationCancel}
                />
            )}
        </div>
    );
}

