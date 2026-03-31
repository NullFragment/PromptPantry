import type { StoreSectionDefinition } from '../types';

/**
 * Title-case a string (e.g. "dairy & frozen" -> "Dairy & Frozen").
 */
export function toTitleCase(str: string): string {
    return str
        .toLowerCase()
        .split(' ')
        .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
}

/**
 * Sort section names alphabetically with "Unassigned" last.
 */
export function sortSectionsWithUnassignedLast(sections: string[]): string[] {
    return [...sections].sort((a, b) => {
        if (a === 'Unassigned') return 1;
        if (b === 'Unassigned') return -1;
        return a.localeCompare(b);
    });
}

/**
 * Sort StoreSectionDefinition objects alphabetically by name with "Unassigned" last.
 */
export function sortSectionDefs(defs: StoreSectionDefinition[]): StoreSectionDefinition[] {
    const sorted = [...defs];
    sorted.sort((a, b) => {
        const names = sortSectionsWithUnassignedLast([a.name, b.name]);
        return names[0] === a.name ? -1 : 1;
    });
    return sorted;
}

/**
 * Normalize store section input: trim, treat "unassigned" case-insensitively, title-case.
 * Returns empty string for blank input.
 */
export function normalizeStoreSection(section: string): string {
    const trimmed = section.trim();
    if (!trimmed) return '';
    if (trimmed.toLowerCase() === 'unassigned') return 'Unassigned';
    return toTitleCase(trimmed);
}
