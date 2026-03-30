import type { Ingredient, IngredientDefinition, IngredientGroup, InstructionGroup, Macros } from '../types.js';

// ============================================================
// Public types
// ============================================================

export interface ParsedIngredient {
    ingredient: string;
    quantity?: string;
    measure?: string;
}

export interface ImportedRecipe {
    name: string;
    categories: ['Misc'];
    prepTime: string;
    cookTime: string;
    servings: number;
    tags: string[];
    /** Ingredients, flat or grouped when the source has named sections. */
    ingredients: Ingredient[] | IngredientGroup[];
    /** Instructions, flat or grouped when the source has named sections. */
    instructions: string[] | InstructionGroup[];
    macros: Macros;
    notes?: string;
}

// ============================================================
// Helpers
// ============================================================

function parseDoc(html: string): Document {
    return new DOMParser().parseFromString(html, 'text/html');
}

function textOf(el: Element | null): string {
    if (!el) return '';
    return (el.textContent ?? '').trim();
}

function numericMinutes(raw: string): string {
    // raw may be "30", "30 minutes", "1 hour", "PT30M", "PT1H30M", etc.
    // ISO 8601 duration
    const iso = raw.match(/^PT(?:(\d+)H)?(?:(\d+)M)?$/i);
    if (iso) {
        const hours = parseInt(iso[1] ?? '0', 10);
        const mins = parseInt(iso[2] ?? '0', 10);
        return String(hours * 60 + mins);
    }
    // "X hour(s)" or "X minute(s)"
    const hourMatch = raw.match(/(\d+)\s*hour/i);
    const minMatch = raw.match(/(\d+)\s*min/i);
    const hours = hourMatch ? parseInt(hourMatch[1], 10) : 0;
    const mins = minMatch ? parseInt(minMatch[1], 10) : 0;
    if (hours || mins) return String(hours * 60 + mins);
    // bare number
    const bare = raw.match(/^(\d+)$/);
    if (bare) return bare[1];
    return '0';
}

function buildNotes(sourceUrl: string | undefined, existing: string): string {
    const prefix = sourceUrl ? `Imported from: ${sourceUrl}\n` : '';
    return prefix + existing;
}

// ============================================================
// parseIngredientString — exported utility
// ============================================================

// Fractional unicode chars
const FRACTIONS: Record<string, string> = {
    '½': '1/2', '⅓': '1/3', '⅔': '2/3', '¼': '1/4', '¾': '3/4',
    '⅛': '1/8', '⅜': '3/8', '⅝': '5/8', '⅞': '7/8',
};

function normalizeFractions(s: string): string {
    return s.replace(/[½⅓⅔¼¾⅛⅜⅝⅞]/g, (c) => FRACTIONS[c] ?? c);
}

export function parseIngredientString(s: string): ParsedIngredient {
    const normalized = normalizeFractions(s.trim());

    // Match optional leading number (integer or fraction like 1/2 or 1 1/2)
    const quantityRe = /^((?:\d+\s+)?\d+\/\d+|\d+(?:\.\d+)?)/;
    const units = [
        'cups?', 'tablespoons?', 'tbsp', 'teaspoons?', 'tsp',
        'ounces?', 'oz', 'pounds?', 'lbs?', 'lb',
        'grams?', 'g', 'kilograms?', 'kg',
        'milliliters?', 'ml', 'liters?', 'l',
        'cloves?', 'heads?', 'stalks?', 'bunches?', 'slices?',
        'cans?', 'packages?', 'pkg',
        'pinch(?:es)?', 'dash(?:es)?',
        'pieces?', 'strips?', 'sprigs?',
    ];
    const unitRe = new RegExp(`^(${units.join('|')})\\b`, 'i');

    let rest = normalized;
    let quantity: string | undefined;
    let measure: string | undefined;

    const qMatch = rest.match(quantityRe);
    if (qMatch) {
        quantity = qMatch[1].trim();
        rest = rest.slice(qMatch[0].length).trim();
    }

    const uMatch = rest.match(unitRe);
    if (uMatch) {
        measure = uMatch[1].trim();
        rest = rest.slice(uMatch[0].length).trim();
    }

    // Strip leading comma or "of"
    rest = rest.replace(/^[,\s]+/, '').replace(/^of\s+/i, '').trim();

    return { ingredient: rest || normalized, quantity, measure };
}

// ============================================================
// WPRM helpers
// ============================================================

function wprmNutritionValue(doc: Document, nutrient: string): number {
    // Try in-card selector first (nutrition embedded inside the recipe card)
    const inCard = parseInt(textOf(doc.querySelector(`.wprm-recipe-${nutrient}`)), 10);
    if (inCard) return inCard;
    // Fall back to nutrition label shortcode (rendered outside the card)
    const container = doc.querySelector(
        `.wprm-nutrition-label-text-nutrition-container-${nutrient}`
    );
    return container
        ? parseInt(textOf(container.querySelector('.wprm-nutrition-label-text-nutrition-value')), 10) || 0
        : 0;
}

// ============================================================
// WPRM parser
// ============================================================

function parseWprm(doc: Document): Omit<ImportedRecipe, 'categories' | 'notes' | 'macros'> & { macros: Macros } {
    const name = textOf(doc.querySelector('.wprm-recipe-name'));

    // Servings — prefer data-servings attribute on .wprm-recipe-servings
    const servingsEl = doc.querySelector('.wprm-recipe-servings');
    const servingsAttr = servingsEl?.getAttribute('data-servings') ?? servingsEl?.getAttribute('data-original-servings');
    const servings = parseInt(servingsAttr ?? textOf(servingsEl), 10) || 1;

    // Times — look for wprm-recipe-prep_time-minutes and wprm-recipe-cook_time-minutes classes
    const prepEl = doc.querySelector('.wprm-recipe-prep_time-minutes, .wprm-recipe-prep_time');
    const cookEl = doc.querySelector('.wprm-recipe-cook_time-minutes, .wprm-recipe-cook_time');
    const prepTime = textOf(prepEl) ? numericMinutes(textOf(prepEl)) : '0';
    const cookTime = textOf(cookEl) ? numericMinutes(textOf(cookEl)) : '0';

    // Ingredients — preserve named groups; flatten when only a single unnamed group
    const ingredientGroupEls = Array.from(doc.querySelectorAll('.wprm-recipe-ingredient-group'));
    const hasNamedIngredientGroups = ingredientGroupEls.length > 1
        || (ingredientGroupEls.length === 1 && !!textOf(ingredientGroupEls[0].querySelector('.wprm-recipe-ingredient-group-name')));

    const ingredients: Ingredient[] | IngredientGroup[] = hasNamedIngredientGroups
        ? (ingredientGroupEls
            .map((groupEl) => ({
                name: textOf(groupEl.querySelector('.wprm-recipe-ingredient-group-name')),
                ingredients: Array.from(groupEl.querySelectorAll('.wprm-recipe-ingredient'))
                    .map((liEl) => ({
                        ingredient: textOf(liEl.querySelector('.wprm-recipe-ingredient-name')),
                        quantity: textOf(liEl.querySelector('.wprm-recipe-ingredient-amount')) || undefined,
                        measure: textOf(liEl.querySelector('.wprm-recipe-ingredient-unit')) || undefined,
                    }))
                    .filter((i) => i.ingredient),
            }))
            .filter((g) => g.ingredients.length > 0) as IngredientGroup[])
        : (() => {
            const flat: Ingredient[] = [];
            doc.querySelectorAll('.wprm-recipe-ingredient').forEach((liEl) => {
                const ingredientName = textOf(liEl.querySelector('.wprm-recipe-ingredient-name'));
                if (!ingredientName) return;
                flat.push({
                    ingredient: ingredientName,
                    quantity: textOf(liEl.querySelector('.wprm-recipe-ingredient-amount')) || undefined,
                    measure: textOf(liEl.querySelector('.wprm-recipe-ingredient-unit')) || undefined,
                });
            });
            return flat;
        })();

    // Instructions — preserve named groups; flatten when only a single unnamed group
    const instructionGroupEls = Array.from(doc.querySelectorAll('.wprm-recipe-instruction-group'));
    const hasNamedInstructionGroups = instructionGroupEls.length > 1
        || (instructionGroupEls.length === 1 && !!textOf(instructionGroupEls[0].querySelector('.wprm-recipe-instruction-group-name')));

    const instructions: string[] | InstructionGroup[] = hasNamedInstructionGroups
        ? (instructionGroupEls
            .map((groupEl) => ({
                name: textOf(groupEl.querySelector('.wprm-recipe-instruction-group-name')),
                steps: Array.from(groupEl.querySelectorAll('.wprm-recipe-instruction-text'))
                    .map((stepEl) => textOf(stepEl))
                    .filter(Boolean),
            }))
            .filter((g) => g.steps.length > 0) as InstructionGroup[])
        : (() => {
            const flat: string[] = [];
            doc.querySelectorAll('.wprm-recipe-instruction-text').forEach((stepEl) => {
                const text = textOf(stepEl);
                if (text) flat.push(text);
            });
            return flat;
        })();

    // Macros — in-card block or nutrition label shortcode
    const macros: Macros = {
        calories: wprmNutritionValue(doc, 'calories'),
        protein:  wprmNutritionValue(doc, 'protein'),
        carbs:    wprmNutritionValue(doc, 'carbohydrates'),
        fat:      wprmNutritionValue(doc, 'fat'),
    };

    const tags = Array.from(doc.querySelectorAll('.wprm-recipe-keyword'))
        .map(el => textOf(el))
        .filter(Boolean);

    return { name, servings, prepTime, cookTime, tags, ingredients, instructions, macros };
}

// ============================================================
// Tasty Recipes parser
// ============================================================

function parseTastyRecipes(doc: Document): Omit<ImportedRecipe, 'categories' | 'notes' | 'macros'> & { macros: Macros } {
    const name = textOf(doc.querySelector('.tasty-recipes-title'));

    // Servings — look for first data-amount inside yield span
    const yieldEl = doc.querySelector('.tasty-recipes-yield');
    let servings = 1;
    if (yieldEl) {
        const firstAmount = yieldEl.querySelector('[data-amount]');
        const raw = firstAmount?.getAttribute('data-amount') ?? textOf(yieldEl);
        const parsed = parseInt(raw, 10);
        if (!isNaN(parsed) && parsed > 0) servings = parsed;
    }

    // Times
    const prepRaw = textOf(doc.querySelector('.tasty-recipes-prep-time'));
    const cookRaw = textOf(doc.querySelector('.tasty-recipes-cook-time'));
    const prepTime = prepRaw ? numericMinutes(prepRaw) : '0';
    const cookTime = cookRaw ? numericMinutes(cookRaw) : '0';

    // Ingredients — flat list items inside ingredients body
    const ingredients: Ingredient[] = [];
    const ingredientsBody = doc.querySelector('.tasty-recipes-ingredients-body');
    if (ingredientsBody) {
        ingredientsBody.querySelectorAll('li').forEach((li) => {
            const raw = textOf(li);
            if (!raw) return;
            const parsed = parseIngredientString(raw);
            ingredients.push(parsed);
        });
    }

    // Instructions — list items inside instructions body
    const instructions: string[] = [];
    const instructionsBody = doc.querySelector('.tasty-recipes-instructions-body');
    if (instructionsBody) {
        instructionsBody.querySelectorAll('li').forEach((li) => {
            const text = textOf(li);
            if (text) instructions.push(text);
        });
        // Fallback: paragraphs if no list items
        if (instructions.length === 0) {
            instructionsBody.querySelectorAll('p').forEach((p) => {
                const text = textOf(p);
                if (text) instructions.push(text);
            });
        }
    }

    // Macros
    const macros: Macros = {
        calories: parseInt(textOf(doc.querySelector('.tasty-recipes-calories')), 10) || 0,
        protein: parseInt(textOf(doc.querySelector('.tasty-recipes-protein')), 10) || 0,
        carbs: parseInt(textOf(doc.querySelector('.tasty-recipes-carbohydrates')), 10) || 0,
        fat: parseInt(textOf(doc.querySelector('.tasty-recipes-fat')), 10) || 0,
    };

    return { name, servings, prepTime, cookTime, tags: [], ingredients, instructions, macros };
}

// ============================================================
// JSON-LD parser
// ============================================================

interface JsonLdStep {
    '@type': string;
    text: string;
}

interface JsonLdSection {
    '@type': 'HowToSection';
    name?: string;
    itemListElement?: Array<JsonLdStep | string>;
}

interface JsonLdRecipe {
    '@type'?: string | string[];
    name?: string;
    prepTime?: string;
    cookTime?: string;
    recipeYield?: string | number;
    recipeIngredient?: string[];
    recipeInstructions?: Array<JsonLdStep | JsonLdSection | string> | string;
    nutrition?: {
        calories?: string | number;
        proteinContent?: string | number;
        carbohydrateContent?: string | number;
        fatContent?: string | number;
    };
}

function extractJsonLdRecipe(doc: Document): JsonLdRecipe | null {
    const scripts = doc.querySelectorAll('script[type="application/ld+json"]');
    for (const script of Array.from(scripts)) {
        try {
            const data = JSON.parse(script.textContent ?? '');
            const isRecipe = (obj: JsonLdRecipe) => {
                if (!obj) return false;
                const t = obj['@type'];
                if (typeof t === 'string') return t === 'Recipe';
                if (Array.isArray(t)) return t.includes('Recipe');
                return false;
            };

            if (isRecipe(data)) return data;

            // @graph array
            if (data['@graph'] && Array.isArray(data['@graph'])) {
                const found = data['@graph'].find(isRecipe);
                if (found) return found;
            }
        } catch {
            // skip malformed JSON
        }
    }
    return null;
}

function parseJsonLd(doc: Document): Omit<ImportedRecipe, 'categories' | 'notes' | 'macros'> & { macros: Macros } {
    const ld = extractJsonLdRecipe(doc);
    if (!ld) throw new Error('No recipe found in page (no recognized recipe framework detected)');

    const name = ld.name ?? '';

    // Servings
    let servings = 1;
    if (ld.recipeYield !== undefined) {
        const raw = String(ld.recipeYield);
        const match = raw.match(/\d+/);
        if (match) servings = parseInt(match[0], 10) || 1;
    }

    const prepTime = ld.prepTime ? numericMinutes(ld.prepTime) : '0';
    const cookTime = ld.cookTime ? numericMinutes(ld.cookTime) : '0';

    // Ingredients
    const ingredients: Ingredient[] = (ld.recipeIngredient ?? []).map((s) => parseIngredientString(s));

    // Instructions — preserve HowToSection grouping when present
    let instructions: string[] | InstructionGroup[] = [];
    if (Array.isArray(ld.recipeInstructions)) {
        const hasSections = ld.recipeInstructions.some(
            (s) => typeof s === 'object' && s['@type'] === 'HowToSection'
        );
        if (hasSections) {
            instructions = (ld.recipeInstructions
                .map((item) => {
                    if (typeof item === 'object' && item['@type'] === 'HowToSection') {
                        const sec = item as JsonLdSection;
                        return {
                            name: sec.name ?? '',
                            steps: (sec.itemListElement ?? [])
                                .map((s) => (typeof s === 'string' ? s : (s as JsonLdStep).text ?? ''))
                                .filter(Boolean),
                        };
                    }
                    // Lone step outside a section — put in an unnamed group
                    const text = typeof item === 'string' ? item : (item as JsonLdStep).text ?? '';
                    return text ? { name: '', steps: [text] } : null;
                })
                .filter((g): g is InstructionGroup => g !== null && g.steps.length > 0)
            ) as InstructionGroup[];
        } else {
            instructions = ld.recipeInstructions
                .map((step) => (typeof step === 'string' ? step : (step as JsonLdStep).text ?? ''))
                .filter(Boolean);
        }
    } else if (typeof ld.recipeInstructions === 'string') {
        instructions = [ld.recipeInstructions];
    }

    // Macros
    const n = ld.nutrition;
    const macros: Macros = {
        calories: parseInt(String(n?.calories ?? '0'), 10) || 0,
        protein: parseInt(String(n?.proteinContent ?? '0'), 10) || 0,
        carbs: parseInt(String(n?.carbohydrateContent ?? '0'), 10) || 0,
        fat: parseInt(String(n?.fatContent ?? '0'), 10) || 0,
    };

    return { name, servings, prepTime, cookTime, tags: [], ingredients, instructions, macros };
}

// ============================================================
// Detection chain + public entry point
// ============================================================

export function importRecipeFromHtml(html: string, sourceUrl?: string): ImportedRecipe {
    const doc = parseDoc(html);

    let parsed: Omit<ImportedRecipe, 'categories' | 'notes' | 'macros'> & { macros: Macros };

    if (doc.querySelector('.wprm-recipe')) {
        parsed = parseWprm(doc);
    } else if (doc.querySelector('.tasty-recipes')) {
        parsed = parseTastyRecipes(doc);
    } else if (extractJsonLdRecipe(doc)) {
        parsed = parseJsonLd(doc);
    } else {
        throw new Error('No recipe found in page (no recognized recipe framework detected)');
    }

    const existingNotes = '';
    const notes = buildNotes(sourceUrl, existingNotes) || undefined;

    return {
        ...parsed,
        categories: ['Misc'],
        notes,
    };
}

// ============================================================
// resolveIngredients — match parsed ingredients to library
// ============================================================

type RawIngredient = { ingredient: string; quantity?: string; measure?: string };
type ResolvedIngredient = RawIngredient & { ingredientId?: string };

function resolveFlat(ingredients: RawIngredient[], library: IngredientDefinition[]): ResolvedIngredient[] {
    return ingredients.map((ing) => {
        const normalized = ing.ingredient.toLowerCase().trim();
        const match = library.find((def) =>
            def.name.toLowerCase() === normalized ||
            (def.aliases ?? []).some((alias: string) => alias.toLowerCase() === normalized)
        );
        return match ? { ...ing, ingredientId: match.id } : { ...ing };
    });
}

export function resolveIngredients(
    ingredients: Ingredient[] | IngredientGroup[],
    library: IngredientDefinition[]
): Ingredient[] | IngredientGroup[] {
    if (ingredients.length === 0) return [];
    if ('ingredients' in ingredients[0]) {
        // Grouped — resolve within each group
        return (ingredients as IngredientGroup[]).map((group) => ({
            ...group,
            ingredients: resolveFlat(group.ingredients, library),
        }));
    }
    return resolveFlat(ingredients as RawIngredient[], library);
}
