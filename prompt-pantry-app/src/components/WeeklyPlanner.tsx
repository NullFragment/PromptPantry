import React, { useCallback, useMemo, useState } from 'react';
import { addWeeks, format, parseISO, subWeeks } from 'date-fns';
import { Calendar as CalendarIcon } from 'lucide-react';
import { MealPlan, MultiWeeklyCookPlan, Participant, Recipe } from '../types';
import { RecipePicker } from './RecipePicker';
import { DatePicker } from './DatePicker';
import { getUsedServingsForWeek } from '../utils/mealPlanUtils';
import { ConfirmationDialog } from './ConfirmationDialog';
import { DayColumn } from './WeeklyPlanner/DayColumn';
import { WeeklyRecipesSidebar } from './WeeklyPlanner/WeeklyRecipesSidebar';
import { QuickAddRecipeModal } from './WeeklyPlanner/QuickAddRecipeModal';
import { PlannerHeader } from './WeeklyPlanner/PlannerHeader';
import { LeftoverPromptModal } from './WeeklyPlanner/LeftoverPromptModal';
import {
    usePlannerWeek,
    usePlannerConfirmation,
    useWeeklyRecipeCards,
    useSlotMinHeights,
    useLeftoverPrompt,
    useWeeklyPlanActions,
    usePlannerDragDrop
} from './WeeklyPlanner/hooks';
import {useAppContext} from '../hooks/useAppContext';

interface WeeklyPlannerProps {
    recipes: Recipe[];
    mealPlan: MealPlan;
    setMealPlan: (mp: MealPlan | ((prev: MealPlan) => MealPlan)) => void;
    multiWeeklyCookPlan: MultiWeeklyCookPlan;
    setMultiWeeklyCookPlan: (mwcp: MultiWeeklyCookPlan | ((prev: MultiWeeklyCookPlan) => MultiWeeklyCookPlan)) => void;
    promptedRecipes: Record<string, string[]>;
    setPromptedRecipes: (pr: Record<string, string[]> | ((prev: Record<string, string[]>) => Record<string, string[]>)) => void;
    selectedDate: Date;
    setSelectedDate: (d: Date) => void;
    setSelectedRecipe: (data: { recipe: Recipe, highlightedIngredients?: string[] } | null) => void;
    participants: Participant[];
}

export function WeeklyPlanner({
                                  recipes,
                                  mealPlan,
                                  setMealPlan,
                                  multiWeeklyCookPlan,
                                  setMultiWeeklyCookPlan,
                                  promptedRecipes,
                                  setPromptedRecipes,
                                  selectedDate,
                                  setSelectedDate,
                                  setSelectedRecipe,
                                  participants
                              }: WeeklyPlannerProps) {
    const { canEdit } = useAppContext();
    const [showRecipePicker, setShowRecipePicker] = useState<string | null>(null);
    const [showDatePicker, setShowDatePicker] = useState(false);
    const [showParticipantSelector, setShowParticipantSelector] = useState(false);
    const [selectedParticipants, setSelectedParticipants] = useState<string[]>(participants.map(p => p.name));
    const [showMacros, setShowMacros] = useState(false);
    const [quickAddSlot, setQuickAddSlot] = useState<{ date: string; slot: string } | null>(null);
    const [quickAddSearch, setQuickAddSearch] = useState('');
    const participantSelectorRef = React.useRef<HTMLDivElement>(null);

    const { weekStart, weekEnd, weekDays, weekStartStr } = usePlannerWeek(selectedDate);
    const [confirmation, setConfirmation] = usePlannerConfirmation();

    React.useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (participantSelectorRef.current && !participantSelectorRef.current.contains(event.target as Node)) {
                setShowParticipantSelector(false);
            }
        };
        document.addEventListener('mousedown', handleClickOutside);
        return () => document.removeEventListener('mousedown', handleClickOutside);
    }, []);

    const currentWeeklyCookPlan = useMemo(() => {
        return multiWeeklyCookPlan[weekStartStr] || {};
    }, [multiWeeklyCookPlan, weekStartStr]);

    const weeklyRecipeCards = useWeeklyRecipeCards({
        currentWeeklyCookPlan,
        recipes,
        mealPlan,
        weekDays,
        multiWeeklyCookPlan
    });

    const {
        slotMinHeights,
        fallbackSlotMinHeights,
        baseSlotMinHeight,
        plannerContainerRef
    } = useSlotMinHeights({
        weekDays,
        mealPlan,
        participants,
        selectedParticipants
    });

    const {
        showLeftoverPrompt,
        leftovers,
        handleDoNothing,
        handleIndividualIgnore,
        handleIndividualZeroOut,
        handleIndividualTransfer,
        handleTransfer,
        handleZeroOut
    } = useLeftoverPrompt({
        weekStart,
        weekStartStr,
        multiWeeklyCookPlan,
        setMultiWeeklyCookPlan,
        promptedRecipes,
        setPromptedRecipes,
        mealPlan,
        canEdit,
        recipes
    });

    React.useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && showLeftoverPrompt) handleDoNothing();
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [showLeftoverPrompt, handleDoNothing]);

    const {
        handleAddRecipesToPlan: handleAddRecipesToPlanFromHook,
        handleRemoveRecipeFromPlan,
        handleUpdateMultiplier,
        handleClearBatch,
        handleClearWeeklyRecipes
    } = useWeeklyPlanActions({
        weekStart,
        weekStartStr,
        currentWeeklyCookPlan,
        multiWeeklyCookPlan,
        setMultiWeeklyCookPlan,
        mealPlan,
        setMealPlan,
        weekDays,
        setPromptedRecipes,
        setConfirmation,
        recipes,
        participants
    });

    const handleAddRecipesToPlan = useCallback(
        (selections: { recipe: Recipe; multiplier: number }[]) => {
            handleAddRecipesToPlanFromHook(selections);
            setShowRecipePicker(null);
        },
        [handleAddRecipesToPlanFromHook]
    );

    const allTags = useMemo(() => {
        const tags = new Set<string>();
        recipes.forEach(r => r.tags?.forEach(t => tags.add(t)));
        return Array.from(tags).sort();
    }, [recipes]);

    const selectedWeekRecipes = useMemo(() => {
        const recipeIds = new Set<string>();
        Object.values(currentWeeklyCookPlan).forEach(item => {
            if (item.recipeId) recipeIds.add(item.recipeId);
        });
        return Array.from(recipeIds)
            .map(recipeId => recipes.find(r => r.id === recipeId))
            .filter((r): r is Recipe => !!r);
    }, [currentWeeklyCookPlan, recipes]);

    const getUsedServings = React.useCallback((recipeId: string, date?: Date, instanceId?: string) => {
        const effectiveDate = date || parseISO(weekStartStr);
        return getUsedServingsForWeek(mealPlan, recipeId, effectiveDate, instanceId);
    }, [mealPlan, weekStartStr]);

    const {
        onDragStart,
        onMealDragStart,
        onDrop,
        onDragOver,
        handleQuickAddRecipe,
        handleRemoveSlotMeal,
        handleUpdateSlotServings
    } = usePlannerDragDrop({
        mealPlan,
        setMealPlan,
        multiWeeklyCookPlan,
        setMultiWeeklyCookPlan,
        currentWeeklyCookPlan,
        weekStartStr,
        weekDays,
        recipes,
        participants,
        selectedParticipants,
        setConfirmation,
        setQuickAddSlot,
        getUsedServings,
        canEdit
    });


    return (
        <div className="app-panel-padded overflow-visible">
            <PlannerHeader
                participantSelectorRef={participantSelectorRef}
                showParticipantSelector={showParticipantSelector}
                setShowParticipantSelector={setShowParticipantSelector}
                participants={participants}
                selectedParticipants={selectedParticipants}
                setSelectedParticipants={setSelectedParticipants}
                showMacros={showMacros}
                setShowMacros={setShowMacros}
                weekStart={weekStart}
                weekEnd={weekEnd}
                selectedDate={selectedDate}
                onCurrentWeek={() => setSelectedDate(new Date())}
                onPrevWeek={() => setSelectedDate(subWeeks(selectedDate, 1))}
                onNextWeek={() => setSelectedDate(addWeeks(selectedDate, 1))}
                onOpenDatePicker={() => setShowDatePicker(true)}
                canEdit={canEdit}
                onClearBatch={handleClearBatch}
            />

            <div className="flex flex-col lg:flex-row gap-8 transition-colors duration-300">
                <WeeklyRecipesSidebar
                    weeklyRecipeCards={weeklyRecipeCards}
                    hasAnyRecipes={Object.keys(currentWeeklyCookPlan).length > 0}
                    canEdit={canEdit}
                    onClear={handleClearWeeklyRecipes}
                    onAddRecipe={() => setShowRecipePicker('Recipe')}
                    onDragStart={onDragStart}
                    onRemove={handleRemoveRecipeFromPlan}
                    onUpdateMultiplier={handleUpdateMultiplier}
                    onViewRecipe={(recipe) => setSelectedRecipe({ recipe })}
                />

                {/* Right Column: Main Content Area */}
                <div ref={plannerContainerRef} className="flex-1 min-w-0 space-y-10">
                    {/* Weekly Plan */}
                    <div className="w-full flex flex-col">
                        <h3 className="eyebrow mb-4 flex items-center">
                            <CalendarIcon className="h-3 w-3 mr-2 text-indigo-500"/> Weekly Plan
                        </h3>
                        <div className="overflow-x-auto custom-scrollbar">
                            <div className="grid grid-cols-7 gap-3 min-w-[800px] pb-4">
                                {weekDays.map(day => {
                                    const dStr = format(day, 'yyyy-MM-dd');
                                    const dayPlan = mealPlan[dStr];
                                    return (
                                        <DayColumn
                                            key={day.toISOString()}
                                            day={day}
                                            dayPlan={dayPlan}
                                            participants={participants}
                                            selectedParticipants={selectedParticipants}
                                            showMacros={showMacros}
                                            slotMinHeights={slotMinHeights}
                                            fallbackSlotMinHeights={fallbackSlotMinHeights}
                                            baseSlotMinHeight={baseSlotMinHeight}
                                            canEdit={canEdit}
                                            onDrop={onDrop}
                                            onDragOver={onDragOver}
                                            onMealDragStart={onMealDragStart}
                                            onUpdateSlotServings={handleUpdateSlotServings}
                                            onRemoveSlotMeal={handleRemoveSlotMeal}
                                            onQuickAdd={(date, slot) => setQuickAddSlot({ date, slot })}
                                        />
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            {showRecipePicker && (
                <RecipePicker
                    recipes={recipes}
                    allTags={allTags}
                    showRecipePicker={showRecipePicker}
                    onClose={() => setShowRecipePicker(null)}
                    onSelect={handleAddRecipesToPlan}
                    selectedWeekRecipes={selectedWeekRecipes}
                    participants={participants}
                    mealPlan={mealPlan}
                    multiWeeklyCookPlan={multiWeeklyCookPlan}
                    weekDays={weekDays}
                />
            )}

            {showDatePicker && (
                <DatePicker
                    selectedDate={selectedDate}
                    onChange={setSelectedDate}
                    onClose={() => setShowDatePicker(false)}
                />
            )}

            <LeftoverPromptModal
                open={showLeftoverPrompt}
                leftovers={leftovers}
                onTransfer={(lo) =>
                    handleIndividualTransfer(
                        lo.name,
                        lo.count,
                        lo.fromWeek,
                        lo.allWeeks,
                        lo.instanceId,
                        lo.allInstances
                    )
                }
                onZeroOut={(lo) =>
                    handleIndividualZeroOut(
                        lo.name,
                        lo.count,
                        lo.fromWeek,
                        lo.allWeeks,
                        lo.allInstances
                    )
                }
                onIgnore={(lo) => handleIndividualIgnore(lo.name, lo.allInstances)}
                onTransferAll={handleTransfer}
                onZeroOutAll={handleZeroOut}
                onIgnoreAll={handleDoNothing}
            />

            {confirmation && (
                <ConfirmationDialog
                    title={confirmation.title}
                    message={confirmation.message}
                    confirmLabel={confirmation.confirmLabel}
                    cancelLabel={confirmation.cancelLabel}
                    onConfirm={confirmation.onConfirm}
                    onCancel={() => {
                        if (confirmation.onCancel) confirmation.onCancel();
                        setConfirmation(null);
                    }}
                    variant={confirmation.variant}
                />
            )}

            <QuickAddRecipeModal
                slot={quickAddSlot}
                searchQuery={quickAddSearch}
                onSearchChange={setQuickAddSearch}
                participants={participants.filter((p) => selectedParticipants.includes(p.name))}
                recipes={recipes}
                recipesInPlanIds={new Set(Object.values(currentWeeklyCookPlan).map((item) => item.recipeId))}
                onSelectRecipe={(recipe, participantName) => {
                    if (!quickAddSlot) return;
                    handleQuickAddRecipe(
                        recipe,
                        parseISO(quickAddSlot.date),
                        quickAddSlot.slot as keyof MealPlan[string],
                        participantName
                    );
                    setQuickAddSearch('');
                }}
                onClose={() => {
                    setQuickAddSlot(null);
                    setQuickAddSearch('');
                }}
            />
        </div>
    );
}
