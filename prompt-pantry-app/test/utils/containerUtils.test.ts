import { describe, expect, it } from 'vitest';
import {
    calculateContainerNeeds,
    formatContainerRecommendation,
    type ContainerRecommendationItem
} from '../../src/utils/containerUtils';
import type { ContainerSize } from '../../src/types';

describe('containerUtils', () => {
    const containerSizes: ContainerSize[] = [
        { quantity: 3.78, unit: 'l', label: 'gallon' },
        { quantity: 1.89, unit: 'l', label: 'half gallon' },
        { quantity: 1, unit: 'l' }
    ];

    describe('calculateContainerNeeds', () => {
        it('returns optimal combo (greedy by largest first)', () => {
            const result = calculateContainerNeeds(5, 'l', containerSizes, true);
            expect(result.length).toBeGreaterThanOrEqual(1);
            expect(result[0].containerSize.label).toBe('gallon');
            expect(result[0].count).toBe(1);
            // Remainder is filled with next sizes; second may be 1 L (no label) or half gallon depending on remainder
            if (result[1]) {
                expect(result[1].count).toBeGreaterThanOrEqual(1);
                expect([1.89, 1]).toContain(result[1].containerSize.quantity);
            }
        });

        it('handles single container size', () => {
            const single = [{ quantity: 1, unit: 'l' }];
            const result = calculateContainerNeeds(3.5, 'l', single, true);
            expect(result).toHaveLength(1);
            expect(result[0].count).toBe(4);
        });

        it('handles multiple sizes and adds one smallest when remainder', () => {
            const result = calculateContainerNeeds(2, 'l', containerSizes, true);
            expect(result.length).toBeGreaterThanOrEqual(1);
            const totalL = result.reduce((sum, { containerSize, count }) => {
                const q = containerSize.unit === 'l' ? containerSize.quantity : 0;
                return sum + q * count;
            }, 0);
            expect(totalL).toBeGreaterThanOrEqual(2);
        });

        it('returns empty array when containerSizes empty', () => {
            expect(calculateContainerNeeds(5, 'l', [], true)).toEqual([]);
        });

        it('returns empty array when quantity <= 0', () => {
            expect(calculateContainerNeeds(0, 'l', containerSizes, true)).toEqual([]);
        });
    });

    describe('formatContainerRecommendation', () => {
        it('formats single item', () => {
            const items: ContainerRecommendationItem[] = [
                { containerSize: { quantity: 3.78, unit: 'l', label: 'gallon' }, count: 1 }
            ];
            expect(formatContainerRecommendation(items)).toBe('Buy: gallon');
        });

        it('formats multiple items with count', () => {
            const items: ContainerRecommendationItem[] = [
                { containerSize: { quantity: 3.78, unit: 'l', label: 'gallon' }, count: 2 },
                { containerSize: { quantity: 1.89, unit: 'l', label: 'half gallon' }, count: 1 }
            ];
            expect(formatContainerRecommendation(items)).toBe('Buy: 2 gallon + half gallon');
        });

        it('returns empty string for empty array', () => {
            expect(formatContainerRecommendation([])).toBe('');
        });

        it('uses quantity and unit when no label', () => {
            const items: ContainerRecommendationItem[] = [
                { containerSize: { quantity: 1, unit: 'l' }, count: 1 }
            ];
            expect(formatContainerRecommendation(items)).toBe('Buy: 1 l');
        });
    });
});
