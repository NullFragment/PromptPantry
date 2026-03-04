import { describe, it, expect } from 'vitest';
import {
    validateAliases,
    buildIngredientPayload
} from '../../src/utils/ingredientFormUtils';
import type { IngredientDefinition } from '../../src/types';

describe('ingredientFormUtils', () => {
    const baseIngredient: IngredientDefinition = {
        id: 'id-1',
        name: 'Garlic',
        storeSection: 'Produce',
        aliases: ['minced garlic']
    };

    describe('validateAliases', () => {
        it('returns null for valid unique aliases', () => {
            expect(
                validateAliases(['garlic clove', 'minced'], 'Garlic', [baseIngredient], 'id-1')
            ).toBeNull();
        });

        it('returns error when aliases duplicate each other', () => {
            expect(
                validateAliases(['a', 'A'], 'Garlic', [baseIngredient], null)
            ).toBe('Aliases must be unique');
        });

        it('returns error when alias matches ingredient name', () => {
            expect(
                validateAliases(['garlic'], 'Garlic', [baseIngredient], 'id-1')
            ).toBe('Aliases cannot match the ingredient name');
        });

        it('returns error when alias conflicts with another ingredient name', () => {
            const other: IngredientDefinition = {
                id: 'id-2',
                name: 'Onion',
                storeSection: 'Produce'
            };
            expect(
                validateAliases(['Onion'], 'Garlic', [baseIngredient, other], null)
            ).toBe('Alias "Onion" conflicts with ingredient "Onion"');
        });

        it('returns error when alias conflicts with another ingredient alias', () => {
            expect(
                validateAliases(['minced garlic'], 'Onion', [baseIngredient], null)
            ).toBe('Alias "minced garlic" conflicts with ingredient "Garlic"');
        });

        it('excludes editing ingredient from conflict check', () => {
            expect(
                validateAliases(['minced garlic'], 'Garlic', [baseIngredient], 'id-1')
            ).toBeNull();
        });
    });

    describe('buildIngredientPayload', () => {
        it('builds payload with name, storeSection, aliases', () => {
            const payload = buildIngredientPayload(
                'Garlic',
                'Produce',
                ['clove', 'minced'],
                { containerSizes: [], conversions: {} },
                null
            );
            expect(payload.name).toBe('Garlic');
            expect(payload.storeSection).toBe('Produce');
            expect(payload.aliases).toEqual(['clove', 'minced']);
            expect(payload.containerSizes).toBeUndefined();
            expect(payload.conversions).toBeUndefined();
        });

        it('adds id when editingId is set', () => {
            const payload = buildIngredientPayload(
                'Garlic',
                'Produce',
                [],
                { containerSizes: [], conversions: {} },
                'id-1'
            );
            expect(payload.id).toBe('id-1');
        });

        it('filters and normalizes container sizes', () => {
            const payload = buildIngredientPayload(
                'Milk',
                'Dairy',
                [],
                {
                    containerSizes: [
                        { quantity: 1, unit: 'gallon', label: 'Gallon' },
                        { quantity: 0, unit: '', label: '' }
                    ],
                    conversions: {}
                },
                null
            );
            expect(payload.containerSizes).toHaveLength(1);
            expect(payload.containerSizes![0]).toEqual({
                quantity: 1,
                unit: 'gallon',
                label: 'Gallon'
            });
        });

        it('includes valid weightToVolume and portionToVolume conversions', () => {
            const payload = buildIngredientPayload(
                'Flour',
                'Baking',
                [],
                {
                    containerSizes: [],
                    conversions: {
                        weightToVolume: {
                            weight: { quantity: 100, unit: 'g' },
                            volume: { quantity: 1, unit: 'cup' }
                        },
                        portionToVolume: {
                            portion: { quantity: 1, description: 'clove' },
                            volume: { quantity: 1, unit: 'tsp' }
                        }
                    }
                },
                null
            );
            expect(payload.conversions?.weightToVolume).toEqual({
                weight: { quantity: 100, unit: 'g' },
                volume: { quantity: 1, unit: 'cup' }
            });
            expect(payload.conversions?.portionToVolume).toEqual({
                portion: { quantity: 1, description: 'clove' },
                volume: { quantity: 1, unit: 'tsp' }
            });
        });
    });
});
