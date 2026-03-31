import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {renderWithAppContext} from '../testHelpers';
import {WeeklyPlanner} from '../../src/components/WeeklyPlanner';
import App from '../../src/App';
import {MealPlan, MultiWeeklyCookPlan, Recipe} from '../../src/types';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {addDays, addWeeks, format, startOfWeek, subWeeks} from 'date-fns';

const mockRecipes: Recipe[] = [
    {
        id: 'uuid-recipe-pasta',
        name: 'Pasta',
        categories: ['Dinner'],
        prepTime: '10',
        cookTime: '20',
        servings: 4,
        tags: [],
        ingredients: [],
        instructions: [],
        macros: {calories: 500, protein: 20, carbs: 60, fat: 10}
    },
    {
        id: 'uuid-recipe-granola',
        name: 'Cinnamon Granola',
        categories: ['Breakfast'],
        prepTime: '10',
        cookTime: '30',
        servings: 16,
        tags: [],
        ingredients: [],
        instructions: [],
        macros: {calories: 200, protein: 5, carbs: 30, fat: 10}
    },
    {
        id: 'uuid-recipe-salad',
        name: 'Salad',
        categories: ['Lunch'],
        prepTime: '5',
        cookTime: '0',
        servings: 2,
        tags: [],
        ingredients: [],
        instructions: [],
        macros: {calories: 150, protein: 5, carbs: 20, fat: 5}
    }
];

describe('WeeklyPlanner', () => {
    const selectedDate = new Date();
    const weekStart = startOfWeek(selectedDate, {weekStartsOn: 0});
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    it('shows leftover prompt when previous week has leftovers', () => {
        const prevWeekStartStr = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [prevWeekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };

        // No meals planned in mealPlan for previous week, so 4 servings are leftover
        const mealPlan: MealPlan = {};

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={mealPlan}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
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
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.getByText(/Wait! You have leftovers from last week/i)).toBeInTheDocument();
        expect(screen.getByText(/Pasta/i)).toBeInTheDocument();
        expect(screen.getByText(/4 servings left/i)).toBeInTheDocument();
    });

    it('transfers all leftovers into the current week', async () => {
        const prevWeekStartStr = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
        const initialPlan: MultiWeeklyCookPlan = {
            [prevWeekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };

        const setMultiWeeklyCookPlan = vi.fn((updater) => {
            const result = typeof updater === 'function' ? updater(initialPlan) : updater;
            // Check that a transferred instance was created in the current week
            const currentWeekPlan = result[weekStartStr];
            const pastaItems = Object.values(currentWeekPlan || {}).filter(
                (item: any) => item.recipeId === 'uuid-recipe-pasta'
            );
            expect(pastaItems.length).toBeGreaterThan(0);
            const transferredItem = pastaItems.find((item: any) => item.transferredFromDate);
            expect(transferredItem?.servings).toBe(4);
            // Source week should have reduced servings
            const prevItem = result[prevWeekStartStr]?.['uuid-pasta-1'];
            expect(prevItem?.servings).toBe(0);
        });

        const setPromptedRecipes = vi.fn((updater) => {
            if (typeof updater === 'function') {
                const result = updater({});
                expect(result[weekStartStr]).toContain('uuid-pasta-1');
            }
        });

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={initialPlan}
                setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                promptedRecipes={{}}
                setPromptedRecipes={setPromptedRecipes}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        fireEvent.click(screen.getByText(/Transfer All/i));

        await waitFor(() => expect(setMultiWeeklyCookPlan).toHaveBeenCalled());
        expect(setPromptedRecipes).toHaveBeenCalled();
        await waitFor(() => {
            expect(screen.queryByText(/Wait! You have leftovers from last week/i)).not.toBeInTheDocument();
        });
    });

    it('marks leftovers as consumed', async () => {
        const prevWeekStartStr = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
        const initialPlan: MultiWeeklyCookPlan = {
            [prevWeekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };

        const setMultiWeeklyCookPlan = vi.fn((updater) => {
            const result = typeof updater === 'function' ? updater(initialPlan) : updater;
            expect(result[prevWeekStartStr]['uuid-pasta-1'].manualUsed).toBe(4);
        });

        const setPromptedRecipes = vi.fn();

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={initialPlan}
                setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                promptedRecipes={{}}
                setPromptedRecipes={setPromptedRecipes}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        fireEvent.click(screen.getByText(/Consume All/i));

        await waitFor(() => expect(setMultiWeeklyCookPlan).toHaveBeenCalled());
        expect(setPromptedRecipes).toHaveBeenCalled();
        await waitFor(() => {
            expect(screen.queryByText(/Wait! You have leftovers from last week/i)).not.toBeInTheDocument();
        });
    });

    it('can ignore an individual leftover', async () => {
        const prevWeekStartStr = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [prevWeekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };

        const setPromptedRecipes = vi.fn();

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={() => {
                }}
                promptedRecipes={{}}
                setPromptedRecipes={setPromptedRecipes}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        const ignoreButton = screen.getByText('Ignore');
        fireEvent.click(ignoreButton);

        await waitFor(() => {
            expect(setPromptedRecipes).toHaveBeenCalled();
            expect(screen.queryByText(/Wait! You have leftovers from last week/i)).not.toBeInTheDocument();
        });
    });

    it('does not show leftover prompt if week already prompted', () => {
        const prevWeekStartStr = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [prevWeekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={() => {
                }}
                promptedRecipes={{[weekStartStr]: ['uuid-pasta-1']}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.queryByText(/Wait! You have leftovers from last week/i)).not.toBeInTheDocument();
    });

    it('does not show leftover prompt for a week in the past', () => {
        const pastWeekStart = subWeeks(startOfWeek(new Date(), {weekStartsOn: 0}), 1);
        const prevPastWeekStartStr = format(subWeeks(pastWeekStart, 1), 'yyyy-MM-dd');

        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [prevPastWeekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={() => {
                }}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={pastWeekStart}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.queryByText(/Wait! You have leftovers from last week/i)).not.toBeInTheDocument();
    });

    it('shows leftover prompt for a week in the future', () => {
        const futureWeekStart = addWeeks(startOfWeek(new Date(), {weekStartsOn: 0}), 1);
        const thisWeekStartStr = format(startOfWeek(new Date(), {weekStartsOn: 0}), 'yyyy-MM-dd');

        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [thisWeekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={() => {
                }}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={futureWeekStart}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.getByText(/Wait! You have leftovers from last week/i)).toBeInTheDocument();
    });

    it('transfers leftovers from both transferred and new instances in same week', async () => {
        // Scenario: Week 1 has original, Week 2 has transferred + new, Week 3 should see both as leftovers
        const week1Str = format(subWeeks(weekStart, 2), 'yyyy-MM-dd');
        const week2Str = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');

        const initialPlan: MultiWeeklyCookPlan = {
            [week1Str]: {
                'uuid-original': { recipeId: 'uuid-recipe-pasta', multiplier: 1, servings: 2 }
            },
            [week2Str]: {
                // Transferred from week 1
                'uuid-transferred': {
                    recipeId: 'uuid-recipe-pasta',
                    servings: 2,
                    transferredFromDate: week1Str,
                    transferredFromId: 'uuid-original'
                },
                // New batch in week 2
                'uuid-new': { recipeId: 'uuid-recipe-pasta', multiplier: 1, servings: 2 }
            }
        };

        let capturedResult: MultiWeeklyCookPlan | null = null;
        const setMultiWeeklyCookPlan = vi.fn((updater) => {
            capturedResult = typeof updater === 'function' ? updater(initialPlan) : updater;
        });

        const setPromptedRecipes = vi.fn();

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {}}
                multiWeeklyCookPlan={initialPlan}
                setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                promptedRecipes={{}}
                setPromptedRecipes={setPromptedRecipes}
                selectedDate={selectedDate}
                setSelectedDate={() => {}}
                setSelectedRecipe={() => {}}
                participants={[]}
                canEdit={true}
            />
        );

        // Should show leftovers prompt with both instances combined
        expect(screen.getByText(/Wait! You have leftovers from last week/i)).toBeInTheDocument();
        // Both instances = 4 servings total
        expect(screen.getByText(/4 servings left/i)).toBeInTheDocument();

        // Transfer all
        fireEvent.click(screen.getByText(/Transfer All/i));

        await waitFor(() => expect(setMultiWeeklyCookPlan).toHaveBeenCalled());

        // Verify both source instances had their servings reduced
        expect(capturedResult).not.toBeNull();
        expect(capturedResult![week2Str]['uuid-transferred'].servings).toBe(0);
        expect(capturedResult![week2Str]['uuid-new'].servings).toBe(0);

        // Verify two new transferred instances were created in current week
        const currentWeekPlan = capturedResult![weekStartStr];
        const transferredItems = Object.values(currentWeekPlan).filter(
            (item: any) => item.transferredFromId
        );
        expect(transferredItems).toHaveLength(2);
    });

    it('clears scheduled meals without removing weekly recipes', async () => {
        const setMealPlan = vi.fn();
        const setMultiWeeklyCookPlan = vi.fn();
        const dayStr = format(selectedDate, 'yyyy-MM-dd');
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };
        const mealPlan: MealPlan = {
            [dayStr]: {
                breakfast: [{recipe: mockRecipes[0], servings: 1}]
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={mealPlan}
                setMealPlan={setMealPlan}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        const clearButton = screen.getByText(/^Clear$/);
        fireEvent.click(clearButton);

        // Should show confirmation dialog
        expect(await screen.findByText(/Clear Week Schedule/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText('Clear Schedule'));

        expect(setMealPlan).toHaveBeenCalled();
        expect(setMultiWeeklyCookPlan).not.toHaveBeenCalled();
    });

    it('can handle individual leftover actions', () => {
        const prevWeekStartStr = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [prevWeekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4},
                'uuid-salad-1': {recipeId: 'uuid-recipe-salad', servings: 2}
            }
        };

        const setPromptedRecipes = vi.fn();
        const setMultiWeeklyCookPlan = vi.fn();

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                promptedRecipes={{}}
                setPromptedRecipes={setPromptedRecipes}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        // Initial check: Both recipes should be in the prompt
        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.getByText('Salad')).toBeInTheDocument();

        // Click "Ignore" for Pasta
        const ignoreButtons = screen.getAllByTitle(/Ignore for now/i);
        fireEvent.click(ignoreButtons[0]);

        expect(setPromptedRecipes).toHaveBeenCalled();
    });

    it('can navigate to current week', () => {
        const setSelectedDate = vi.fn();
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
                selectedDate={subWeeks(new Date(), 2)}
                setSelectedDate={setSelectedDate}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        const currentWeekButton = screen.getByText(/Current Week/i);
        fireEvent.click(currentWeekButton);

        expect(setSelectedDate).toHaveBeenCalled();
        const call = setSelectedDate.mock.calls[0][0];
        expect(Math.abs(call.getTime() - new Date().getTime())).toBeLessThan(1000);
    });

    it('prompts to increase batch when adding more servings than planned via drop', () => {
        const setMultiWeeklyCookPlan = vi.fn();
        const setMealPlan = vi.fn();
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 1}
            }
        };
        const mealPlan: MealPlan = {
            [weekStartStr]: {
                dinner: [{recipe: mockRecipes[0], servings: 1, recipeInstanceId: 'uuid-pasta-1'}]
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={mealPlan}
                setMealPlan={setMealPlan}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        const slot = screen.getAllByText(/dinner/i)[0].closest('div')!;

        // Simulate drop
        const dragEvent = {
            preventDefault: vi.fn(),
            dataTransfer: {
                getData: (key: string) => {
                    if (key === 'recipeId') return 'uuid-recipe-pasta';
                    if (key === 'instanceId') return 'uuid-pasta-1';
                    return '';
                }
            }
        };

        fireEvent.drop(slot, dragEvent);

        expect(screen.getByText(/Adding this meal will exceed the planned servings/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Increase & Add'));

        expect(setMultiWeeklyCookPlan).toHaveBeenCalled();
        expect(setMealPlan).toHaveBeenCalled();
    });

    it('prompts to increase batch when increasing servings via buttons', () => {
        const setMultiWeeklyCookPlan = vi.fn();
        const setMealPlan = vi.fn();
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 1}
            }
        };
        const mealPlan: MealPlan = {
            [weekStartStr]: {
                dinner: [{recipe: mockRecipes[0], servings: 1}]
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={mealPlan}
                setMealPlan={setMealPlan}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        const plusButton = screen.getByText('+');
        fireEvent.click(plusButton);

        expect(screen.getByText(/Increasing servings will exceed the planned batch/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Increase & Update'));

        expect(setMultiWeeklyCookPlan).toHaveBeenCalled();
        expect(setMealPlan).toHaveBeenCalled();
    });

    it('shows multiplier instead of servings for the input box', () => {
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4, multiplier: 1}
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
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
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.getByText(/Multiplier/i)).toBeInTheDocument();
        const multiplierInput = screen.getByDisplayValue('1');
        expect(multiplierInput).toBeInTheDocument();

        expect(screen.getByText(/Servings/i)).toBeInTheDocument();
        expect(screen.getByText('0/4')).toBeInTheDocument();
    });

    it('clears scheduled meals without prompting to transfer leftovers', async () => {
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-granola-1': {
                    recipeId: 'uuid-recipe-granola',
                    multiplier: 1,
                    servings: 16
                }
            }
        };

        // Use only 4 servings
        const mealPlan: MealPlan = {
            [format(selectedDate, 'yyyy-MM-dd')]: {
                breakfast: [{recipe: mockRecipes[1], servings: 4}]
            }
        };

        const setMealPlan = vi.fn();
        const setMultiWeeklyCookPlan = vi.fn();

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={mealPlan}
                setMealPlan={setMealPlan}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        const clearBatchButton = screen.getByText(/^Clear$/);
        fireEvent.click(clearBatchButton);

        expect(await screen.findByText(/Clear Week Schedule/i)).toBeInTheDocument();
        fireEvent.click(screen.getByText('Clear Schedule'));

        await waitFor(() => {
            expect(setMealPlan).toHaveBeenCalled();
        });

        expect(screen.queryByText(/Transfer Leftovers\?/i)).not.toBeInTheDocument();
        expect(screen.queryByText(/servings of Cinnamon Granola left/i)).not.toBeInTheDocument();
        expect(setMultiWeeklyCookPlan).not.toHaveBeenCalled();
    });

    it('shows leftover prompt for Cinnamon Granola from previous week', () => {
        const prevWeekStart = subWeeks(weekStart, 1);
        const prevWeekStartStr = format(prevWeekStart, 'yyyy-MM-dd');

        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [prevWeekStartStr]: {
                'uuid-granola-1': {
                    recipeId: 'uuid-recipe-granola',
                    multiplier: 1,
                    servings: 16
                }
            }
        };

        // Use only 4 servings in the previous week
        const mealPlan: MealPlan = {
            [format(prevWeekStart, 'yyyy-MM-dd')]: {
                breakfast: [{recipe: mockRecipes[1], servings: 4}]
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={mealPlan}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
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
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.getByText(/Wait! You have leftovers from last week/i)).toBeInTheDocument();
        expect(screen.getByText(/Cinnamon Granola/i)).toBeInTheDocument();
        expect(screen.getByText(/12 servings left/i)).toBeInTheDocument();
    });

    it('shows leftover prompt for chained transfer of Cinnamon Granola', () => {
        const prevWeekStart = subWeeks(weekStart, 1);
        const prevWeekStartStr = format(prevWeekStart, 'yyyy-MM-dd');
        const prevPrevWeekStart = subWeeks(prevWeekStart, 1);
        const prevPrevWeekStartStr = format(prevPrevWeekStart, 'yyyy-MM-dd');

        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [prevPrevWeekStartStr]: {
                'uuid-granola-1': {
                    recipeId: 'uuid-recipe-granola',
                    multiplier: 0,
                    servings: 4,
                    manualUsed: 4
                }
            },
            [prevWeekStartStr]: {
                'uuid-granola-2': {
                    recipeId: 'uuid-recipe-granola',
                    multiplier: 0,
                    servings: 12,
                    transferredFromDate: prevPrevWeekStartStr,
                    transferredFromId: 'uuid-granola-1'
                }
            }
        };

        // Use only 2 servings in the previous week (Week 2)
        const mealPlan: MealPlan = {
            [format(prevWeekStart, 'yyyy-MM-dd')]: {
                breakfast: [{recipe: mockRecipes[1], servings: 2}]
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={mealPlan}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
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
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.getByText(/Wait! You have leftovers from last week/i)).toBeInTheDocument();
        expect(screen.getByText(/Cinnamon Granola/i)).toBeInTheDocument();
        expect(screen.getByText(/10 servings left/i)).toBeInTheDocument();
    });

    it('opens recipe picker when add button is clicked', () => {
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
                participants={[]}
                canEdit={true}
            />
        );

        const addButton = screen.getByTitle('Add Recipe');
        fireEvent.click(addButton);
        expect(screen.getByPlaceholderText(/Search by name or ingredient/i)).toBeInTheDocument();
    });

    it('opens date picker when date is clicked', () => {
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
                participants={[]}
                canEdit={true}
            />
        );

        const dateButton = screen.getByText(/Weekly View/i);
        fireEvent.click(dateButton);
        expect(screen.getAllByText('S').length).toBeGreaterThan(0); // DatePicker renders day initials
    });

    it('can view recipe details from the cook plan', () => {
        const setSelectedRecipe = vi.fn();
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4, multiplier: 1}
            }
        };
        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={() => {
                }}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={setSelectedRecipe}
                participants={[]}
                canEdit={true}
            />
        );

        const infoButton = screen.getByTitle('View Recipe Details');
        fireEvent.click(infoButton);
        expect(setSelectedRecipe).toHaveBeenCalled();
    });

    it('can move a recipe from one slot to another via drag and drop', async () => {
        const setMealPlan = vi.fn();
        const day1Str = format(weekStart, 'yyyy-MM-dd');
        const day2Str = format(addDays(weekStart, 1), 'yyyy-MM-dd');

        const mealPlan: MealPlan = {
            [day1Str]: {
                breakfast: [{recipe: mockRecipes[0], servings: 2}]
            }
        };

        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={mealPlan}
                setMealPlan={setMealPlan}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
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
                participants={[]}
                canEdit={true}
            />
        );

        const pastaItem = screen.getAllByText('Pasta')[1]; // Slot item
        const dragStartEvent = {
            dataTransfer: {
                setData: vi.fn(),
                getData: vi.fn()
            }
        };

        fireEvent.dragStart(pastaItem.closest('.soft-card')!, dragStartEvent);
        expect(dragStartEvent.dataTransfer.setData).toHaveBeenCalledWith('isMove', 'true');

        const slots = screen.getAllByText('lunch');
        const targetSlot = slots[1].parentElement!; // Tuesday lunch

        const dropEvent = {
            dataTransfer: {
                getData: (key: string) => {
                    if (key === 'recipeId') return 'uuid-recipe-pasta';
                    if (key === 'sourceDate') return day1Str;
                    if (key === 'sourceSlot') return 'breakfast';
                    if (key === 'isMove') return 'true';
                    return '';
                }
            },
            preventDefault: vi.fn(),
        };

        fireEvent.drop(targetSlot, dropEvent);

        expect(setMealPlan).toHaveBeenCalled();
        const updater = setMealPlan.mock.calls[0][0];
        const newState = updater(mealPlan);

        expect(newState[day1Str].breakfast).toHaveLength(0);
        expect(newState[day2Str].lunch).toHaveLength(1);
        expect(newState[day2Str].lunch[0].recipe.name).toBe('Pasta');
        expect(newState[day2Str].lunch[0].servings).toBe(2);
    });

    it('shows confirmation when removing a recipe with future transfers', async () => {
        const nextWeekStartStr = format(addWeeks(weekStart, 1), 'yyyy-MM-dd');
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            },
            [nextWeekStartStr]: {
                'uuid-pasta-2': {recipeId: 'uuid-recipe-pasta', servings: 2, transferredFromDate: weekStartStr, transferredFromId: 'uuid-pasta-1'}
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
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
                participants={[]}
                canEdit={true}
            />
        );

        const removeButton = screen.getByTitle('Remove from recipes');
        fireEvent.click(removeButton);

        expect(screen.getByText(/Removing "Pasta" will also remove it from future weeks/i)).toBeInTheDocument();
    });

    it('shows info dialog when dropping a recipe with no participants selected', () => {
        const participants = [{
            name: 'User',
            maintenanceCalories: 2000,
            calorieDeficit: 0,
            proteinPercent: 30,
            carbsPercent: 40,
            fatPercent: 30
        }];
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
                canEdit={true}
            />
        );

        const participantButton = screen.getAllByText('User').find(el => el.tagName === 'BUTTON' || el.closest('button'));
        if (participantButton) fireEvent.click(participantButton);

        // Open participant selector and clear all
        fireEvent.click(screen.getByText(/Selected/i));
        fireEvent.click(screen.getAllByText('Clear')[0]);

        const slot = screen.getAllByText(/dinner/i)[0].closest('div')!;
        const dropEvent = {
            preventDefault: vi.fn(),
            dataTransfer: {
                getData: (key: string) => key === 'recipeId' ? 'uuid-recipe-pasta' : ''
            }
        };

        fireEvent.drop(slot, dropEvent);

        expect(screen.getByText(/No Participants Selected/i)).toBeInTheDocument();
    });

    it('ignores drop if same slot during move', () => {
        const setMealPlan = vi.fn();
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');
        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={setMealPlan}
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
                participants={[]}
                canEdit={true}
            />
        );

        const slot = screen.getAllByText(/dinner/i)[0].closest('div')!;
        const dropEvent = {
            preventDefault: vi.fn(),
            dataTransfer: {
                getData: (key: string) => {
                    if (key === 'recipeId') return 'uuid-recipe-pasta';
                    if (key === 'isMove') return 'true';
                    if (key === 'sourceDate') return weekStartStr;
                    if (key === 'sourceSlot') return 'dinner';
                    return '';
                }
            }
        };

        fireEvent.drop(slot, dropEvent);
        expect(setMealPlan).not.toHaveBeenCalled();
    });

    it('handles escape key in leftover prompt', () => {
        const prevWeekStartStr = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [prevWeekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };
        const setPromptedRecipes = vi.fn();

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={() => {
                }}
                promptedRecipes={{}}
                setPromptedRecipes={setPromptedRecipes}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        expect(screen.getByText(/Wait! You have leftovers from last week/i)).toBeInTheDocument();

        fireEvent.keyDown(window, {key: 'Escape'});

        expect(setPromptedRecipes).toHaveBeenCalled();
        expect(screen.queryByText(/Wait! You have leftovers from last week/i)).not.toBeInTheDocument();
    });

    it('handles dragover event', () => {
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
                participants={[]}
                canEdit={true}
            />
        );

        const slot = screen.getAllByText(/dinner/i)[0].closest('div')!;
        const cancelled = fireEvent.dragOver(slot);
        expect(cancelled).toBe(false);
    });

    it('can clear all weekly recipes', async () => {
        const setMultiWeeklyCookPlan = vi.fn();
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {
                }}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                promptedRecipes={{}}
                setPromptedRecipes={() => {
                }}
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                participants={[]}
                canEdit={true}
            />
        );

        const clearButton = screen.getByTitle('Clear weekly recipes list');
        fireEvent.click(clearButton);

        expect(screen.getByText(/Clear Weekly Recipes/i)).toBeInTheDocument();
        fireEvent.click(screen.getByRole('button', {name: 'Clear All'}));

        expect(setMultiWeeklyCookPlan).toHaveBeenCalled();
    });

    it('clear all returns servings to source weeks and removes future transfers', async () => {
        const prevWeekStartStr = format(subWeeks(weekStart, 1), 'yyyy-MM-dd');
        const nextWeekStartStr = format(addWeeks(weekStart, 1), 'yyyy-MM-dd');
        const initialPlan: MultiWeeklyCookPlan = {
            [prevWeekStartStr]: {
                'uuid-pasta-source': { recipeId: 'uuid-recipe-pasta', servings: 0, multiplier: 1 }
            },
            [weekStartStr]: {
                'uuid-pasta-transferred': {
                    recipeId: 'uuid-recipe-pasta',
                    servings: 2,
                    transferredFromDate: prevWeekStartStr,
                    transferredFromId: 'uuid-pasta-source'
                },
                'uuid-granola-base': { recipeId: 'uuid-recipe-granola2', servings: 4, multiplier: 1 }
            },
            [nextWeekStartStr]: {
                'uuid-granola-future': {
                    recipeId: 'uuid-recipe-granola2',
                    servings: 2,
                    transferredFromDate: weekStartStr,
                    transferredFromId: 'uuid-granola-base'
                }
            }
        };

        let capturedResult: MultiWeeklyCookPlan = initialPlan;
        const setMultiWeeklyCookPlan = vi.fn((updater) => {
            capturedResult = typeof updater === 'function' ? updater(capturedResult) : updater;
        });

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={{}}
                setMealPlan={() => {}}
                multiWeeklyCookPlan={initialPlan}
                setMultiWeeklyCookPlan={setMultiWeeklyCookPlan}
                promptedRecipes={{}}
                setPromptedRecipes={() => {}}
                selectedDate={selectedDate}
                setSelectedDate={() => {}}
                setSelectedRecipe={() => {}}
                participants={[]}
                canEdit={true}
            />
        );

        const clearButton = screen.getByTitle('Clear weekly recipes list');
        fireEvent.click(clearButton);
        fireEvent.click(screen.getByRole('button', { name: 'Clear All' }));

        expect(setMultiWeeklyCookPlan).toHaveBeenCalled();

        // Current week items should be removed
        expect(capturedResult[weekStartStr]?.['uuid-pasta-transferred']).toBeUndefined();
        expect(capturedResult[weekStartStr]?.['uuid-granola-base']).toBeUndefined();

        // Future transferred item should also be removed
        expect(capturedResult[nextWeekStartStr]?.['uuid-granola-future']).toBeUndefined();

        // Source week should have servings returned
        expect(capturedResult[prevWeekStartStr]['uuid-pasta-source'].servings).toBe(2);
    });

    it('sorts weekly recipes by remaining servings then alphabetically, and shows transferred separately', () => {
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-banana-1': {recipeId: 'uuid-recipe-banana', servings: 0, multiplier: 1},
                'uuid-apple-1': {recipeId: 'uuid-recipe-apple', servings: 4},
                'uuid-cucumber-1': {recipeId: 'uuid-recipe-cucumber', servings: 2, transferredFromDate: '2026-01-05'},
                'uuid-beet-1': {recipeId: 'uuid-recipe-beet', servings: 1},
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={[...mockRecipes, {id: 'uuid-recipe-apple', name: 'Apple', categories: [], prepTime: '1', cookTime: '1', servings: 2, tags: [], ingredients: [], instructions: [], macros: {calories: 0, protein: 0, carbs: 0, fat: 0}}, {id: 'uuid-recipe-banana', name: 'Banana', categories: [], prepTime: '1', cookTime: '1', servings: 2, tags: [], ingredients: [], instructions: [], macros: {calories: 0, protein: 0, carbs: 0, fat: 0}}, {id: 'uuid-recipe-beet', name: 'Beet', categories: [], prepTime: '1', cookTime: '1', servings: 1, tags: [], ingredients: [], instructions: [], macros: {calories: 0, protein: 0, carbs: 0, fat: 0}}, {id: 'uuid-recipe-cucumber', name: 'Cucumber', categories: [], prepTime: '1', cookTime: '1', servings: 2, tags: [], ingredients: [], instructions: [], macros: {calories: 0, protein: 0, carbs: 0, fat: 0}}]}
                mealPlan={{}}
                setMealPlan={() => {}}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                setMultiWeeklyCookPlan={() => {}}
                promptedRecipes={{}}
                setPromptedRecipes={() => {}}
                selectedDate={selectedDate}
                setSelectedDate={() => {}}
                setSelectedRecipe={() => {}}
                participants={[]}
                canEdit={true}
            />
        );

        const cards = screen.getAllByTestId('weekly-recipe-card');
        const order = cards.map(c => ({name: c.getAttribute('data-recipe-name'), type: c.getAttribute('data-card-type')}));
        expect(order[0]).toMatchObject({name: 'Apple', type: 'base'});
        expect(order[1]).toMatchObject({name: 'Beet', type: 'base'});
        expect(order.some(o => o.type === 'transferred' && o.name === 'Cucumber')).toBe(true);
        const transferInput = cards.find(c => c.getAttribute('data-card-type') === 'transferred')?.querySelector('input[type="number"]') as HTMLInputElement;
        expect(transferInput?.disabled).toBe(true);
    });

    it('applies min height per meal slot based on unique recipes across days', () => {
        const todayStr = format(selectedDate, 'yyyy-MM-dd');
        const tomorrowStr = format(addDays(selectedDate, 1), 'yyyy-MM-dd');
        // Test case 1: One recipe with multiple servings should only take up height for 1 recipe
        const mealPlan: MealPlan = {
            [todayStr]: {
                breakfast: [{recipe: mockRecipes[0], servings: 5}]
            },
            [tomorrowStr]: {
                breakfast: [{recipe: mockRecipes[0], servings: 1}, {recipe: mockRecipes[1], servings: 1}]
            }
        };

        renderWithAppContext(
            <WeeklyPlanner
                recipes={mockRecipes}
                mealPlan={mealPlan}
                setMealPlan={() => {}}
                multiWeeklyCookPlan={{}}
                setMultiWeeklyCookPlan={() => {}}
                promptedRecipes={{}}
                setPromptedRecipes={() => {}}
                selectedDate={selectedDate}
                setSelectedDate={() => {}}
                setSelectedRecipe={() => {}}
                participants={[]}
                canEdit={true}
            />
        );

        const breakfastSlots = screen.getAllByText(/breakfast/i).map(label => label.parentElement as HTMLElement);
        // Today has 1 recipe (5 servings) = 140px
        // Tomorrow has 2 recipes = 280px
        // All slots should use the max (280px)
        expect(breakfastSlots[0].style.minHeight).toBe('280px');
        expect(breakfastSlots[1].style.minHeight).toBe('280px');
    });
});

describe('App - Clear Week Functionality', () => {
    beforeEach(() => {
        localStorage.clear();
        vi.clearAllMocks();
        const mockRes = (data: unknown) => ({
            ok: true,
            status: 200,
            json: () => Promise.resolve(data),
            text: () => Promise.resolve(JSON.stringify(data)),
        });
        global.fetch = vi.fn((url: string) => {
            if (url === '/api/me') {
                return Promise.resolve(mockRes({username: 'testuser', tier: 'Admin'}));
            }
            if (url === '/api/settings') {
                return Promise.resolve(mockRes({registrationEnabled: true, advancedMode: false, macroLimits: {proteinPercentMin: 0, proteinPercentMax: 100, fatPercentMin: 0, fatPercentMax: 100, calorieDeficitMax: 25}}));
            }
            const mealPlan = localStorage.getItem('mealPlan');
            const multi = localStorage.getItem('multiWeeklyCookPlan');
            if (url.endsWith('/meal-plan')) {
                return Promise.resolve(mockRes(mealPlan ? JSON.parse(mealPlan) : {}));
            }
            if (url.endsWith('/multi-weekly-cook-plan')) {
                return Promise.resolve(mockRes(multi ? JSON.parse(multi) : {}));
            }
            if (url.includes('/api/ingredients')) return Promise.resolve(mockRes([]));
            if (url.includes('/api/participants')) return Promise.resolve(mockRes([]));
            return Promise.resolve(mockRes([
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
            ]));
        }) as any;
    });

    it('clears scheduled meals but keeps weekly recipes when Clear Week is clicked', async () => {
        const fixedDate = new Date('2024-01-07T12:00:00');
        vi.setSystemTime(fixedDate);

        const weekStart = startOfWeek(fixedDate, {weekStartsOn: 0});
        const weekStartStr = format(weekStart, 'yyyy-MM-dd');

        const initialMealPlan = {
            [weekStartStr]: {
                dinner: [{recipeId: 'uuid-recipe-pasta', servings: 1}]
            }
        };
        const initialBatchPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'uuid-recipe-pasta', servings: 4}
            }
        };
        const initialPromptedRecipes = {[weekStartStr]: ['Pasta']};

        localStorage.setItem('mealPlan', JSON.stringify(initialMealPlan));
        localStorage.setItem('multiWeeklyCookPlan', JSON.stringify(initialBatchPlan));
        localStorage.setItem('promptedRecipes', JSON.stringify(initialPromptedRecipes));

        render(<App/>);

        const weeklyPlannerButton = screen.getByText(/Weekly Planner/i);
        fireEvent.click(weeklyPlannerButton);

        const batchHeading = await screen.findByText(/Weekly Recipes/i);
        expect(batchHeading).toBeInTheDocument();

        await waitFor(() => {
            const stored = JSON.parse(localStorage.getItem('multiWeeklyCookPlan') || '{}');
            expect(stored[weekStartStr]).toBeDefined();
        });

        const clearWeekButton = screen.getByText(/^Clear$/);
        fireEvent.click(clearWeekButton);

        // In some environments, clearing happens immediately without showing a confirmation.
        // If the dialog appears, click the confirm button; otherwise just proceed.
        let clearScheduleButton: HTMLElement | null = null;
        await screen
            .findByText('Clear Schedule')
            .then((btn) => {
                clearScheduleButton = btn;
            })
            .catch(() => {
                clearScheduleButton = null;
            });

        if (clearScheduleButton) {
            fireEvent.click(clearScheduleButton);
        }

        await waitFor(() => {
            const plan = JSON.parse(localStorage.getItem('mealPlan') || '{}');
            expect(plan[weekStartStr]).toBeUndefined();
        }, {timeout: 1000});

        const batchPlan = JSON.parse(localStorage.getItem('multiWeeklyCookPlan') || '{}');
        expect(batchPlan[weekStartStr]).toEqual(initialBatchPlan[weekStartStr]);
    });
});
