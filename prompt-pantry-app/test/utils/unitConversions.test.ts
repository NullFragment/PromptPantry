import { describe, expect, it } from 'vitest';
import {
    convertVolume,
    convertWeight,
    convertUsingIngredient,
    isVolumeUnit,
    isWeightUnit,
    isMetricUnit,
    normalizeToPreferredUnit
} from '../../src/utils/unitConversions';
import type { IngredientDefinition } from '../../src/types';

describe('unitConversions', () => {
    describe('convertVolume', () => {
        it('converts cup to ml', () => {
            const result = convertVolume(1, 'cup', 'ml');
            expect(result).toBeCloseTo(236.588, 1);
        });

        it('converts ml to cup', () => {
            const result = convertVolume(236.588, 'ml', 'cup');
            expect(result).toBeCloseTo(1, 2);
        });

        it('converts gallon to l', () => {
            const result = convertVolume(1, 'gallon', 'l');
            expect(result).toBeCloseTo(3.785, 2);
        });

        it('returns null for non-volume units', () => {
            expect(convertVolume(1, 'g', 'ml')).toBeNull();
        });
    });

    describe('convertWeight', () => {
        it('converts oz to g', () => {
            const result = convertWeight(1, 'oz', 'g');
            expect(result).toBeCloseTo(28.35, 1);
        });

        it('converts lb to oz', () => {
            const result = convertWeight(1, 'lb', 'oz');
            expect(result).toBeCloseTo(16, 1);
        });

        it('returns null for non-weight units', () => {
            expect(convertWeight(1, 'cup', 'g')).toBeNull();
        });
    });

    describe('convertUsingIngredient', () => {
        it('uses weightToVolume to convert weight to volume', () => {
            const ingredient: IngredientDefinition = {
                id: 'id',
                name: 'flour',
                storeSection: 'Baking',
                conversions: {
                    weightToVolume: {
                        weight: { quantity: 120, unit: 'g' },
                        volume: { quantity: 1, unit: 'cup' }
                    }
                }
            };
            const result = convertUsingIngredient(240, 'g', 'cup', ingredient);
            expect(result).toBeCloseTo(2, 2);
        });

        it('uses weightToVolume to convert volume to weight', () => {
            const ingredient: IngredientDefinition = {
                id: 'id',
                name: 'flour',
                storeSection: 'Baking',
                conversions: {
                    weightToVolume: {
                        weight: { quantity: 120, unit: 'g' },
                        volume: { quantity: 1, unit: 'cup' }
                    }
                }
            };
            const result = convertUsingIngredient(2, 'cup', 'g', ingredient);
            expect(result).toBeCloseTo(240, 0);
        });

        it('returns null when ingredient has no conversions', () => {
            const ingredient: IngredientDefinition = { id: 'id', name: 'salt', storeSection: 'Baking' };
            expect(convertUsingIngredient(1, 'cup', 'g', ingredient)).toBeNull();
        });

        it('returns null when conversion not applicable', () => {
            const ingredient: IngredientDefinition = {
                id: 'id',
                name: 'flour',
                storeSection: 'Baking',
                conversions: { portionToVolume: { portion: { quantity: 1, description: 'clove' }, volume: { quantity: 1, unit: 'tsp' } } }
            };
            expect(convertUsingIngredient(100, 'g', 'cup', ingredient)).toBeNull();
        });
    });

    describe('isVolumeUnit / isWeightUnit / isMetricUnit', () => {
        it('identifies volume units', () => {
            expect(isVolumeUnit('ml')).toBe(true);
            expect(isVolumeUnit('cup')).toBe(true);
            expect(isVolumeUnit('g')).toBe(false);
        });

        it('identifies weight units', () => {
            expect(isWeightUnit('g')).toBe(true);
            expect(isWeightUnit('oz')).toBe(true);
            expect(isWeightUnit('cup')).toBe(false);
        });

        it('identifies metric units', () => {
            expect(isMetricUnit('ml')).toBe(true);
            expect(isMetricUnit('g')).toBe(true);
            expect(isMetricUnit('cup')).toBe(false);
        });
    });

    describe('normalizeToPreferredUnit', () => {
        it('returns same value when no ingredient and unit unknown', () => {
            const result = normalizeToPreferredUnit(2, 'portion', null, true);
            expect(result).toEqual({ value: 2, unit: 'portion' });
        });

        it('converts volume to ml when preferMetric', () => {
            const result = normalizeToPreferredUnit(1, 'cup', null, true);
            expect(result?.unit).toBe('ml');
            expect(result?.value).toBeCloseTo(236.588, 0);
        });

        it('converts weight to g when preferMetric', () => {
            const result = normalizeToPreferredUnit(1, 'oz', null, true);
            expect(result?.unit).toBe('g');
            expect(result?.value).toBeCloseTo(28.35, 0);
        });
    });
});
