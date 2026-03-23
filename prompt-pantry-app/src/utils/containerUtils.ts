import type { ContainerSize, IngredientDefinition } from '../types';
import { convertVolume, isVolumeUnit, isWeightUnit, convertUsingIngredient } from './unitConversions';

function toMl(quantity: number, unit: string): number {
    if (!unit?.trim()) return quantity;
    const converted = convertVolume(quantity, unit, 'ml');
    return converted == null ? quantity : converted;
}

export interface ContainerRecommendationItem {
    containerSize: ContainerSize;
    count: number;
}

/**
 * Compute how many of each container size are needed to cover the given quantity.
 * Uses greedy approach: largest container first (or smallest if preferFewerContainers is false).
 * Quantity and unit are the total needed; container sizes are the available options.
 * All units are normalized to ml for comparison; container sizes are sorted by size.
 */
export function calculateContainerNeeds(
    quantity: number,
    unit: string,
    containerSizes: ContainerSize[],
    preferFewerContainers: boolean = true
): ContainerRecommendationItem[] {
    if (!containerSizes?.length || quantity <= 0) return [];

    const needMl = toMl(quantity, unit);
    const withMl = containerSizes
        .filter(c => c.quantity > 0 && c.unit?.trim())
        .map(c => ({ containerSize: c, sizeMl: toMl(c.quantity, c.unit) }))
        .filter(x => x.sizeMl > 0);

    if (withMl.length === 0) return [];

    const sorted = [...withMl].sort((a, b) =>
        preferFewerContainers ? b.sizeMl - a.sizeMl : a.sizeMl - b.sizeMl
    );

    const result: ContainerRecommendationItem[] = [];
    let remaining = needMl;

    for (const { containerSize, sizeMl } of sorted) {
        if (remaining <= 0) break;
        const count = Math.floor(remaining / sizeMl);
        if (count > 0) {
            result.push({ containerSize, count });
            remaining -= count * sizeMl;
        }
    }

    if (remaining > 0 && sorted.length > 0) {
        const smallest = sorted[sorted.length - 1];
        const existing = result.find(r => r.containerSize === smallest.containerSize);
        if (existing) existing.count += 1;
        else result.push({ containerSize: smallest.containerSize, count: 1 });
    }

    return result;
}

/**
 * Format a container recommendation as a human-readable string, e.g. "Buy: 1 gallon + 1 half gallon".
 */
export function formatContainerRecommendation(items: ContainerRecommendationItem[]): string {
    if (!items.length) return '';
    const parts = items.map(({ containerSize, count }) => {
        const label = containerSize.label?.trim() || `${containerSize.quantity} ${containerSize.unit}`;
        return count === 1 ? label : `${count} ${label}`;
    });
    return `Buy: ${parts.join(' + ')}`;
}

/**
 * Format a container recommendation as a short label without the "Buy: " prefix,
 * e.g. "½ gal" or "2 half gallon + 1 quart".
 */
export function formatContainerLabel(items: ContainerRecommendationItem[]): string {
    if (!items.length) return '';
    const parts = items.map(({ containerSize, count }) => {
        const label = containerSize.label?.trim() || `${containerSize.quantity} ${containerSize.unit}`;
        return count === 1 ? label : `${count} ${label}`;
    });
    return parts.join(' + ');
}

/**
 * Like calculateContainerNeeds but handles cross-domain unit mismatches (e.g. recipe in cups,
 * containers in lb). Uses ingredientDef.conversions.weightToVolume to convert the recipe
 * quantity into the container's unit domain before matching.
 */
export function calculateContainerNeedsWithConversions(
    quantity: number,
    unit: string,
    containerSizes: ContainerSize[],
    ingredientDef: IngredientDefinition | null,
    preferFewerContainers: boolean = true
): ContainerRecommendationItem[] {
    if (!containerSizes?.length || quantity <= 0) return [];

    const recipeIsVolume = isVolumeUnit(unit);
    const recipeIsWeight = isWeightUnit(unit);

    // Determine container domain from first valid container
    const validContainers = containerSizes.filter(c => c.quantity > 0 && c.unit?.trim());
    if (!validContainers.length) return [];

    const containerUnit = validContainers[0].unit;
    const containerIsVolume = isVolumeUnit(containerUnit);
    const containerIsWeight = isWeightUnit(containerUnit);

    // Same domain (or both "each") — pass through directly
    const sameDomain =
        (recipeIsVolume && containerIsVolume) ||
        (recipeIsWeight && containerIsWeight) ||
        (!recipeIsVolume && !recipeIsWeight && !containerIsVolume && !containerIsWeight);

    if (sameDomain) {
        return calculateContainerNeeds(quantity, unit, containerSizes, preferFewerContainers);
    }

    // Cross-domain: use ingredientDef's weightToVolume conversion ratio
    const conv = ingredientDef?.conversions?.weightToVolume;
    if (conv) {
        if (recipeIsWeight && containerIsVolume) {
            const converted = convertUsingIngredient(quantity, unit, conv.volume.unit, ingredientDef!);
            if (converted != null) {
                return calculateContainerNeeds(converted, conv.volume.unit, containerSizes, preferFewerContainers);
            }
        }
        if (recipeIsVolume && containerIsWeight) {
            const converted = convertUsingIngredient(quantity, unit, conv.weight.unit, ingredientDef!);
            if (converted != null) {
                return calculateContainerNeeds(converted, conv.weight.unit, containerSizes, preferFewerContainers);
            }
        }
    }

    // Fallback: attempt direct conversion (may be inaccurate for cross-domain)
    return calculateContainerNeeds(quantity, unit, containerSizes, preferFewerContainers);
}
