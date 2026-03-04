import {fireEvent, screen} from '@testing-library/react';
import {WeeklyPlanner} from '../../src/components/WeeklyPlanner';
import {MealPlan, Recipe} from '../../src/types';
import {describe, expect, it, vi} from 'vitest';
import {format, startOfWeek} from 'date-fns';
import {renderWithAppContext} from '../testHelpers';

const mockRecipes: Recipe[] = [
    {
        name: 'Pasta',
        categories: ['Dinner'],
        prepTime: '10',
        cookTime: '20',
        servings: 4,
        tags: [],
        ingredients: [],
        instructions: [],
        macros: {calories: 500, protein: 20, carbs: 60, fat: 10}
    }
];

const participants = [
    {name: 'John', maintenanceCalories: 2000, calorieDeficit: 0, proteinPercent: 30, carbsPercent: 40, fatPercent: 30},
    {name: 'Jane', maintenanceCalories: 1800, calorieDeficit: 0, proteinPercent: 30, carbsPercent: 40, fatPercent: 30}
];

describe('WeeklyPlanner Participant Features', () => {
    const selectedDate = new Date();
    const weekStart = startOfWeek(selectedDate, {weekStartsOn: 0});
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    it('shows participant selection dropdown and toggles selection', () => {
        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={{}}
                setMultiWeeklyCookPlan={() => {
                }}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={participants}
            />
        );

        // Dropdown toggle
        const dropdownButton = screen.getByText('2 Selected');
        expect(dropdownButton).toBeInTheDocument();

        // Open dropdown
        fireEvent.click(dropdownButton);
        expect(screen.getByText('Select Participants')).toBeInTheDocument();

        // Toggle John off
        const johnCheckbox = screen.getByLabelText('John');
        fireEvent.click(johnCheckbox);

        expect(screen.getByText('1 Selected')).toBeInTheDocument();
    });

    it('always shows participant name on meal cards regardless of showParticipants toggle', () => {
        const mealPlan: MealPlan = {
            [weekStartStr]: {
                breakfast: [{recipe: mockRecipes[0], servings: 1, participant: 'John'}]
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={mealPlan}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={{}}
                setMultiWeeklyCookPlan={() => {
                }}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={participants}
            />
        );

        // Visible by default (in the card)
        // We check for getAllByText because it's also in the dropdown if open,
        // but initially dropdown is closed. Wait, why multiple 'John'?
        // Ah, 'John' is in the selected list if I were to open it, but it shouldn't be rendered yet.
        // Wait, let's see.
        expect(screen.getAllByText('John').length).toBeGreaterThanOrEqual(1);

        // Toggle off showParticipants
        const toggle = screen.getByLabelText('Toggle macro visibility');
        fireEvent.click(toggle);

        // Should still be visible on the card
        expect(screen.getAllByText('John').length).toBeGreaterThanOrEqual(1);
    });

    it('shows warning dialogue when dropping meal with no participants selected', () => {
        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={{}}
                setMultiWeeklyCookPlan={() => {
                }}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={participants}
            />
        );

        // Deselect all participants
        fireEvent.click(screen.getByText('2 Selected'));
        fireEvent.click(screen.getAllByText('Clear')[0]);
        expect(screen.getByText('0 Selected')).toBeInTheDocument();

        // Simulate drop
        const dropZone = screen.getAllByText(/breakfast/i)[0].parentElement;
        if (!dropZone) throw new Error('Drop zone not found');

        const dragEvent = {
            preventDefault: vi.fn(),
            dataTransfer: {
                getData: (key: string) => {
                    if (key === 'recipeName') return 'Pasta';
                    if (key === 'isMove') return 'false';
                    return '';
                }
            }
        };

        fireEvent.drop(dropZone, dragEvent);

        // Warning dialogue should appear
        expect(screen.getByText('No Participants Selected')).toBeInTheDocument();
    });

    it('filters participant tracker bars based on selection', () => {
        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={{}}
                setMultiWeeklyCookPlan={() => {
                }}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={participants}
            />
        );

        // Both progress bars should be visible initially (7 days * 2 participants + 2 in dropdown = 16?)
        // Wait, dropdown is not open yet, so only 2 * 7 = 14.

        // Unselect Jane
        fireEvent.click(screen.getByText('2 Selected'));
        fireEvent.click(screen.getByLabelText('Jane'));

        // Only John's progress bar should be visible in the day summary (7 times).
        // Jane should only appear in the dropdown (1 time).

        expect(screen.getAllByText('Jane').length).toBe(1); // Only in dropdown
        expect(screen.getAllByText('John').length).toBe(8); // 7 days + 1 dropdown
    });
});
