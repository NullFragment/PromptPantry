import type { IngredientDefinition } from '../types';

// Volume: base = ml
const VOLUME_TO_ML: Record<string, number> = {
    ml: 1,
    l: 1000,
    liter: 1000,
    liters: 1000,
    cup: 236.588,
    cups: 236.588,
    tbsp: 14.787,
    tbs: 14.787,
    tsp: 4.929,
    'fl oz': 29.574,
    'fluid ounce': 29.574,
    gallon: 3785.41,
    gallons: 3785.41,
    'half gallon': 1892.71,
    'half gallons': 1892.71,
    quart: 946.353,
    quarts: 946.353,
    pint: 473.176,
    pints: 473.176
};

// Weight: base = g
const WEIGHT_TO_G: Record<string, number> = {
    g: 1,
    gram: 1,
    grams: 1,
    kg: 1000,
    kilogram: 1000,
    kilograms: 1000,
    oz: 28.3495,
    lb: 453.592,
    lbs: 453.592,
    pound: 453.592,
    pounds: 453.592
};

function normalizeUnitKey(u: string): string {
    return u.toLowerCase().trim().replace(/\s+/g, ' ');
}

function volumeToMl(quantity: number, unit: string): number {
    const key = normalizeUnitKey(unit);
    const factor = VOLUME_TO_ML[key] ?? VOLUME_TO_ML[key.replace(/s$/, '')];
    return factor != null ? quantity * factor : NaN;
}

function weightToG(quantity: number, unit: string): number {
    const key = normalizeUnitKey(unit);
    const factor = WEIGHT_TO_G[key] ?? WEIGHT_TO_G[key.replace(/s$/, '')];
    return factor != null ? quantity * factor : NaN;
}

export function isVolumeUnit(unit: string): boolean {
    const key = normalizeUnitKey(unit);
    return key in VOLUME_TO_ML || key.replace(/s$/, '') in VOLUME_TO_ML;
}

export function isWeightUnit(unit: string): boolean {
    const key = normalizeUnitKey(unit);
    return key in WEIGHT_TO_G || key.replace(/s$/, '') in WEIGHT_TO_G;
}

const METRIC_VOLUME = new Set(['ml', 'l', 'liter', 'liters']);
const METRIC_WEIGHT = new Set(['g', 'gram', 'grams', 'kg', 'kilogram', 'kilograms']);

export function isMetricUnit(unit: string): boolean {
    const key = normalizeUnitKey(unit).replace(/s$/, '');
    return METRIC_VOLUME.has(key) || METRIC_WEIGHT.has(key);
}

export function isImperialUnit(unit: string): boolean {
    return isVolumeUnit(unit) || isWeightUnit(unit) ? !isMetricUnit(unit) : false;
}

/**
 * Convert volume from one unit to another. Returns null if units are not volume.
 */
export function convertVolume(value: number, fromUnit: string, toUnit: string): number | null {
    const fromMl = volumeToMl(1, fromUnit);
    const toMl = volumeToMl(1, toUnit);
    if (Number.isNaN(fromMl) || Number.isNaN(toMl) || toMl === 0) return null;
    return (value * fromMl) / toMl;
}

/**
 * Convert weight from one unit to another. Returns null if units are not weight.
 */
export function convertWeight(value: number, fromUnit: string, toUnit: string): number | null {
    const fromG = weightToG(1, fromUnit);
    const toG = weightToG(1, toUnit);
    if (Number.isNaN(fromG) || Number.isNaN(toG) || toG === 0) return null;
    return (value * fromG) / toG;
}

/**
 * Use ingredient's conversion data to convert value from fromUnit to toUnit when applicable.
 * E.g. weightToVolume: 120g = 1 cup → convert 240 g to cup using that ratio.
 * Returns null if no applicable conversion or units don't match.
 */
export function convertUsingIngredient(
    value: number,
    fromUnit: string,
    toUnit: string,
    ingredient: IngredientDefinition
): number | null {
    const conv = ingredient.conversions;
    if (!conv) return null;

    const fromVol = isVolumeUnit(fromUnit);
    const toVol = isVolumeUnit(toUnit);
    const fromWt = isWeightUnit(fromUnit);
    const toWt = isWeightUnit(toUnit);

    if (fromWt && toVol && conv.weightToVolume) {
        const { weight, volume } = conv.weightToVolume;
        const fromG = weightToG(value, fromUnit);
        const refG = weightToG(weight.quantity, weight.unit);
        const refMl = volumeToMl(volume.quantity, volume.unit);
        if (Number.isNaN(fromG) || Number.isNaN(refG) || refG === 0) return null;
        const ml = (fromG / refG) * refMl;
        const toMl = volumeToMl(1, toUnit);
        return Number.isNaN(toMl) || toMl === 0 ? null : ml / toMl;
    }

    if (fromVol && toWt && conv.weightToVolume) {
        const { weight, volume } = conv.weightToVolume;
        const fromMl = volumeToMl(value, fromUnit);
        const refMl = volumeToMl(volume.quantity, volume.unit);
        const refG = weightToG(weight.quantity, weight.unit);
        if (Number.isNaN(fromMl) || Number.isNaN(refMl) || refMl === 0) return null;
        const g = (fromMl / refMl) * refG;
        const toG = weightToG(1, toUnit);
        return Number.isNaN(toG) || toG === 0 ? null : g / toG;
    }

    if (fromVol && toVol) return convertVolume(value, fromUnit, toUnit);
    if (fromWt && toWt) return convertWeight(value, fromUnit, toUnit);

    return null;
}

/**
 * Normalize a quantity to a preferred unit for display. Prefer metric when preferMetric is true.
 * Uses ingredient conversions when needed (e.g. weight → volume). Returns { value, unit } or null.
 */
export function normalizeToPreferredUnit(
    value: number,
    unit: string,
    ingredient: IngredientDefinition | null | undefined,
    preferMetric: boolean
): { value: number; unit: string } | null {
    const targetVol = preferMetric ? 'ml' : 'cup';
    const targetWeight = preferMetric ? 'g' : 'oz';

    if (isVolumeUnit(unit)) {
        const converted = ingredient
            ? convertUsingIngredient(value, unit, targetVol, ingredient)
            : convertVolume(value, unit, targetVol);
        if (converted != null) return { value: converted, unit: targetVol };
        return { value, unit };
    }

    if (isWeightUnit(unit)) {
        const converted = ingredient
            ? convertUsingIngredient(value, unit, targetWeight, ingredient)
            : convertWeight(value, unit, targetWeight);
        if (converted != null) return { value: converted, unit: targetWeight };
        return { value, unit };
    }

    return { value, unit };
}
