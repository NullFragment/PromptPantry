import {Ingredient, IngredientDefinition, IngredientGroup, InstructionGroup, Recipe, StoreSectionDefinition} from '../types';
import {convertVolume, convertWeight, isImperialUnit, isMetricUnit, isVolumeUnit, isWeightUnit} from './unitConversions';

export const flattenInstructions = (instructions: string[] | InstructionGroup[]): string[] => {
    if (!instructions || instructions.length === 0) return [];
    const first = instructions[0];
    if (first && typeof first === 'object' && 'steps' in first) {
        return (instructions as InstructionGroup[]).flatMap(group => group.steps);
    }
    return instructions as string[];
};

export const flattenIngredients = (ingredients: Ingredient[] | IngredientGroup[]): Ingredient[] => {
    if (!ingredients || ingredients.length === 0) return [];
    const first = ingredients[0];
    if (first && 'ingredients' in first) {
        return (ingredients as IngredientGroup[]).flatMap(group => group.ingredients);
    }
    return ingredients as Ingredient[];
};

const formatQuantityUnit = (q: string | undefined, m: string | undefined, defaultSpace: boolean): string => {
    if (!q) return '';
    const unit = (!m || m === 'undefined' || m === 'units') ? '' : m;
    const space = (defaultSpace || unit.length > 2) && unit ? ' ' : '';
    return `${q}${space}${unit}`;
};

export const renderMeasurement = (ing: Ingredient, system: 'metric' | 'imperial' | 'both'): string => {
    const metric = ing.metric ? formatQuantityUnit(ing.metric.quantity, ing.metric.measure, true) : null;
    const imperial = ing.imperial ? formatQuantityUnit(ing.imperial.quantity, ing.imperial.measure, true) : null;
    const generic = formatQuantityUnit(ing.quantity, ing.measure, true);

    if (system === 'metric') return metric || generic;
    if (system === 'imperial') return imperial || generic;

    if (metric && imperial && metric !== imperial) {
        return `${imperial} (${metric})`;
    }
    return imperial || metric || generic;
};

export const renderMeasurementWithConversion = (ing: Ingredient, system: 'metric' | 'imperial' | 'both'): string => {
    // If explicit metric/imperial measurements exist, use the existing behavior.
    if (ing.metric || ing.imperial) {
        return renderMeasurement(ing, system);
    }

    const formatValue = (val: number) => Number(val.toFixed(2));

    if (!ing.quantity) return '';

    const unitRaw = extractMeasureFromName(ing.ingredient, ing.measure);
    const unit = (!unitRaw || unitRaw === 'undefined' || unitRaw === 'units') ? '' : unitRaw;
    const base = formatQuantityUnit(ing.quantity, unit, true);
    if (!unit) return base;

    const qty = parseQuantity(ing.quantity);
    if (!qty || !Number.isFinite(qty)) return base;

    const convertible = isVolumeUnit(unit) || isWeightUnit(unit);
    if (!convertible) return base;

    const baseIsMetric = isMetricUnit(unit);
    const baseIsImperial = isImperialUnit(unit);

    const convertToMetric = (): string | null => {
        if (isVolumeUnit(unit)) {
            const converted = convertVolume(qty, unit, 'ml');
            return converted == null ? null : formatQuantityUnit(String(formatValue(converted)), 'ml', true);
        }
        if (isWeightUnit(unit)) {
            const converted = convertWeight(qty, unit, 'g');
            return converted == null ? null : formatQuantityUnit(String(formatValue(converted)), 'g', true);
        }
        return null;
    };

    const convertToImperial = (): string | null => {
        if (isVolumeUnit(unit)) {
            const converted = convertVolume(qty, unit, 'cup');
            return converted == null ? null : formatQuantityUnit(String(formatValue(converted)), 'cup', true);
        }
        if (isWeightUnit(unit)) {
            const converted = convertWeight(qty, unit, 'oz');
            return converted == null ? null : formatQuantityUnit(String(formatValue(converted)), 'oz', true);
        }
        return null;
    };

    if (system === 'metric') {
        if (baseIsMetric) return base;
        const met = convertToMetric();
        return met ? `${met} (${base})` : base;
    }
    if (system === 'imperial') {
        if (baseIsImperial) return base;
        const imp = convertToImperial();
        return imp ? `${imp} (${base})` : base;
    }

    // both
    const imp = baseIsImperial ? base : convertToImperial();
    const met = baseIsMetric ? base : convertToMetric();

    if (imp && met && imp !== met) {
        return `${imp} (${met})`;
    }
    return imp || met || base;
};

export const normalizeIngredientName = (n: string) => n.toLowerCase()
    .split(/[,(]/)[0] // Remove preparation notes after comma or in parentheses
    .replace(/\b(frozen|fresh|dried|chopped|diced|sliced|plain|cooked|optional|to serve|to garnish|raw|large|medium|small|cloves?|heads?|stalks?|of|approx|oz|lb|g|ml|can|packet|handful|fat free|low fat|sf|sugar free)\b/g, '')
    .replace(/^\s*s\s+/, '')
    .replace(/\s+/g, ' ')
    .trim();

export const extractMeasureFromName = (name: string, currentMeasure?: string) => {
    if (currentMeasure && !['', 'undefined', 'units'].includes(currentMeasure)) return currentMeasure;

    const lowerName = name.toLowerCase();
    const measures = ['clove', 'cloves', 'stalk', 'stalks', 'head', 'heads', 'handful', 'can', 'packet', 'cup', 'tbsp', 'tsp'];
    const found = measures
        .sort((a, b) => b.length - a.length)
        .find(m => lowerName.includes(m));

    return found || (currentMeasure !== 'undefined' ? currentMeasure : 'units') || 'units';
};

export const parseQuantity = (qStr: string) => {
    if (!qStr) return 0;
    const FRACTIONS: Record<string, string> = {'¼': ' 0.25', '½': ' 0.5', '¾': ' 0.75', '⅓': ' 0.33', '⅔': ' 0.66'};
    const normalized = qStr.replace(/[¼½¾⅓⅔]/g, m => FRACTIONS[m]);
    return normalized.trim().split(/\s+/).reduce((acc, p) => {
        if (p.includes('/')) {
            const [num, den] = p.split('/').map(parseFloat);
            return acc + (den ? num / den : 0);
        }
        const val = parseFloat(p);
        return acc + (isNaN(val) ? 0 : val);
    }, 0);
};

type MeasureTotals = Record<string, number>;

export interface AggregatedTotals {
    metricTotals: MeasureTotals;
    imperialTotals: MeasureTotals;
    otherTotals: MeasureTotals;
}

/** Get one quantity/unit from aggregated totals for container recommendation (first non-zero from metric, imperial, other). */
export function getPrimaryQuantityAndUnit(totals: AggregatedTotals): { quantity: number; unit: string } | null {
    for (const [unit, q] of Object.entries(totals.metricTotals)) {
        if (q > 0 && unit) return { quantity: q, unit };
    }
    for (const [unit, q] of Object.entries(totals.imperialTotals)) {
        if (q > 0 && unit) return { quantity: q, unit };
    }
    for (const [unit, q] of Object.entries(totals.otherTotals)) {
        if (q > 0 && unit) return { quantity: q, unit };
    }
    return null;
}

export const aggregateIngredients = (items: { ingredient: Ingredient, count: number }[]): AggregatedTotals => {
    const totals: { metric: MeasureTotals; imperial: MeasureTotals; other: MeasureTotals } = {
        metric: {},
        imperial: {},
        other: {}
    };

    items.forEach(({ingredient: ing, count}) => {
        if (ing.metric) {
            const q = parseQuantity(ing.metric.quantity) * count;
            if (q > 0) totals.metric[ing.metric.measure] = (totals.metric[ing.metric.measure] || 0) + q;
        }
        if (ing.imperial) {
            let q = parseQuantity(ing.imperial.quantity) * count;
            if (q > 0) {
                let m = ing.imperial.measure;
                if (m === 'lb') {
                    const oz = convertWeight(q, 'lb', 'oz');
                    if (oz != null) q = oz;
                    m = 'oz';
                }
                totals.imperial[m] = (totals.imperial[m] || 0) + q;
            }
        }
        if (!ing.metric && !ing.imperial && ing.quantity) {
            const q = parseQuantity(ing.quantity) * count;
            if (q > 0) {
                const m = extractMeasureFromName(ing.ingredient, ing.measure).toLowerCase();
                const mapping: Record<string, string> = {
                    'cups': 'cup',
                    'clove': 'cloves',
                    'stalk': 'stalks',
                    'head': 'heads'
                };
                totals.other[mapping[m] || m] = (totals.other[mapping[m] || m] || 0) + q;
            }
        }
    });

    return {metricTotals: totals.metric, imperialTotals: totals.imperial, otherTotals: totals.other};
};

export const renderAggregatedMeasurement = (totals: AggregatedTotals, system: 'metric' | 'imperial' | 'both'): string => {
    const formatValue = (val: number) => Number(val.toFixed(2));

    const formatImperial = (m: string, q: number) => {
        if (m === 'oz' && q >= 16) {
            const lbs = Math.floor(q / 16);
            const oz = formatValue(q % 16);
            return `${lbs} lb${lbs > 1 ? 's' : ''}${oz > 0 ? ` ${oz} oz` : ''}`;
        }
        return m ? `${formatValue(q)} ${m}` : `${formatValue(q)}`;
    };

    const metricParts = Object.entries(totals.metricTotals).map(([m, q]) => m ? `${formatValue(q)} ${m}` : `${formatValue(q)}`);
    const imperialParts = Object.entries(totals.imperialTotals).map(([m, q]) => formatImperial(m, q));
    const otherParts = Object.entries(totals.otherTotals).map(([m, q]) =>
        ['', 'units', 'undefined'].includes(m) ? `${formatValue(q)}` : `${formatValue(q)} ${m}`
    );

    const met = metricParts.join(', ');
    const imp = [...imperialParts, ...otherParts].join(', ');

    if (system === 'metric') return [met, otherParts.join(', ')].filter(Boolean).join(', ');
    if (system === 'imperial') return imp;

    if (imp && met && imp !== met) {
        return `${imp} (${met})`;
    }
    return imp || met || '';
};

/**
 * Resolves the canonical ingredient name from an ingredient definition lookup.
 * Falls back to normalized name if no ingredientId or definition found.
 */
export const resolveCanonicalName = (
    ingredient: Ingredient,
    lookup: Map<string, IngredientDefinition>
): string => {
    if (ingredient.ingredientId) {
        const def = lookup.get(ingredient.ingredientId);
        if (def) return def.name;
    }
    return normalizeIngredientName(ingredient.ingredient);
};

/**
 * Gets the store section for an ingredient from the definition lookup.
 * Returns 'Unassigned' if no ingredientId or definition found.
 */
export const getIngredientStoreSection = (
    ingredient: Ingredient,
    lookup: Map<string, IngredientDefinition>,
    sectionMap: Map<string, StoreSectionDefinition>
): string => {
    if (ingredient.ingredientId) {
        const def = lookup.get(ingredient.ingredientId);
        if (def) return sectionMap.get(def.storeSectionId)?.name ?? 'Unassigned';
    }
    return 'Unassigned';
};

/**
 * Resolves a variant recipe by merging base recipe data with variant additions.
 * Returns the recipe unchanged if it is not a variant (no baseRecipeName).
 * Output uses grouped ingredients/instructions: "Base (baseName)" and "Additions".
 */
export function resolveVariantRecipe(recipe: Recipe, recipes: Recipe[]): Recipe {
    const baseId = recipe.baseRecipeId;

    if (!baseId) {
        return recipe;
    }

    const base = recipes.find(r => r.id === baseId);

    if (!base) {
        // Orphaned variant: return as-is; caller may have stored ingredients/instructions from before
        return recipe;
    }

    // Always derive group labels from the resolved recipe, not the stored field
    const baseTitleForGroups = base.name;

    const baseIngredients = flattenIngredients(base.ingredients ?? []);
    const baseInstructions = flattenInstructions(base.instructions ?? []);
    const additionsIngredients = recipe.ingredientAdditions ?? [];
    const additionsInstructions = recipe.instructionAdditions ?? [];

    const ingredientGroups: IngredientGroup[] = [];
    if (baseIngredients.length > 0) {
        ingredientGroups.push({ name: `Base (${baseTitleForGroups})`, ingredients: baseIngredients });
    }
    if (additionsIngredients.length > 0) {
        ingredientGroups.push({ name: 'Additions', ingredients: additionsIngredients });
    }
    if (ingredientGroups.length === 0) {
        ingredientGroups.push({ name: 'Ingredients', ingredients: [] });
    }

    const instructionGroups: InstructionGroup[] = [];
    if (baseInstructions.length > 0) {
        instructionGroups.push({ name: `Base (${baseTitleForGroups})`, steps: baseInstructions });
    }
    if (additionsInstructions.length > 0) {
        instructionGroups.push({ name: 'Additions', steps: additionsInstructions });
    }
    if (instructionGroups.length === 0) {
        instructionGroups.push({ name: 'Instructions', steps: [] });
    }

    const baseTags = base.tags ?? [];
    const variantTags = recipe.tags ?? [];
    const mergedTags = Array.from(new Set([...baseTags, ...variantTags]));

    return {
        ...base,
        name: recipe.name,
        ingredients: ingredientGroups,
        instructions: instructionGroups,
        tags: mergedTags,
        rating: recipe.rating ?? base.rating,
        isFavorite: recipe.isFavorite ?? base.isFavorite,
        notes: recipe.notes !== undefined && recipe.notes !== '' ? recipe.notes : base.notes,
        videoLink: recipe.videoLink !== undefined && recipe.videoLink !== '' ? recipe.videoLink : base.videoLink,
        myFitnessPalId: recipe.myFitnessPalId !== undefined && recipe.myFitnessPalId !== '' ? recipe.myFitnessPalId : base.myFitnessPalId
    };
}
