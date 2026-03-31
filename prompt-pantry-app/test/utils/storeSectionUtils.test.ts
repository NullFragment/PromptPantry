import { describe, it, expect } from 'vitest';
import { sortSectionDefs } from '../../src/utils/storeSectionUtils';
import type { StoreSectionDefinition } from '../../src/types';

describe('sortSectionDefs', () => {
    it('sorts definitions alphabetically by name', () => {
        const input: StoreSectionDefinition[] = [
            { name: 'Produce' },
            { name: 'Dairy' },
            { name: 'Meat' },
        ];
        const result = sortSectionDefs(input);
        expect(result.map(d => d.name)).toEqual(['Dairy', 'Meat', 'Produce']);
    });

    it('pins Unassigned last regardless of alphabetical position', () => {
        const input: StoreSectionDefinition[] = [
            { name: 'Unassigned' },
            { name: 'Produce' },
            { name: 'Dairy' },
        ];
        const result = sortSectionDefs(input);
        expect(result.map(d => d.name)).toEqual(['Dairy', 'Produce', 'Unassigned']);
    });

    it('preserves emoji field when present', () => {
        const input: StoreSectionDefinition[] = [
            { name: 'Produce', emoji: '🥦' },
            { name: 'Dairy', emoji: '🥛' },
        ];
        const result = sortSectionDefs(input);
        expect(result[0]).toEqual({ name: 'Dairy', emoji: '🥛' });
        expect(result[1]).toEqual({ name: 'Produce', emoji: '🥦' });
    });

    it('returns empty array unchanged', () => {
        expect(sortSectionDefs([])).toEqual([]);
    });
});
