import {describe, expect, it} from 'vitest';
import {
    aggregateIngredients,
    extractMeasureFromName,
    flattenIngredients,
    normalizeIngredientName,
    parseQuantity,
    renderAggregatedMeasurement,
    renderMeasurement,
    renderMeasurementWithConversion
} from '../../src/utils/recipeUtils';
import {Ingredient, IngredientGroup} from '../../src/types';

describe('recipeUtils', () => {
    describe('flattenIngredients', () => {
        it('should handle empty or null ingredients', () => {
            expect(flattenIngredients([])).toEqual([]);
            expect(flattenIngredients(null as any)).toEqual([]);
        });

        it('should flatten grouped ingredients', () => {
            const groups: IngredientGroup[] = [
                {name: 'Group 1', ingredients: [{ingredient: 'Ing 1'} as Ingredient]},
                {name: 'Group 2', ingredients: [{ingredient: 'Ing 2'} as Ingredient]}
            ];
            const flattened = flattenIngredients(groups);
            expect(flattened).toHaveLength(2);
            expect(flattened[0].ingredient).toBe('Ing 1');
            expect(flattened[1].ingredient).toBe('Ing 2');
        });

        it('should return flat ingredients as is', () => {
            const flat: Ingredient[] = [{ingredient: 'Ing 1'} as Ingredient];
            expect(flattenIngredients(flat)).toEqual(flat);
        });
    });

    describe('renderMeasurement', () => {
        const ing = {
            quantity: '1',
            measure: 'cup',
            metric: {quantity: '240', measure: 'ml'},
            imperial: {quantity: '8', measure: 'oz'}
        };

        it('should render metric measurement', () => {
            expect(renderMeasurement(ing, 'metric')).toBe('240 ml');
        });

        it('should render imperial measurement', () => {
            expect(renderMeasurement(ing, 'imperial')).toBe('8 oz');
        });

        it('should render both measurements', () => {
            expect(renderMeasurement(ing, 'both')).toBe('8 oz (240 ml)');
        });

        it('should fallback to generic if metric/imperial missing', () => {
            const simpleIng = {quantity: '1', measure: 'cup'};
            expect(renderMeasurement(simpleIng, 'metric')).toBe('1 cup');
            expect(renderMeasurement(simpleIng, 'both')).toBe('1 cup');
        });

        it('should handle missing quantity', () => {
            expect(renderMeasurement({ingredient: 'Salt'}, 'both')).toBe('');
        });

        it('should not show redundant quantity in parentheses for empty measures', () => {
            const ing = {
                ingredient: 'Lemon',
                quantity: '3',
                measure: '',
                metric: {quantity: '3', measure: ''},
                imperial: {quantity: '3', measure: ''}
            } as Ingredient;
            expect(renderMeasurement(ing, 'both')).toBe('3');
        });
    });

    describe('renderMeasurementWithConversion', () => {
        it('converts imperial volume to metric when metric is selected', () => {
            const ing = {ingredient: 'Milk', quantity: '1', measure: 'cup'} as Ingredient;
            expect(renderMeasurementWithConversion(ing, 'metric')).toBe('236.59 ml (1 cup)');
        });

        it('converts metric weight to imperial when imperial is selected', () => {
            const ing = {ingredient: 'Flour', quantity: '100', measure: 'g'} as Ingredient;
            expect(renderMeasurementWithConversion(ing, 'imperial')).toBe('3.53 oz (100 g)');
        });

        it('shows both measurements when both is selected', () => {
            const ing = {ingredient: 'Milk', quantity: '1', measure: 'cup'} as Ingredient;
            expect(renderMeasurementWithConversion(ing, 'both')).toBe('1 cup (236.59 ml)');
        });

        it('preserves original string when unit already matches selected system', () => {
            const ing = {ingredient: 'Sugar', quantity: '1/2', measure: 'cup'} as Ingredient;
            expect(renderMeasurementWithConversion(ing, 'imperial')).toBe('1/2 cup');
        });
    });

    describe('normalizeIngredientName', () => {
        it('should normalize ingredient names correctly', () => {
            expect(normalizeIngredientName('Fresh Spinach, chopped')).toBe('spinach');
            expect(normalizeIngredientName('Large Onions (diced)')).toBe('onions');
            expect(normalizeIngredientName('Garlic cloves')).toBe('garlic');
            expect(normalizeIngredientName('Frozen Peas')).toBe('peas');
        });
    });

    describe('extractMeasureFromName', () => {
        it('should use existing measure if valid', () => {
            expect(extractMeasureFromName('garlic', 'clove')).toBe('clove');
        });

        it('should extract measure from name if missing', () => {
            expect(extractMeasureFromName('2 cans of beans')).toBe('can');
            expect(extractMeasureFromName('1 packet of yeast')).toBe('packet');
        });

        it('should default to units', () => {
            expect(extractMeasureFromName('apple')).toBe('units');
        });
    });

    describe('parseQuantity', () => {
        it('should parse fractions correctly', () => {
            expect(parseQuantity('1/2')).toBe(0.5);
            expect(parseQuantity('1 ½')).toBe(1.5);
            expect(parseQuantity('¾')).toBe(0.75);
            expect(parseQuantity('1/3')).toBeCloseTo(0.333, 2);
        });

        it('should parse decimals correctly', () => {
            expect(parseQuantity('1.25')).toBe(1.25);
        });

        it('should return 0 for invalid input', () => {
            expect(parseQuantity('')).toBe(0);
            expect(parseQuantity('abc')).toBe(0);
        });
    });

    describe('aggregateIngredients', () => {
        it('should aggregate ingredients with multipliers', () => {
            const items = [
                {
                    ingredient: {ingredient: 'Chicken', quantity: '200', measure: 'g'} as Ingredient,
                    count: 2
                },
                {
                    ingredient: {ingredient: 'Chicken', quantity: '100', measure: 'g'} as Ingredient,
                    count: 1
                }
            ];

            const result = aggregateIngredients(items);
            expect(result.otherTotals['g']).toBe(500);
        });

        it('should handle metric and imperial units', () => {
            const items = [
                {
                    ingredient: {
                        ingredient: 'Flour',
                        metric: {quantity: '100', measure: 'g'},
                        imperial: {quantity: '4', measure: 'oz'}
                    } as Ingredient,
                    count: 2
                }
            ];

            const result = aggregateIngredients(items);
            expect(result.metricTotals['g']).toBe(200);
            expect(result.imperialTotals['oz']).toBe(8);
        });

        it('should handle lb to oz conversion in imperial', () => {
            const items = [
                {
                    ingredient: {
                        ingredient: 'Meat',
                        imperial: {quantity: '1', measure: 'lb'}
                    } as Ingredient,
                    count: 1
                }
            ];
            const result = aggregateIngredients(items);
            expect(result.imperialTotals['oz']).toBe(16);
        });
    });

    describe('renderAggregatedMeasurement', () => {
        const totals = {
            metricTotals: {'g': 500, 'ml': 250},
            imperialTotals: {'oz': 24}, // 1 lb 8 oz
            otherTotals: {'cup': 1.5, 'units': 2}
        };

        it('should render metric aggregated measurement', () => {
            const rendered = renderAggregatedMeasurement(totals, 'metric');
            expect(rendered).toContain('500 g');
            expect(rendered).toContain('250 ml');
            expect(rendered).toContain('1.5 cup');
            expect(rendered).toContain('2');
        });

        it('should render imperial aggregated measurement', () => {
            const rendered = renderAggregatedMeasurement(totals, 'imperial');
            expect(rendered).toContain('1 lb 8 oz');
            expect(rendered).toContain('1.5 cup');
            expect(rendered).toContain('2');
        });

        it('should render both aggregated measurements', () => {
            const rendered = renderAggregatedMeasurement(totals, 'both');
            expect(rendered).toContain('1 lb 8 oz');
            expect(rendered).toContain('(500 g, 250 ml)');
        });

        it('should not show redundant aggregated measurements when metric and imperial are same', () => {
            const sameTotals = {
                metricTotals: {'': 3},
                imperialTotals: {'': 3},
                otherTotals: {}
            };
            const rendered = renderAggregatedMeasurement(sameTotals, 'both');
            expect(rendered).toBe('3');
        });
    });
});
