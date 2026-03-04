/**
 * Ingredient-related helpers for the API. Used by serverFactory (ingredient routes).
 * All functions that need data access receive readRecipes/readIngredients/saveRecipes via context.
 */

export function toTitleCase(str) {
    if (!str || typeof str !== 'string') return str;
    return str.replace(/\w\S*/g, (txt) => txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase());
}

/**
 * Iterates over all ingredient entries in a recipe, handling both grouped and flat formats.
 * @param {object} recipe - Recipe object
 * @param {(ing: object) => void} callback - Called for each ingredient entry
 */
export function forEachRecipeIngredient(recipe, callback) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return;
    if (recipe.ingredients[0]?.ingredients) {
        recipe.ingredients.forEach((group) => group.ingredients?.forEach(callback));
    } else {
        recipe.ingredients.forEach(callback);
    }
}

/**
 * Tests whether any ingredient entry in a recipe matches a predicate, handling grouped/flat formats.
 * @param {object} recipe - Recipe object
 * @param {(ing: object) => boolean} predicate - Called for each ingredient entry
 * @returns {boolean}
 */
export function someRecipeIngredient(recipe, predicate) {
    if (!recipe.ingredients || recipe.ingredients.length === 0) return false;
    if (recipe.ingredients[0]?.ingredients) {
        return recipe.ingredients.some((group) => group.ingredients?.some(predicate));
    }
    return recipe.ingredients.some(predicate);
}

/**
 * @param {{ readRecipes: (includeInvalid?: boolean) => any[], readIngredients: () => any[], saveRecipes: (recipes: any[]) => void }} ctx
 */
export function createIngredientHelpers(ctx) {
    const { readRecipes, readIngredients, saveRecipes } = ctx;

    function findIngredientUsage(ingredientId, recipes = null) {
        const allRecipes = recipes || readRecipes('all');
        const usedIn = [];
        allRecipes.forEach((recipe) => {
            if (someRecipeIngredient(recipe, (ing) => ing.ingredientId === ingredientId)) {
                usedIn.push(recipe.name);
            }
        });
        return usedIn;
    }

    function checkIngredientNameConflict(name, excludeId = null) {
        const ingredients = readIngredients();
        const normalizedName = (name || '').toLowerCase().trim();
        return ingredients.some(
            (ing) => ing.name.toLowerCase() === normalizedName && ing.id !== excludeId
        );
    }

    function checkAliasConflict(aliases, excludeIds = []) {
        if (!aliases || aliases.length === 0) return null;
        const ingredients = readIngredients();
        const excludeSet = Array.isArray(excludeIds)
            ? new Set(excludeIds)
            : new Set(excludeIds ? [excludeIds] : []);
        for (const alias of aliases) {
            const normalizedAlias = (alias || '').toLowerCase().trim();
            for (const ing of ingredients) {
                if (excludeSet.has(ing.id)) continue;
                if (ing.name.toLowerCase() === normalizedAlias) {
                    return { alias, conflictsWith: ing.name, type: 'name' };
                }
                if (ing.aliases?.some((a) => (a || '').toLowerCase() === normalizedAlias)) {
                    return { alias, conflictsWith: ing.name, type: 'alias' };
                }
            }
        }
        return null;
    }

    function findAliasUsage(ingredientId, aliasText, recipes = null) {
        const allRecipes = recipes || readRecipes('all');
        const normalized = (aliasText || '').trim().toLowerCase();
        const usedIn = [];
        allRecipes.forEach((recipe) => {
            const check = (ing) => {
                if (ing.ingredientId !== ingredientId) return false;
                return (ing.ingredient || '').trim().toLowerCase() === normalized;
            };
            if (someRecipeIngredient(recipe, check)) {
                usedIn.push(recipe.name);
            }
        });
        return usedIn;
    }

    function updateRecipeIngredientDisplay(ingredientId, oldDisplayText, newDisplayText, recipes = null) {
        const allRecipes = recipes || readRecipes('all');
        const oldNorm = (oldDisplayText || '').trim().toLowerCase();
        let updatedRecipeCount = 0;
        allRecipes.forEach((recipe) => {
            let recipeUpdated = false;
            forEachRecipeIngredient(recipe, (ing) => {
                if (ing.ingredientId !== ingredientId) return;
                if ((ing.ingredient || '').trim().toLowerCase() === oldNorm) {
                    ing.ingredient = newDisplayText;
                    recipeUpdated = true;
                }
            });
            if (recipeUpdated) updatedRecipeCount++;
        });
        saveRecipes(allRecipes);
        return updatedRecipeCount;
    }

    return {
        findIngredientUsage,
        checkIngredientNameConflict,
        checkAliasConflict,
        findAliasUsage,
        updateRecipeIngredientDisplay
    };
}
