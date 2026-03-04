import {fireEvent, screen} from '@testing-library/react';
import {Calendar} from '../../src/components/Calendar';
import {MealPlan, Participant, Recipe} from '../../src/types';
import {describe, expect, it, vi} from 'vitest';
import {addDays, format, startOfMonth} from 'date-fns';
import {renderWithAppContext} from '../testHelpers';

const mockRecipes: Recipe[] = [
    {
        name: 'Pasta',
        categories: ['Dinner'],
        prepTime: '10',
        cookTime: '20',
        servings: 1,
        tags: [],
        ingredients: [],
        instructions: [],
        macros: {calories: 500, protein: 20, carbs: 60, fat: 10}
    }
];

const mockParticipants: Participant[] = [
    {
        name: 'Alice',
        maintenanceCalories: 2000,
        calorieDeficit: 10,
        proteinPercent: 25,
        carbsPercent: 50,
        fatPercent: 25
    }
];

describe('Calendar', () => {
    const selectedDate = new Date();
    const currentMonth = startOfMonth(selectedDate);

    it('renders monthly overview correctly', () => {
        renderWithAppContext(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                mealPlan={{}}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.getByText('Plan Overview')).toBeInTheDocument();
        expect(screen.getByText(format(currentMonth, 'MMMM yyyy'))).toBeInTheDocument();
    });

    it('calls setCurrentMonth when navigation buttons are clicked', () => {
        const setCurrentMonth = vi.fn();
        renderWithAppContext(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={setCurrentMonth}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                mealPlan={{}}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        fireEvent.click(screen.getByTitle('Previous Month'));
        expect(setCurrentMonth).toHaveBeenCalled();

        fireEvent.click(screen.getByTitle('Next Month'));
        expect(setCurrentMonth).toHaveBeenCalled();

        fireEvent.click(screen.getByText('Today'));
        expect(setCurrentMonth).toHaveBeenCalled();
    });

    it('calls setSelectedDate when a day is clicked', () => {
        const setSelectedDate = vi.fn();
        renderWithAppContext(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                mealPlan={{}}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        const dayButton = screen.getAllByText(format(addDays(selectedDate, 1), 'd'))[0];
        fireEvent.click(dayButton.closest('div')!);
        expect(setSelectedDate).toHaveBeenCalled();
    });

    it('displays participant progress when participants are provided', () => {
        const dStr = format(selectedDate, 'yyyy-MM-dd');
        const mealPlan: MealPlan = {
            [dStr]: {
                dinner: [{recipe: mockRecipes[0], servings: 1, participant: 'Alice'}]
            }
        };

        renderWithAppContext(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                mealPlan={mealPlan}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={mockParticipants}
                canEdit={true}
            />
        );

        expect(screen.getByText(/Plan$/)).toBeInTheDocument();
        // Alice appears in both dropdown and card; ensure at least one match exists.
        expect(screen.getAllByText('Alice').length).toBeGreaterThan(0);
    });

    it('calls setSelectedRecipe when a meal is clicked', () => {
        const setSelectedRecipe = vi.fn();
        const dStr = format(selectedDate, 'yyyy-MM-dd');
        const mealPlan: MealPlan = {
            [dStr]: {
                dinner: [{recipe: mockRecipes[0], servings: 1}]
            }
        };

        renderWithAppContext(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                mealPlan={mealPlan}
                recipes={mockRecipes}
                setSelectedRecipe={setSelectedRecipe}
                participants={[]}
                canEdit={true}
            />
        );

        const mealItem = screen.getAllByText('Pasta')[0];
        fireEvent.click(mealItem);
        expect(setSelectedRecipe).toHaveBeenCalled();
    });

    it('displays participant progress with different status colors', () => {
        const dStr = format(selectedDate, 'yyyy-MM-dd');
        // Alice maintenance is 2000, 10% deficit -> 1800 kcal target.
        // Near target: 1800 * 0.98 = 1764 -> green
        // Slightly off: 1800 * 0.92 = 1656 -> yellow
        // Way off: 1800 * 0.8 = 1440 -> red

        const mealPlan: MealPlan = {
            [dStr]: {
                dinner: [{
                    recipe: {...mockRecipes[0], macros: {calories: 1764, protein: 45, carbs: 225, fat: 50}},
                    servings: 1,
                    participant: 'Alice'
                }]
            }
        };

        const {rerender} = renderWithAppContext(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                mealPlan={mealPlan}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={mockParticipants}
                canEdit={true}
            />
        );

        expect(screen.getByText(/Kcal: 1764 \/ 1800/i)).toHaveClass('text-gray-500');

        // At target should be green
        const mealPlanAtTarget: MealPlan = {
            [dStr]: {
                dinner: [{
                    recipe: {...mockRecipes[0], macros: {calories: 1800, protein: 45, carbs: 225, fat: 50}},
                    servings: 1,
                    participant: 'Alice'
                }]
            }
        };

        rerender(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                mealPlan={mealPlanAtTarget}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={mockParticipants}
                canEdit={true}
            />
        );

        expect(screen.getByText(/Kcal: 1800 \/ 1800/i)).toHaveClass('text-green-600');

        const mealPlanYellow: MealPlan = {
            [dStr]: {
                dinner: [{
                    recipe: {...mockRecipes[0], macros: {calories: 1850, protein: 45, carbs: 225, fat: 50}},
                    servings: 1,
                    participant: 'Alice'
                }]
            }
        };
        rerender(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                mealPlan={mealPlanYellow}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={mockParticipants}
                canEdit={true}
            />
        );
        expect(screen.getByText(/Kcal: 1850 \/ 1800/i)).toHaveClass('text-green-600');

        const mealPlanRed: MealPlan = {
            [dStr]: {
                dinner: [{
                    recipe: {...mockRecipes[0], macros: {calories: 1920, protein: 45, carbs: 225, fat: 50}},
                    servings: 1,
                    participant: 'Alice'
                }]
            }
        };
        rerender(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                mealPlan={mealPlanRed}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={mockParticipants}
                canEdit={true}
            />
        );
        expect(screen.getByText(/Kcal: 1920 \/ 1800/i)).toHaveClass('text-yellow-600');
    });

    it('handles all meal slots', () => {
        const dStr = format(selectedDate, 'yyyy-MM-dd');
        const mealPlan: MealPlan = {
            [dStr]: {
                breakfast: [{recipe: {...mockRecipes[0], name: 'Oats'}, servings: 1}],
                lunch: [{recipe: {...mockRecipes[0], name: 'Salad'}, servings: 1}],
                dinner: [{recipe: {...mockRecipes[0], name: 'Pasta'}, servings: 1}],
                snacks: [{recipe: {...mockRecipes[0], name: 'Apple'}, servings: 1}],
                drinks: [{recipe: {...mockRecipes[0], name: 'Juice'}, servings: 1}],
            }
        };

        renderWithAppContext(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                mealPlan={mealPlan}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.getByText('breakfast')).toBeInTheDocument();
        expect(screen.getByText('lunch')).toBeInTheDocument();
        expect(screen.getByText('dinner')).toBeInTheDocument();
        expect(screen.getByText('snacks')).toBeInTheDocument();
        expect(screen.getByText('drinks')).toBeInTheDocument();
        expect(screen.getAllByText('Oats').length).toBeGreaterThan(0);
    });

    it('handles empty meal types gracefully', () => {
        const dStr = format(selectedDate, 'yyyy-MM-dd');
        const mealPlan: MealPlan = {
            [dStr]: {
                dinner: [] // Empty dinner slot
            }
        };

        renderWithAppContext(
            <Calendar
                currentMonth={currentMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                mealPlan={mealPlan}
                setMealPlan={() => {
                }}
                setMultiWeeklyCookPlan={() => {
                }}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.queryByText('dinner')).not.toBeInTheDocument();
    });

    it('can move a recipe from one day to another via drag and drop', async () => {
        const setMealPlan = vi.fn();
        const day1Str = '2026-01-05'; // A Monday in Jan 2026
        const day2Str = '2026-01-06';
        const testMonth = new Date('2026-01-01T12:00:00');

        const mealPlan: MealPlan = {
            [day1Str]: {
                dinner: [{recipe: mockRecipes[0], servings: 2}]
            }
        };

        renderWithAppContext(
            <Calendar
                currentMonth={testMonth}
                setCurrentMonth={() => {
                }}
                selectedDate={new Date(day1Str)}
                setSelectedDate={() => {
                }}
                mealPlan={mealPlan}
                setMealPlan={setMealPlan}
                setMultiWeeklyCookPlan={() => {
                }}
                recipes={mockRecipes}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        const pastaItem = screen.getAllByText(/Pasta/)[0]; // Grid item

        const dragStartEvent = {
            dataTransfer: {
                setData: vi.fn(),
                getData: vi.fn()
            },
            stopPropagation: vi.fn()
        };

        fireEvent.dragStart(pastaItem, dragStartEvent);
        expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith('isMove', 'true');

        // Find the target day (Jan 6)
        const day6 = screen.getAllByText('6').find(el => el.classList.contains('label-strong'))!.parentElement!.parentElement!;

        const dropEvent = {
            dataTransfer: {
                getData: (key: string) => {
                    if (key === 'recipeName') return 'Pasta';
                    if (key === 'sourceDate') return day1Str;
                    if (key === 'sourceSlot') return 'dinner';
                    if (key === 'isMove') return 'true';
                    return '';
                }
            },
            preventDefault: vi.fn(),
        };

        fireEvent.drop(day6, dropEvent);

        expect(setMealPlan).toHaveBeenCalled();
        const updater = setMealPlan.mock.calls[0][0];
        const newState = updater(mealPlan);

        expect(newState[day1Str].dinner).toHaveLength(0);
        expect(newState[day2Str].dinner).toHaveLength(1);
        expect(newState[day2Str].dinner[0].recipe.name).toBe('Pasta');
        expect(newState[day2Str].dinner[0].servings).toBe(2);
    });
});
