import type { ContainerSize, IngredientConversions, IngredientDefinition } from '../types';

export interface IngredientFormData {
    containerSizes: ContainerSize[];
    conversions?: IngredientConversions;
}

/**
 * Validates aliases: unique, not matching name, no conflict with other ingredients.
 * Returns an error message or null if valid.
 */
export function validateAliases(
    aliases: string[],
    name: string,
    ingredients: IngredientDefinition[],
    editingId: string | null
): string | null {
    const nameLower = name.toLowerCase();
    const seenAliases = new Set<string>();

    for (const alias of aliases) {
        const aliasLower = alias.toLowerCase();
        if (seenAliases.has(aliasLower)) return 'Aliases must be unique';
        if (aliasLower === nameLower) return 'Aliases cannot match the ingredient name';

        const conflict = ingredients.find((ing) => {
            if (editingId && ing.id === editingId) return false;
            const matchesName = ing.name.toLowerCase() === aliasLower;
            const matchesAlias = ing.aliases?.some((a) => a.toLowerCase() === aliasLower);
            return matchesName || matchesAlias;
        });
        if (conflict) return `Alias "${alias}" conflicts with ingredient "${conflict.name}"`;
        seenAliases.add(aliasLower);
    }
    return null;
}

/**
 * Builds the ingredient save payload from form data (container sizes and conversions)
 * plus validated name, store section, and aliases.
 */
export function buildIngredientPayload(
    name: string,
    storeSectionId: string,
    aliases: string[],
    formData: IngredientFormData,
    editingId: string | null
): Partial<IngredientDefinition> & { name: string; storeSectionId: string } {
    const containerSizesFiltered = formData.containerSizes
        .filter((c) => c.quantity > 0 && (c.unit?.trim() ?? '').length > 0)
        .map((c) => ({
            quantity: c.quantity,
            unit: c.unit.trim(),
            label: c.label?.trim() || undefined
        }));

    const conversionsFiltered: IngredientConversions = {};
    if (formData.conversions?.weightToVolume) {
        const w = formData.conversions.weightToVolume.weight;
        const v = formData.conversions.weightToVolume.volume;
        if (w?.quantity > 0 && w?.unit?.trim() && v?.quantity > 0 && v?.unit?.trim()) {
            conversionsFiltered.weightToVolume = {
                weight: { quantity: w.quantity, unit: w.unit.trim() },
                volume: { quantity: v.quantity, unit: v.unit.trim() }
            };
        }
    }
    if (formData.conversions?.portionToVolume) {
        const p = formData.conversions.portionToVolume.portion;
        const v = formData.conversions.portionToVolume.volume;
        if (
            p?.quantity > 0 &&
            p?.description?.trim() &&
            v?.quantity > 0 &&
            v?.unit?.trim()
        ) {
            conversionsFiltered.portionToVolume = {
                portion: { quantity: p.quantity, description: p.description.trim() },
                volume: { quantity: v.quantity, unit: v.unit.trim() }
            };
        }
    }

    const payload: Partial<IngredientDefinition> & { name: string; storeSectionId: string } = {
        name,
        storeSectionId,
        aliases: aliases.length > 0 ? aliases : undefined,
        containerSizes:
            containerSizesFiltered.length > 0 ? containerSizesFiltered : undefined,
        conversions:
            Object.keys(conversionsFiltered).length > 0 ? conversionsFiltered : undefined
    };
    if (editingId) payload.id = editingId;
    return payload;
}
