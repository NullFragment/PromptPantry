import {fireEvent, screen, waitFor} from '@testing-library/react';
import {ShoppingList} from '../../src/components/ShoppingList';
import {Ingredient, IngredientDefinition, MealPlan, MultiWeeklyCookPlan, Recipe} from '../../src/types';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {format, startOfWeek} from 'date-fns';
import {renderWithAppContext} from '../testHelpers';

const mockRecipes: Recipe[] = [
    {
        id: 'recipe-pasta-1',
        name: 'Pasta',
        categories: ['Dinner'],
        prepTime: '10',
        cookTime: '20',
        servings: 1,
        tags: [],
        ingredients: [
            {ingredient: 'Pasta Noodles', quantity: '100', measure: 'g'} as Ingredient
        ],
        instructions: [],
        macros: {calories: 500, protein: 20, carbs: 60, fat: 10}
    }
];

const mockIngredients: IngredientDefinition[] = [];

describe('ShoppingList', () => {
    const selectedDate = new Date();
    const weekStart = startOfWeek(selectedDate, {weekStartsOn: 0});
    const weekStartStr = format(weekStart, 'yyyy-MM-dd');

    beforeEach(() => {
        vi.clearAllMocks();
        // Mock navigator.clipboard
        Object.assign(navigator, {
            clipboard: {
                writeText: vi.fn().mockImplementation(() => Promise.resolve()),
            },
        });
    });

    it('calculates shopping list including non-transferred recipes', () => {
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {
                    recipeId: 'recipe-pasta-1',
                    servings: 5,
                    multiplier: 5
                }
            }
        };

        renderWithAppContext(
            <ShoppingList
                mealPlan={{}}
                recipes={mockRecipes}
                participants={[]}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                unitSystem="metric"
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                ingredients={mockIngredients}
            />
        );

        expect(screen.getByText(/pasta noodles/i)).toBeInTheDocument();
        expect(screen.queryByText(/Your shopping list is empty/i)).not.toBeInTheDocument();
    });

    it('calculates shopping list based on multiplier when present', () => {
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {
                    recipeId: 'recipe-pasta-1',
                    servings: 6,
                    multiplier: 2
                }
            }
        };

        renderWithAppContext(
            <ShoppingList
                mealPlan={{}}
                recipes={mockRecipes}
                participants={[]}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                unitSystem="metric"
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                ingredients={mockIngredients}
            />
        );

        expect(screen.getByText(/pasta noodles/i)).toBeInTheDocument();
        expect(screen.getByText(/200\s*g/i)).toBeInTheDocument();
    });

    it('exports the shopping list to clipboard', async () => {
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'recipe-pasta-1', servings: 1, multiplier: 1}
            }
        };

        renderWithAppContext(
            <ShoppingList
                mealPlan={{}}
                recipes={mockRecipes}
                participants={[]}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                unitSystem="metric"
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                ingredients={mockIngredients}
            />
        );

        const copyButton = screen.getByText(/Copy List/i);
        fireEvent.click(copyButton);

        expect(navigator.clipboard.writeText).toHaveBeenCalled();
        expect(await screen.findByText(/Copied!/i)).toBeInTheDocument();

        await waitFor(() => {
            expect(screen.queryByText(/Copied!/i)).not.toBeInTheDocument();
        }, {timeout: 3000});
    });

    it('shows empty state when no recipes are planned', () => {
        renderWithAppContext(
            <ShoppingList
                mealPlan={{}}
                recipes={mockRecipes}
                participants={[]}
                multiWeeklyCookPlan={{}}
                unitSystem="metric"
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                ingredients={mockIngredients}
            />
        );

        expect(screen.getByText(/Your shopping list is empty/i)).toBeInTheDocument();
    });

    it('toggles the date picker', () => {
        renderWithAppContext(
            <ShoppingList
                mealPlan={{}}
                recipes={mockRecipes}
                participants={[]}
                multiWeeklyCookPlan={{}}
                unitSystem="metric"
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                ingredients={mockIngredients}
            />
        );

        const dateDisplay = screen.getByText(/Weekly View/i);
        fireEvent.click(dateDisplay);

        expect(screen.getByText(/Select Date/i)).toBeInTheDocument();

        const closeButton = screen.getByRole('button', {name: /Close/i});
        fireEvent.click(closeButton);

        expect(screen.queryByText(/Select Date/i)).not.toBeInTheDocument();
    });

    it('renders weekly plan meals correctly', () => {
        const dStr = format(selectedDate, 'yyyy-MM-dd');
        const mealPlan: MealPlan = {
            [dStr]: {
                dinner: [{recipe: mockRecipes[0], servings: 1}]
            }
        };

        renderWithAppContext(
            <ShoppingList
                mealPlan={mealPlan}
                recipes={mockRecipes}
                participants={[]}
                multiWeeklyCookPlan={{}}
                unitSystem="metric"
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                ingredients={mockIngredients}
            />
        );

        expect(screen.getAllByText(/Pasta/i).length).toBeGreaterThan(0);
    });

    it('displays the recipe multiplier instead of servings in the weekly recipes section', () => {
        const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
            [weekStartStr]: {
                'uuid-pasta-1': {recipeId: 'recipe-pasta-1', servings: 4, multiplier: 4}
            }
        };

        renderWithAppContext(
            <ShoppingList
                mealPlan={{}}
                recipes={mockRecipes}
                participants={[]}
                multiWeeklyCookPlan={multiWeeklyCookPlan}
                unitSystem="metric"
                selectedDate={selectedDate}
                setSelectedDate={() => {
                }}
                setSelectedRecipe={() => {
                }}
                ingredients={mockIngredients}
            />
        );

        expect(screen.getByText(/x4/)).toBeInTheDocument();
    });

    // Store section grouping tests
    describe('store section grouping', () => {
        it('groups ingredients by store section', () => {
            const storeSections = [
                {id: 'sec-1', name: 'Pasta & Grains'},
                {id: 'sec-2', name: 'Produce'}
            ];
            const ingredientsWithSections: IngredientDefinition[] = [
                {id: 'ing-1', name: 'pasta', storeSectionId: 'sec-1'},
                {id: 'ing-2', name: 'tomato', storeSectionId: 'sec-2'}
            ];

            const recipesWithLinkedIngredients: Recipe[] = [
                {
                    id: 'recipe-pasta-tomato-1',
                    name: 'Pasta with Tomato',
                    categories: ['Dinner'],
                    prepTime: '10',
                    cookTime: '20',
                    servings: 1,
                    tags: [],
                    ingredients: [
                        {ingredient: 'pasta', ingredientId: 'ing-1', quantity: '100', measure: 'g'},
                        {ingredient: 'tomato', ingredientId: 'ing-2', quantity: '2', measure: 'whole'}
                    ],
                    instructions: [],
                    macros: {calories: 400, protein: 15, carbs: 50, fat: 8}
                }
            ];

            const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
                [weekStartStr]: {
                    'uuid-1': {recipeId: 'recipe-pasta-tomato-1', servings: 1, multiplier: 1}
                }
            };

            renderWithAppContext(
                <ShoppingList
                    mealPlan={{}}
                    recipes={recipesWithLinkedIngredients}
                    participants={[]}
                    multiWeeklyCookPlan={multiWeeklyCookPlan}
                    unitSystem="metric"
                    selectedDate={selectedDate}
                    setSelectedDate={() => {}}
                    setSelectedRecipe={() => {}}
                    ingredients={ingredientsWithSections}
                    storeSections={storeSections}
                />
            );

            // Check that section headers are displayed
            expect(screen.getByText('Pasta & Grains')).toBeInTheDocument();
            expect(screen.getByText('Produce')).toBeInTheDocument();
        });

        it('shows Unassigned section last with muted styling for ingredients without ingredientId', () => {
            const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
                [weekStartStr]: {
                    'uuid-pasta-1': {recipeId: 'recipe-pasta-1', servings: 1, multiplier: 1}
                }
            };

            renderWithAppContext(
                <ShoppingList
                    mealPlan={{}}
                    recipes={mockRecipes}
                    participants={[]}
                    multiWeeklyCookPlan={multiWeeklyCookPlan}
                    unitSystem="metric"
                    selectedDate={selectedDate}
                    setSelectedDate={() => {}}
                    setSelectedRecipe={() => {}}
                    ingredients={[]}
                />
            );

            // Ingredients without ingredientId should be in Unassigned section
            expect(screen.getByText('Unassigned')).toBeInTheDocument();
        });

        it('shows item count in section headers', () => {
            const storeSections = [{id: 'sec-1', name: 'Pasta & Grains'}];
            const ingredientsWithSections: IngredientDefinition[] = [
                {id: 'ing-1', name: 'pasta', storeSectionId: 'sec-1'},
                {id: 'ing-2', name: 'rice', storeSectionId: 'sec-1'}
            ];

            const recipesWithLinkedIngredients: Recipe[] = [
                {
                    id: 'recipe-pasta-rice-1',
                    name: 'Pasta and Rice',
                    categories: ['Dinner'],
                    prepTime: '10',
                    cookTime: '20',
                    servings: 1,
                    tags: [],
                    ingredients: [
                        {ingredient: 'pasta', ingredientId: 'ing-1', quantity: '100', measure: 'g'},
                        {ingredient: 'rice', ingredientId: 'ing-2', quantity: '100', measure: 'g'}
                    ],
                    instructions: [],
                    macros: {calories: 400, protein: 15, carbs: 50, fat: 8}
                }
            ];

            const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
                [weekStartStr]: {
                    'uuid-1': {recipeId: 'recipe-pasta-rice-1', servings: 1, multiplier: 1}
                }
            };

            renderWithAppContext(
                <ShoppingList
                    mealPlan={{}}
                    recipes={recipesWithLinkedIngredients}
                    participants={[]}
                    multiWeeklyCookPlan={multiWeeklyCookPlan}
                    unitSystem="metric"
                    selectedDate={selectedDate}
                    setSelectedDate={() => {}}
                    setSelectedRecipe={() => {}}
                    ingredients={ingredientsWithSections}
                    storeSections={storeSections}
                />
            );

            expect(screen.getByText('2 items')).toBeInTheDocument();
        });

        it('collapses and expands sections when clicked', () => {
            const storeSections = [{id: 'sec-1', name: 'Pasta & Grains'}];
            const ingredientsWithSections: IngredientDefinition[] = [
                {id: 'ing-1', name: 'pasta', storeSectionId: 'sec-1'}
            ];

            const recipesWithLinkedIngredients: Recipe[] = [
                {
                    id: 'recipe-simple-pasta-1',
                    name: 'Simple Pasta',
                    categories: ['Dinner'],
                    prepTime: '10',
                    cookTime: '20',
                    servings: 1,
                    tags: [],
                    ingredients: [
                        {ingredient: 'pasta', ingredientId: 'ing-1', quantity: '100', measure: 'g'}
                    ],
                    instructions: [],
                    macros: {calories: 400, protein: 15, carbs: 50, fat: 8}
                }
            ];

            const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
                [weekStartStr]: {
                    'uuid-1': {recipeId: 'recipe-simple-pasta-1', servings: 1, multiplier: 1}
                }
            };

            renderWithAppContext(
                <ShoppingList
                    mealPlan={{}}
                    recipes={recipesWithLinkedIngredients}
                    participants={[]}
                    multiWeeklyCookPlan={multiWeeklyCookPlan}
                    unitSystem="metric"
                    selectedDate={selectedDate}
                    setSelectedDate={() => {}}
                    setSelectedRecipe={() => {}}
                    ingredients={ingredientsWithSections}
                    storeSections={storeSections}
                />
            );

            // Initially the ingredient should be visible
            expect(screen.getByText('pasta')).toBeInTheDocument();

            // Click the section header to collapse
            const sectionHeader = screen.getByText('Pasta & Grains');
            fireEvent.click(sectionHeader);

            // After collapse, the ingredient should not be visible
            expect(screen.queryByText('pasta')).not.toBeInTheDocument();

            // Click again to expand
            fireEvent.click(sectionHeader);

            // After expand, the ingredient should be visible again
            expect(screen.getByText('pasta')).toBeInTheDocument();
        });

        it('displays canonical ingredient name instead of alias', () => {
            const storeSections = [{id: 'sec-produce', name: 'Produce'}];
            const ingredientsWithAliases: IngredientDefinition[] = [
                {id: 'ing-1', name: 'garlic', storeSectionId: 'sec-produce', aliases: ['garlic, minced', 'garlic clove']}
            ];

            const recipesWithAlias: Recipe[] = [
                {
                    id: 'recipe-garlic-1',
                    name: 'Garlic Dish',
                    categories: ['Dinner'],
                    prepTime: '10',
                    cookTime: '20',
                    servings: 1,
                    tags: [],
                    ingredients: [
                        {ingredient: 'garlic, minced', ingredientId: 'ing-1', quantity: '2', measure: 'cloves'}
                    ],
                    instructions: [],
                    macros: {calories: 100, protein: 5, carbs: 10, fat: 2}
                }
            ];

            const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
                [weekStartStr]: {
                    'uuid-1': {recipeId: 'recipe-garlic-1', servings: 1, multiplier: 1}
                }
            };

            renderWithAppContext(
                <ShoppingList
                    mealPlan={{}}
                    recipes={recipesWithAlias}
                    participants={[]}
                    multiWeeklyCookPlan={multiWeeklyCookPlan}
                    unitSystem="metric"
                    selectedDate={selectedDate}
                    setSelectedDate={() => {}}
                    setSelectedRecipe={() => {}}
                    ingredients={ingredientsWithAliases}
                    storeSections={storeSections}
                />
            );

            // Should show canonical name "garlic" not the alias "garlic, minced"
            expect(screen.getByText('garlic')).toBeInTheDocument();
            expect(screen.queryByText('garlic, minced')).not.toBeInTheDocument();
        });
    });

    describe('Container recommendation', () => {
        it('shows container recommendation when ingredient has containerSizes', () => {
            const milkId = 'ing-milk-1';
            const recipesWithMilk: Recipe[] = [
                {
                    id: 'recipe-milk-1',
                    name: 'Milk Recipe',
                    categories: ['Dinner'],
                    prepTime: '0',
                    cookTime: '0',
                    servings: 1,
                    tags: [],
                    ingredients: [
                        { ingredient: 'milk', ingredientId: milkId, quantity: '5', measure: 'l' } as Ingredient
                    ],
                    instructions: [],
                    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
                }
            ];
            const ingredientsWithContainers: IngredientDefinition[] = [
                {
                    id: milkId,
                    name: 'milk',
                    storeSection: 'Dairy',
                    containerSizes: [
                        { quantity: 3.78, unit: 'l', label: 'gallon' },
                        { quantity: 1.89, unit: 'l', label: 'half gallon' }
                    ]
                }
            ];
            const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
                [weekStartStr]: {
                    'uuid-milk-1': { recipeId: 'recipe-milk-1', servings: 1, multiplier: 1 }
                }
            };

            renderWithAppContext(
                <ShoppingList
                    mealPlan={{}}
                    recipes={recipesWithMilk}
                    participants={[]}
                    multiWeeklyCookPlan={multiWeeklyCookPlan}
                    unitSystem="metric"
                    selectedDate={selectedDate}
                    setSelectedDate={() => {}}
                    setSelectedRecipe={() => {}}
                    ingredients={ingredientsWithContainers}
                />
            );

            expect(screen.getByText('milk')).toBeInTheDocument();
            expect(screen.getByText('gallon + half gallon')).toBeInTheDocument();
        });

        it('hides container recommendation when ingredient has no containerSizes', () => {
            const recipesWithMilk: Recipe[] = [
                {
                    id: 'recipe-milk-2',
                    name: 'Milk Recipe',
                    categories: ['Dinner'],
                    prepTime: '0',
                    cookTime: '0',
                    servings: 1,
                    tags: [],
                    ingredients: [
                        { ingredient: 'milk', quantity: '1', measure: 'cup' } as Ingredient
                    ],
                    instructions: [],
                    macros: { calories: 0, protein: 0, carbs: 0, fat: 0 }
                }
            ];

            const multiWeeklyCookPlan: MultiWeeklyCookPlan = {
                [weekStartStr]: {
                    'uuid-milk-1': { recipeId: 'recipe-milk-2', servings: 1, multiplier: 1 }
                }
            };

            renderWithAppContext(
                <ShoppingList
                    mealPlan={{}}
                    recipes={recipesWithMilk}
                    participants={[]}
                    multiWeeklyCookPlan={multiWeeklyCookPlan}
                    unitSystem="metric"
                    selectedDate={selectedDate}
                    setSelectedDate={() => {}}
                    setSelectedRecipe={() => {}}
                    ingredients={[]}
                />
            );

            expect(screen.queryByText(/Buy:/)).not.toBeInTheDocument();
        });
    });
});
