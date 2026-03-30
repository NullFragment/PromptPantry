import { describe, expect, it } from 'vitest';
import { validateRecipe } from '../../src/utils/recipeValidation.js';

const validRecipe = {
    name: 'Test Recipe',
    categories: ['Dinner'],
    ingredients: [{ ingredient: 'Salt', ingredientId: 'uuid-1' }],
    instructions: ['Cook it'],
    macros: { calories: 100, protein: 10, carbs: 10, fat: 5 },
};

describe('validateRecipe', () => {
    it('returns no errors for a valid recipe', () => {
        expect(validateRecipe(validRecipe as any)).toHaveLength(0);
    });

    it('errors on empty name', () => {
        const errors = validateRecipe({ ...validRecipe, name: '' } as any);
        expect(errors.some(e => e.field === 'name')).toBe(true);
    });

    it('errors on missing categories', () => {
        const errors = validateRecipe({ ...validRecipe, categories: [] } as any);
        expect(errors.some(e => e.field === 'categories')).toBe(true);
    });

    it('errors on empty instructions', () => {
        const errors = validateRecipe({ ...validRecipe, instructions: [] } as any);
        expect(errors.some(e => e.field === 'instructions')).toBe(true);
    });

    it('errors on unlinked ingredient (missing ingredientId)', () => {
        const recipe = {
            ...validRecipe,
            ingredients: [
                { ingredient: 'Salt', ingredientId: 'uuid-1' },
                { ingredient: 'Mystery spice' },
            ],
        };
        const errors = validateRecipe(recipe as any);
        const unlinkedError = errors.find(e => e.field === 'ingredients');
        expect(unlinkedError).toBeDefined();
        expect(unlinkedError?.message).toMatch(/mystery spice/i);
    });

    it('errors on non-numeric macro', () => {
        const errors = validateRecipe({ ...validRecipe, macros: { calories: NaN, protein: 10, carbs: 10, fat: 5 } } as any);
        expect(errors.some(e => e.field === 'macros.calories')).toBe(true);
    });

    it('lists all unlinked ingredients in one error message', () => {
        const recipe = {
            ...validRecipe,
            ingredients: [
                { ingredient: 'Alpha' },
                { ingredient: 'Beta' },
            ],
        };
        const errors = validateRecipe(recipe as any);
        const msg = errors.find(e => e.field === 'ingredients')?.message ?? '';
        expect(msg).toMatch(/alpha/i);
        expect(msg).toMatch(/beta/i);
    });
});
