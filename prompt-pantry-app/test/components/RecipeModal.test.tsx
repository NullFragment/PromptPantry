import {act, fireEvent, screen} from '@testing-library/react';
import {renderWithAppContext} from '../testHelpers';
import {RecipeModal} from '../../src/components/RecipeModal';
import {Recipe} from '../../src/types';
import {describe, expect, it, vi} from 'vitest';

const mockRecipe: Recipe = {
    name: 'Test Recipe',
    categories: ['Dinner'],
    prepTime: '10 mins',
    cookTime: '20 mins',
    servings: 4,
    tags: ['test'],
    ingredients: [
        {ingredient: 'Ingredient 1', quantity: '1', measure: 'cup'}
    ],
    instructions: ['Step 1', 'Step 2'],
    macros: {calories: 500, protein: 20, carbs: 60, fat: 10}
};

const mockGroupedRecipe: Recipe = {
    name: 'Grouped Recipe',
    categories: ['Dinner'],
    prepTime: '10 mins',
    cookTime: '20 mins',
    servings: 4,
    tags: ['test'],
    ingredients: [
        {
            name: 'Group 1',
            ingredients: [{ingredient: 'Ingredient 1', quantity: '1', measure: 'cup'}]
        }
    ],
    instructions: [
        {
            name: 'Part 1',
            steps: ['Step 1', 'Step 2']
        }
    ],
    macros: {calories: 500, protein: 20, carbs: 60, fat: 10}
};

const mockRecipeWithVideo: Recipe = {
    ...mockRecipe,
    videoLink: 'https://www.youtube.com/watch?v=abc123',
    notes: 'Some recipe notes'
};

const mockRecipeWithVimeo: Recipe = {
    ...mockRecipe,
    videoLink: 'https://vimeo.com/123456789'
};

const mockRecipeWithYoutuBe: Recipe = {
    ...mockRecipe,
    videoLink: 'https://youtu.be/shortcode123'
};

const mockRecipeWithDirectVideo: Recipe = {
    ...mockRecipe,
    videoLink: 'https://example.com/video.mp4'
};

const emptyRecipe: Recipe = {
    name: '',
    categories: [],
    prepTime: '',
    cookTime: '',
    servings: 1,
    tags: [],
    ingredients: [],
    instructions: [],
    macros: {calories: 0, protein: 0, carbs: 0, fat: 0}
};

const mockRecipeWithTags: Recipe = {
    ...mockRecipe,
    tags: ['test', 'vegan']
};

describe('RecipeModal', () => {
    it('renders grouped recipe details', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockGroupedRecipe}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={true}
            />
        );
        expect(screen.getByText('Group 1')).toBeInTheDocument();
        expect(screen.getByText('Part 1')).toBeInTheDocument();
    });

    it('can add and remove groups in edit mode', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockGroupedRecipe}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );

        fireEvent.click(screen.getByTitle('Edit Recipe'));

        fireEvent.click(screen.getAllByText('Add Group')[0]);
        expect(screen.getAllByPlaceholderText(/Group Name/i).length).toBe(3);

        fireEvent.click(screen.getAllByText('Add Group')[1]);
        expect(screen.getAllByPlaceholderText(/Group Name/i).length).toBe(4);
    });
    it('renders recipe details in read-only mode', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipe}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
            />,
            {appContext: {canEdit: false, userTier: 'Viewer'}}
        );
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
        expect(screen.getByText(/Prep: 10 mins/)).toBeInTheDocument();
        expect(screen.getByText(/Cook: 20 mins/)).toBeInTheDocument();
        expect(screen.getByText('Step 1')).toBeInTheDocument();
        expect(screen.queryByTitle('Edit Recipe')).toBeNull();
    });

    it('can enter edit mode and save changes', async () => {
        const onSave = vi.fn();
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipe}
                onClose={vi.fn()}
                onSave={onSave}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );

        await act(async () => {
            fireEvent.click(screen.getByTitle('Edit Recipe'));
        });

        const nameInput = screen.getByDisplayValue('Test Recipe');

        await act(async () => {
            fireEvent.change(nameInput, {target: {value: 'Updated Recipe'}});
            fireEvent.click(screen.getByText('Save Recipe'));
        });

        expect(onSave).toHaveBeenCalled();
        expect(onSave.mock.calls[0][0].name).toBe('Updated Recipe');
    });

    it('can delete a recipe', async () => {
        const onDelete = vi.fn();
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipe}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={onDelete}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );

        fireEvent.click(screen.getByTitle('Delete Recipe'));
        expect(onDelete).toHaveBeenCalledWith('Test Recipe');
    });

    it('can cancel editing', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipe}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );

        fireEvent.click(screen.getByTitle('Edit Recipe'));
        const nameInput = screen.getByDisplayValue('Test Recipe');
        fireEvent.change(nameInput, {target: {value: 'Updated Recipe'}});

        fireEvent.click(screen.getByText('Cancel'));
        expect(screen.getByText('Test Recipe')).toBeInTheDocument();
    });

    it('can toggle categories in edit mode', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipe}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );

        fireEvent.click(screen.getByTitle('Edit Recipe'));

        const lunchButton = screen.getAllByText('Lunch')[0];
        fireEvent.click(lunchButton);
        // Should now have Lunch and Dinner

        const dinnerButton = screen.getAllByText('Dinner')[0];
        fireEvent.click(dinnerButton);
        // Should now only have Lunch
    });

    it('can add and remove ingredients in edit mode', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipe}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );

        fireEvent.click(screen.getByTitle('Edit Recipe'));

        fireEvent.click(screen.getByText('Add Ingredient'));
        expect(screen.getAllByPlaceholderText('Ingredient').length).toBe(2);

        const removeButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-trash'));
        fireEvent.click(removeButtons[1]);
        expect(screen.getAllByPlaceholderText('Ingredient').length).toBe(1);
    });

    it('can add and remove instruction steps', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipe}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );

        fireEvent.click(screen.getByTitle('Edit Recipe'));

        fireEvent.click(screen.getByText('Add Step'));
        // In RecipeModal.tsx:558
        // {(editedRecipe.instructions as string[]).map((step, idx) => (
        //   <div key={idx} className="flex gap-2 items-start">
        //     <span ...>{idx + 1}</span>
        //     <textarea ... />

        expect(screen.getAllByRole('textbox').length).toBeGreaterThan(3); // Name, Prep, Cook, MFP ID + steps

        const removeButtons = screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-trash'));
        // There are trash buttons for: Delete Recipe (if not editing), Ingredients, Instructions.
        // When editing, "Delete Recipe" is NOT rendered.
        // So all trash buttons are for ingredients or steps.

        const initialTrashCount = removeButtons.length;
        fireEvent.click(removeButtons[removeButtons.length - 1]);
        expect(screen.getAllByRole('button').filter(b => b.querySelector('svg.lucide-trash')).length).toBe(initialTrashCount - 1);
    });
    it('renders MFP ID and highlighted ingredients', () => {
        const recipeWithMFP = {...mockRecipe, myFitnessPalId: '12345'};
        renderWithAppContext(
            <RecipeModal
                recipe={recipeWithMFP}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={true}
                highlightedIngredients={['ingredient 1']}
            />
        );
        expect(screen.getByText(/MFP: 12345/)).toBeInTheDocument();
        expect(screen.getByText('Ingredient 1')).toBeInTheDocument();
    });
    it('renders YouTube video player', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipeWithVideo}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={true}
            />
        );
        expect(screen.getByTitle('YouTube video player')).toBeInTheDocument();
        expect(screen.getByText('Some recipe notes')).toBeInTheDocument();
    });

    it('renders Vimeo video player', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipeWithVimeo}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={true}
            />
        );
        const iframe = document.querySelector('iframe');
        expect(iframe).toBeTruthy();
        expect(iframe?.src).toContain('vimeo.com');
    });

    it('renders youtu.be video player', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipeWithYoutuBe}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={true}
            />
        );
        const iframe = document.querySelector('iframe');
        expect(iframe).toBeTruthy();
        expect(iframe?.src).toContain('youtube.com/embed/shortcode123');
    });

    it('renders direct video player', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipeWithDirectVideo}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={true}
            />
        );
        const video = document.querySelector('video');
        expect(video).toBeTruthy();
    });

    it('opens in edit mode for new recipe', () => {
        const onClose = vi.fn();
        renderWithAppContext(
            <RecipeModal
                recipe={emptyRecipe}
                onClose={onClose}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );
        // Should immediately be in edit mode since name is empty
        expect(screen.getByText('Add New Recipe')).toBeInTheDocument();
        expect(screen.getByText('Save Recipe')).toBeInTheDocument();
    });

    it('closes on cancel for new recipe', () => {
        const onClose = vi.fn();
        renderWithAppContext(
            <RecipeModal
                recipe={emptyRecipe}
                onClose={onClose}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );

        fireEvent.click(screen.getByText('Cancel'));
        expect(onClose).toHaveBeenCalled();
    });

    it('closes on escape key', async () => {
        const onClose = vi.fn();
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipe}
                onClose={onClose}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={true}
            />
        );

        await act(async () => {
            fireEvent.keyDown(window, {key: 'Escape', code: 'Escape'});
        });
        expect(onClose).toHaveBeenCalled();
    });

    it('renders both unit systems', () => {
        const recipeWithBoth: Recipe = {
            ...mockRecipe,
            ingredients: [
                {
                    ingredient: 'Flour',
                    quantity: '100',
                    measure: 'g',
                    metric: {quantity: '100', measure: 'g'},
                    imperial: {quantity: '3.5', measure: 'oz'}
                }
            ]
        };

        renderWithAppContext(
            <RecipeModal
                recipe={recipeWithBoth}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="both"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={true}
            />
        );
        expect(screen.getByText(/Flour/)).toBeInTheDocument();
    });

    it('can add tags in edit mode', () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipe}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );

        fireEvent.click(screen.getByTitle('Edit Recipe'));

        // Verify we're in edit mode
        expect(screen.getByText('Edit Recipe', {selector: 'h3'})).toBeInTheDocument();
        // Verify Save Recipe button exists
        expect(screen.getByText('Save Recipe')).toBeInTheDocument();
    });

    it('allows adding tags with spaces and selecting suggested tags', async () => {
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipeWithTags}
                onClose={vi.fn()}
                onSave={vi.fn()}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
                allTags={["vegan", "high protein"]}
            />
        );

        await act(async () => {
            fireEvent.click(screen.getByTitle('Edit Recipe'));
        });

        const tagInput = screen.getByPlaceholderText(/add a tag/i);
        fireEvent.change(tagInput, {target: {value: 'Gluten Free'}});
        fireEvent.keyDown(tagInput, {key: 'Enter', code: 'Enter'});

        expect(screen.getByText('Gluten Free')).toBeInTheDocument();

        const suggested = screen.getByTestId('suggested-tag-high-protein');
        fireEvent.click(suggested);
        expect(screen.queryAllByText('high protein').length).toBeGreaterThanOrEqual(1);

        fireEvent.click(suggested);
        expect(screen.queryAllByText('high protein').length).toBeGreaterThanOrEqual(1);
    });

    it('allows clearing numeric macro and serving fields before saving', async () => {
        const onSave = vi.fn();
        renderWithAppContext(
            <RecipeModal
                recipe={mockRecipe}
                onClose={vi.fn()}
                onSave={onSave}
                onDelete={vi.fn()}
                unitSystem="metric"
                mealPlan={{}}
                multiWeeklyCookPlan={{}}
                readOnly={false}
            />
        );

        await act(async () => {
            fireEvent.click(screen.getByTitle('Edit Recipe'));
        });

        const caloriesInput = screen.getByDisplayValue('500');
        fireEvent.change(caloriesInput, {target: {value: ''}});

        const servingsInput = screen.getByDisplayValue('4');
        fireEvent.change(servingsInput, {target: {value: ''}});

        await act(async () => {
            fireEvent.click(screen.getByText('Save Recipe'));
        });

        expect(onSave).toHaveBeenCalled();
        const saved = onSave.mock.calls[0][0] as Recipe;
        expect(saved.macros.calories).toBe(0);
        expect(saved.servings).toBe(0);
    });
});
