import {fireEvent, render, screen, waitFor} from '@testing-library/react';
import {beforeEach, describe, expect, it, vi} from 'vitest';
import {IngredientDetailPopup} from '../../src/components/IngredientDetailPopup';
import type {IngredientDefinition} from '../../src/types';

describe('IngredientDetailPopup', () => {
    const baseIngredient: IngredientDefinition = {
        id: 'ing-1',
        name: 'garlic',
        storeSection: 'Produce',
        aliases: ['garlic, minced', 'garlic clove']
    };

    beforeEach(() => {
        vi.clearAllMocks();
    });

    it('renders ingredient name and store section', async () => {
        const onCheckUsage = vi.fn().mockResolvedValue({recipeCount: 0, recipeNames: []});
        render(
            <IngredientDetailPopup
                ingredient={baseIngredient}
                onClose={vi.fn()}
                onCheckUsage={onCheckUsage}
                onRecipeClick={vi.fn()}
            />
        );

        expect(screen.getByText('garlic')).toBeInTheDocument();
        expect(screen.getByText('Store Section:')).toBeInTheDocument();
        expect(screen.getByText('Produce')).toBeInTheDocument();

        await waitFor(() => {
            expect(onCheckUsage).toHaveBeenCalledWith('ing-1');
        });
    });

    it('displays aliases when present and shows empty state when none', () => {
        const onCheckUsage = vi.fn().mockResolvedValue({recipeCount: 0, recipeNames: []});

        // With aliases
        const {rerender} = render(
            <IngredientDetailPopup
                ingredient={baseIngredient}
                onClose={vi.fn()}
                onCheckUsage={onCheckUsage}
                onRecipeClick={vi.fn()}
            />
        );
        expect(screen.getByText(/Aliases \(2\)/)).toBeInTheDocument();
        expect(screen.getByText('garlic, minced')).toBeInTheDocument();

        // Without aliases - section still visible with empty state
        rerender(
            <IngredientDetailPopup
                ingredient={{...baseIngredient, aliases: undefined}}
                onClose={vi.fn()}
                onCheckUsage={onCheckUsage}
                onRecipeClick={vi.fn()}
            />
        );
        expect(screen.getByText('No aliases.')).toBeInTheDocument();
    });

    it('shows loading state while fetching usage', async () => {
        let resolveUsage: ((value: { recipeCount: number; recipeNames: string[] }) => void) | null = null;
        const onCheckUsage = vi.fn().mockImplementation(
            () =>
                new Promise(resolve => {
                    resolveUsage = resolve;
                })
        );

        const {container} = render(
            <IngredientDetailPopup
                ingredient={baseIngredient}
                onClose={vi.fn()}
                onCheckUsage={onCheckUsage}
                onRecipeClick={vi.fn()}
            />
        );

        expect(screen.getByText('Loading recipes...')).toBeInTheDocument();

        // Resolve the usage promise
        resolveUsage?.({recipeCount: 0, recipeNames: []});

        await waitFor(() => {
            expect(screen.queryByText('Loading recipes...')).not.toBeInTheDocument();
            // Empty state text should now be visible
            expect(
                screen.getByText('This ingredient is not used in any recipes.')
            ).toBeInTheDocument();
        });

        expect(container).toBeTruthy();
    });

    it('displays recipe list after loading usage', async () => {
        const onCheckUsage = vi.fn().mockResolvedValue({
            recipeCount: 2,
            recipeNames: ['Garlic Bread', 'Roasted Garlic Chicken']
        });

        render(
            <IngredientDetailPopup
                ingredient={baseIngredient}
                onClose={vi.fn()}
                onCheckUsage={onCheckUsage}
                onRecipeClick={vi.fn()}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Used in Recipes (2)')).toBeInTheDocument();
        });

        expect(screen.getByText('Garlic Bread')).toBeInTheDocument();
        expect(screen.getByText('Roasted Garlic Chicken')).toBeInTheDocument();
    });

    it('invokes onRecipeClick when a recipe is clicked', async () => {
        const onCheckUsage = vi.fn().mockResolvedValue({
            recipeCount: 1,
            recipeNames: ['Garlic Bread']
        });
        const onRecipeClick = vi.fn();

        render(
            <IngredientDetailPopup
                ingredient={baseIngredient}
                onClose={vi.fn()}
                onCheckUsage={onCheckUsage}
                onRecipeClick={onRecipeClick}
            />
        );

        await waitFor(() => {
            expect(screen.getByText('Garlic Bread')).toBeInTheDocument();
        });

        fireEvent.click(screen.getByText('Garlic Bread'));

        expect(onRecipeClick).toHaveBeenCalledWith('Garlic Bread');
    });

    it('closes when clicking the header close button', () => {
        const onClose = vi.fn();
        const onCheckUsage = vi.fn().mockResolvedValue({recipeCount: 0, recipeNames: []});

        render(
            <IngredientDetailPopup
                ingredient={baseIngredient}
                onClose={onClose}
                onCheckUsage={onCheckUsage}
                onRecipeClick={vi.fn()}
            />
        );

        const closeButton = screen.getByLabelText('Close');
        fireEvent.click(closeButton);

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes on Escape key press', () => {
        const onClose = vi.fn();
        const onCheckUsage = vi.fn().mockResolvedValue({recipeCount: 0, recipeNames: []});

        render(
            <IngredientDetailPopup
                ingredient={baseIngredient}
                onClose={onClose}
                onCheckUsage={onCheckUsage}
                onRecipeClick={vi.fn()}
            />
        );

        fireEvent.keyDown(document, {key: 'Escape', code: 'Escape'});

        expect(onClose).toHaveBeenCalledTimes(1);
    });

    it('closes when clicking on the backdrop', () => {
        const onClose = vi.fn();
        const onCheckUsage = vi.fn().mockResolvedValue({recipeCount: 0, recipeNames: []});

        const {container} = render(
            <IngredientDetailPopup
                ingredient={baseIngredient}
                onClose={onClose}
                onCheckUsage={onCheckUsage}
                onRecipeClick={vi.fn()}
            />
        );

        const backdrop = container.firstChild as HTMLElement;
        fireEvent.click(backdrop);

        expect(onClose).toHaveBeenCalledTimes(1);
    });
});
