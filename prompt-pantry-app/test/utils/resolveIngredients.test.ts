import { describe, expect, it } from 'vitest';
import { resolveIngredients } from '../../src/utils/recipeImporter.js';
import type { IngredientDefinition } from '../../src/types.js';

const library: IngredientDefinition[] = [
    { id: 'uuid-1', name: 'Chicken Breast', aliases: ['chicken', 'breast of chicken'], storeSection: 'Meat', containerSizes: [], conversions: {} },
    { id: 'uuid-2', name: 'All-Purpose Flour', aliases: ['flour', 'plain flour'], storeSection: 'Baking', containerSizes: [], conversions: {} },
    { id: 'uuid-3', name: 'Olive Oil', aliases: ['EVOO', 'extra virgin olive oil'], storeSection: 'Oils', containerSizes: [], conversions: {} },
];

describe('resolveIngredients', () => {
    it('matches by canonical name (case-insensitive)', () => {
        const result = resolveIngredients([{ ingredient: 'chicken breast' }], library);
        expect(result[0].ingredientId).toBe('uuid-1');
    });

    it('matches by alias (case-insensitive)', () => {
        const result = resolveIngredients([{ ingredient: 'plain flour' }], library);
        expect(result[0].ingredientId).toBe('uuid-2');
    });

    it('leaves ingredientId undefined when no match', () => {
        const result = resolveIngredients([{ ingredient: 'dragon fruit' }], library);
        expect(result[0].ingredientId).toBeUndefined();
    });

    it('preserves quantity and measure', () => {
        const result = resolveIngredients([{ ingredient: 'flour', quantity: '2', measure: 'cups' }], library);
        expect(result[0].quantity).toBe('2');
        expect(result[0].measure).toBe('cups');
    });

    it('handles an empty library gracefully', () => {
        const result = resolveIngredients([{ ingredient: 'salt' }], []);
        expect(result[0].ingredientId).toBeUndefined();
    });
});
