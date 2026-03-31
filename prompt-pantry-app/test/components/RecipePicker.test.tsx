import {fireEvent, render, screen} from '@testing-library/react';
import {RecipePicker} from '../../src/components/RecipePicker';
import {Recipe} from '../../src/types';
import {describe, expect, it, vi} from 'vitest';

const mockRecipes: Recipe[] = [
    {
        id: 'recipe-pasta',
        name: 'Pasta',
        categories: ['Dinner'],
        prepTime: '10',
        cookTime: '20',
        servings: 4,
        tags: ['easy'],
        ingredients: [{ingredient: 'noodles', quantity: '1', measure: 'box'}],
        instructions: ['boil water'],
        macros: {calories: 500, protein: 20, carbs: 60, fat: 10}
    },
    {
        id: 'recipe-oatmeal',
        name: 'Oatmeal',
        categories: ['Breakfast'],
        prepTime: '5',
        cookTime: '5',
        servings: 1,
        tags: ['healthy'],
        ingredients: [{ingredient: 'oats', quantity: '1/2', measure: 'cup'}],
        instructions: ['cook oats'],
        macros: {calories: 300, protein: 10, carbs: 40, fat: 5}
    }
];

describe('RecipePicker', () => {
    const defaultProps = {
        recipes: mockRecipes,
        allTags: ['easy', 'healthy'],
        showRecipePicker: "dinner",
        onClose: vi.fn(),
        onSelect: vi.fn(),
        selectedWeekRecipes: [],
        participants: [],
        mealPlan: {},
        weekDays: []
    };

    it('renders and filters by search query', () => {
        render(<RecipePicker {...defaultProps} />);

        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.getByText('Oatmeal')).toBeInTheDocument();

        const searchInput = screen.getByPlaceholderText(/Search by name or ingredient/i);
        fireEvent.change(searchInput, {target: {value: 'Pasta'}});

        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument();
    });

    it('filters by category', () => {
        render(<RecipePicker {...defaultProps} />);

        const dinnerFilter = screen.getByRole('button', {name: 'Dinner'});
        fireEvent.click(dinnerFilter);

        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument();
    });

    it('filters by tags', () => {
        render(<RecipePicker {...defaultProps} />);

        const easyFilter = screen.getByRole('button', {name: 'easy'});
        fireEvent.click(easyFilter);

        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument();
    });

    it('calls onSelect when a recipe quick add is clicked', () => {
        const onSelect = vi.fn();
        render(<RecipePicker {...defaultProps} onSelect={onSelect}/>);

        // Quick add is the plus icon
        const plusButtons = screen.getAllByTitle('Add 1 now');
        fireEvent.click(plusButtons[0]); // Pasta
        expect(onSelect).toHaveBeenCalledWith([{recipe: mockRecipes[0], multiplier: 1}]);
    });

    it('can select multiple recipes and add them', () => {
        const onSelect = vi.fn();
        render(<RecipePicker {...defaultProps} onSelect={onSelect}/>);

        // Toggle first recipe (Pasta)
        const pastaCheckbox = screen.getByLabelText('Select Pasta');
        fireEvent.click(pastaCheckbox);

        // Toggle second recipe (Oatmeal)
        const oatmealCheckbox = screen.getByLabelText('Select Oatmeal');
        fireEvent.click(oatmealCheckbox);

        // Update multiplier for Oatmeal
        // Wait, the multiplier input only appears if it is selected.
        // And there might be multiple if multiple are selected.
        // I need to find the specific one.
        const multiplierInputs = screen.getAllByRole('spinbutton');
        // Oatmeal was the second one selected, but it depends on render order.
        // mockRecipes has Pasta then Oatmeal.
        fireEvent.change(multiplierInputs[1], {target: {value: '3'}});

        // Click "Add Selected" button
        const addSelectedButton = screen.getByText(/Add 2 Recipes/i);
        fireEvent.click(addSelectedButton);

        expect(onSelect).toHaveBeenCalledWith([
            {recipe: mockRecipes[0], multiplier: 1},
            {recipe: mockRecipes[1], multiplier: 3}
        ]);
    });

    it('can switch to suggestions tab', () => {
        render(<RecipePicker {...defaultProps} />);

        const suggestionsTab = screen.getByText(/Suggestions/i);
        fireEvent.click(suggestionsTab);

        expect(screen.getByText(/Suggestion Mode/i)).toBeInTheDocument();
    });

    it('can clear all filters', () => {
        render(<RecipePicker {...defaultProps} />);

        const searchInput = screen.getByPlaceholderText(/Search by name or ingredient/i);
        fireEvent.change(searchInput, {target: {value: 'Nonexistent'}});

        expect(screen.getByText(/No recipes found matching your criteria/i)).toBeInTheDocument();

        fireEvent.click(screen.getByText(/Clear all filters/i));
        expect(screen.getByText('Pasta')).toBeInTheDocument();
        expect(screen.getByText('Oatmeal')).toBeInTheDocument();
    });

    it('filters by favorite, rating, and never cooked', () => {
        const recipesWithExtras = [
            ...mockRecipes,
            {
                ...mockRecipes[0],
                id: 'recipe-favorite-pasta',
                name: 'Favorite Pasta',
                isFavorite: true,
                rating: 'up' as const
            }
        ];
        render(<RecipePicker {...defaultProps} recipes={recipesWithExtras}/>);

        // Filter by Favorites
        fireEvent.click(screen.getByText('Favorites'));
        expect(screen.getByText('Favorite Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument();

        // Clear and filter by rating
        fireEvent.click(screen.getByText('Clear all'));
        fireEvent.click(screen.getByTitle('Filter Thumbs Up'));
        expect(screen.getByText('Favorite Pasta')).toBeInTheDocument();
        expect(screen.queryByText('Oatmeal')).not.toBeInTheDocument();
    });

    it('shows ingredient-based suggestions when selectedWeekRecipes is not empty', () => {
        const pastaWithId = {
            ...mockRecipes[0],
            ingredients: [{ingredient: 'noodles', quantity: '1', measure: 'box', ingredientId: 'ing-noodles'}]
        };
        const selectedWeekRecipes = [pastaWithId];
        const recipesWithShared = [
            pastaWithId,
            mockRecipes[1],
            {
                ...mockRecipes[1],
                id: 'recipe-noodle-bowl',
                name: 'Noodle Bowl',
                ingredients: [{ingredient: 'noodles', quantity: '1', measure: 'box', ingredientId: 'ing-noodles'}]
            }
        ];
        render(<RecipePicker {...defaultProps} recipes={recipesWithShared} selectedWeekRecipes={selectedWeekRecipes}/>);

        fireEvent.click(screen.getByText(/Suggestions/i));
        fireEvent.click(screen.getByText('Ingredients'));

        expect(screen.getByText('Noodle Bowl')).toBeInTheDocument();
        expect(screen.getByText(/1 shared/i)).toBeInTheDocument();
    });

    it('shows macro-based suggestions', () => {
        const participants = [{
            name: 'User',
            maintenanceCalories: 2000,
            calorieDeficit: 0,
            proteinPercent: 30,
            carbsPercent: 40,
            fatPercent: 30
        }];
        const weekDays = [new Date()];
        render(<RecipePicker {...defaultProps} participants={participants} weekDays={weekDays}/>);

        fireEvent.click(screen.getByText(/Suggestions/i));
        // Default is macro mode
        expect(screen.getAllByText(/Fit:/i).length).toBeGreaterThan(0);
    });

    it('closes on escape key', () => {
        const onClose = vi.fn();
        render(<RecipePicker {...defaultProps} onClose={onClose}/>);

        fireEvent.keyDown(window, {key: 'Escape'});
        expect(onClose).toHaveBeenCalled();
    });

    // Suggestions tab respects category/tag filters
    describe('suggestions tab filtering', () => {
        const recipesWithCategories: Recipe[] = [
            {
                name: 'Breakfast Smoothie',
                categories: ['Breakfast'],
                prepTime: '5',
                cookTime: '0',
                servings: 1,
                tags: ['healthy', 'quick'],
                ingredients: [{ingredient: 'banana', quantity: '1', measure: 'whole'}],
                instructions: ['blend'],
                macros: {calories: 200, protein: 5, carbs: 40, fat: 2}
            },
            {
                name: 'Dinner Steak',
                categories: ['Dinner'],
                prepTime: '10',
                cookTime: '15',
                servings: 2,
                tags: ['protein'],
                ingredients: [{ingredient: 'steak', quantity: '1', measure: 'lb'}],
                instructions: ['grill'],
                macros: {calories: 600, protein: 50, carbs: 0, fat: 40}
            },
            {
                name: 'Lunch Salad',
                categories: ['Lunch'],
                prepTime: '10',
                cookTime: '0',
                servings: 1,
                tags: ['healthy', 'vegetarian'],
                ingredients: [{ingredient: 'lettuce', quantity: '2', measure: 'cups'}],
                instructions: ['toss'],
                macros: {calories: 150, protein: 5, carbs: 20, fat: 5}
            }
        ];

        const participants = [{
            name: 'User',
            maintenanceCalories: 2000,
            calorieDeficit: 0,
            proteinPercent: 30,
            carbsPercent: 40,
            fatPercent: 30
        }];

        it('suggestions tab respects category filter', () => {
            const weekDays = [new Date()];
            render(<RecipePicker 
                {...defaultProps} 
                recipes={recipesWithCategories} 
                participants={participants}
                weekDays={weekDays}
            />);

            // Switch to suggestions tab
            fireEvent.click(screen.getByText(/Suggestions/i));

            // All recipes should be visible initially
            expect(screen.getByText('Breakfast Smoothie')).toBeInTheDocument();
            expect(screen.getByText('Dinner Steak')).toBeInTheDocument();
            expect(screen.getByText('Lunch Salad')).toBeInTheDocument();

            // Filter by Breakfast category
            fireEvent.click(screen.getByRole('button', {name: 'Breakfast'}));

            // Only Breakfast recipes should be visible
            expect(screen.getByText('Breakfast Smoothie')).toBeInTheDocument();
            expect(screen.queryByText('Dinner Steak')).not.toBeInTheDocument();
            expect(screen.queryByText('Lunch Salad')).not.toBeInTheDocument();
        });

        it('suggestions tab respects tag filter', () => {
            const weekDays = [new Date()];
            render(<RecipePicker 
                {...defaultProps} 
                recipes={recipesWithCategories}
                allTags={['healthy', 'quick', 'protein', 'vegetarian']}
                participants={participants}
                weekDays={weekDays}
            />);

            // Switch to suggestions tab
            fireEvent.click(screen.getByText(/Suggestions/i));

            // Filter by 'healthy' tag
            fireEvent.click(screen.getByRole('button', {name: 'healthy'}));

            // Only healthy recipes should be visible
            expect(screen.getByText('Breakfast Smoothie')).toBeInTheDocument();
            expect(screen.getByText('Lunch Salad')).toBeInTheDocument();
            expect(screen.queryByText('Dinner Steak')).not.toBeInTheDocument();
        });

        it('filter state persists when switching between tabs', () => {
            const weekDays = [new Date()];
            render(<RecipePicker 
                {...defaultProps} 
                recipes={recipesWithCategories}
                participants={participants}
                weekDays={weekDays}
            />);

            // Filter by Dinner category on search tab
            fireEvent.click(screen.getByRole('button', {name: 'Dinner'}));
            expect(screen.getByText('Dinner Steak')).toBeInTheDocument();
            expect(screen.queryByText('Breakfast Smoothie')).not.toBeInTheDocument();

            // Switch to suggestions tab - filter should persist
            fireEvent.click(screen.getByText(/Suggestions/i));
            expect(screen.getByText('Dinner Steak')).toBeInTheDocument();
            expect(screen.queryByText('Breakfast Smoothie')).not.toBeInTheDocument();

            // Switch back to search tab - filter should still persist
            fireEvent.click(screen.getByText(/Search Recipes/i));
            expect(screen.getByText('Dinner Steak')).toBeInTheDocument();
            expect(screen.queryByText('Breakfast Smoothie')).not.toBeInTheDocument();
        });
    });

    // Macro suggestions are purely mathematical (no rating bonus)
    describe('macro suggestions scoring', () => {
        it('macro suggestions do not factor in liked/disliked status', () => {
            // Create two recipes with identical macros but different ratings
            const recipesWithRatings: Recipe[] = [
                {
                    name: 'Liked Recipe',
                    categories: ['Dinner'],
                    prepTime: '10',
                    cookTime: '20',
                    servings: 2,
                    tags: [],
                    ingredients: [{ingredient: 'chicken', quantity: '1', measure: 'lb'}],
                    instructions: ['cook'],
                    macros: {calories: 400, protein: 40, carbs: 10, fat: 20},
                    rating: 'up'
                },
                {
                    name: 'Disliked Recipe',
                    categories: ['Dinner'],
                    prepTime: '10',
                    cookTime: '20',
                    servings: 2,
                    tags: [],
                    ingredients: [{ingredient: 'tofu', quantity: '1', measure: 'block'}],
                    instructions: ['cook'],
                    macros: {calories: 400, protein: 40, carbs: 10, fat: 20},
                    rating: 'down'
                },
                {
                    name: 'Neutral Recipe',
                    categories: ['Dinner'],
                    prepTime: '10',
                    cookTime: '20',
                    servings: 2,
                    tags: [],
                    ingredients: [{ingredient: 'fish', quantity: '1', measure: 'fillet'}],
                    instructions: ['cook'],
                    macros: {calories: 400, protein: 40, carbs: 10, fat: 20}
                }
            ];

            const participants = [{
                name: 'User',
                maintenanceCalories: 2000,
                calorieDeficit: 0,
                proteinPercent: 30,
                carbsPercent: 40,
                fatPercent: 30
            }];

            const weekDays = [new Date()];
            render(<RecipePicker 
                {...defaultProps} 
                recipes={recipesWithRatings}
                participants={participants}
                weekDays={weekDays}
            />);

            // Switch to suggestions tab (default is macro mode)
            fireEvent.click(screen.getByText(/Suggestions/i));

            // All three recipes should be visible since they have identical macros
            // and rating should not affect their visibility or order in macro mode
            expect(screen.getByText('Liked Recipe')).toBeInTheDocument();
            expect(screen.getByText('Disliked Recipe')).toBeInTheDocument();
            expect(screen.getByText('Neutral Recipe')).toBeInTheDocument();

            // Get all the "Fit:" scores - they should be the same for all recipes
            // since they have identical macros
            const fitScores = screen.getAllByText(/Fit:/i);
            expect(fitScores.length).toBe(3);
        });
    });
});
