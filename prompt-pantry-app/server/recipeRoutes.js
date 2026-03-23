/**
 * Recipe Routes - Recipe CRUD endpoints
 */
import { safeDecodeURIComponent } from './middleware.js';

export function registerRecipeRoutes(app, { dataAccess, middleware, validators }) {
    const { readRecipes, readIngredients, saveRecipes, validateOrFail } = dataAccess;
    const { authenticate, requireEditor, requireAdmin } = middleware;
    const { recipeValidator } = validators;

    app.get('/api/recipes/audit', authenticate, requireAdmin, (req, res) => {
        const recipes = readRecipes('all');
        const ingredientDefs = readIngredients();
        const validIds = new Set(ingredientDefs.map(d => d.id));

        const flattenIngredients = (recipe) => {
            if (!Array.isArray(recipe.ingredients) || recipe.ingredients.length === 0) return [];
            if (recipe.ingredients[0].ingredients) {
                return recipe.ingredients.flatMap(g => (g.ingredients || []).map(ing => ({ ...ing, group: g.name })));
            }
            return recipe.ingredients.map(ing => ({ ...ing, group: null }));
        };

        const issues = [];

        for (const recipe of recipes) {
            const ingredients = flattenIngredients(recipe);
            const recipeIssues = [];

            for (const ing of ingredients) {
                const loc = ing.group ? `"${ing.ingredient}" (in group "${ing.group}")` : `"${ing.ingredient}"`;

                if (!ing.ingredientId) {
                    recipeIssues.push({ type: 'unlinked', ingredient: loc, detail: 'No linked ingredient definition' });
                } else if (!validIds.has(ing.ingredientId)) {
                    recipeIssues.push({ type: 'broken_link', ingredient: loc, detail: `ingredientId "${ing.ingredientId}" does not match any ingredient definition` });
                }

                const hasSimple = ing.quantity && ing.measure;
                const hasMetric = ing.metric?.quantity && ing.metric?.measure;
                const hasImperial = ing.imperial?.quantity && ing.imperial?.measure;
                if (!hasSimple && !hasMetric && !hasImperial) {
                    recipeIssues.push({ type: 'missing_measurement', ingredient: loc, detail: 'No quantity/measure defined' });
                }
            }

            if (!recipeValidator || !recipeValidator(recipe)) {
                recipeIssues.push({ type: 'schema_invalid', ingredient: null, detail: recipeValidator?.errors?.map(e => `${e.instancePath} ${e.message}`).join('; ') || 'Unknown schema error' });
            }

            if (recipeIssues.length > 0) {
                issues.push({ recipeName: recipe.name, issues: recipeIssues });
            }
        }

        const summary = {
            totalRecipes: recipes.length,
            recipesWithIssues: issues.length,
            totalUnlinked: issues.reduce((n, r) => n + r.issues.filter(i => i.type === 'unlinked').length, 0),
            totalBrokenLinks: issues.reduce((n, r) => n + r.issues.filter(i => i.type === 'broken_link').length, 0),
            totalMissingMeasurements: issues.reduce((n, r) => n + r.issues.filter(i => i.type === 'missing_measurement').length, 0),
            totalSchemaInvalid: issues.reduce((n, r) => n + r.issues.filter(i => i.type === 'schema_invalid').length, 0),
        };

        res.json({ summary, recipes: issues });
    });

    app.get('/api/recipes', authenticate, (req, res) => {
        const includeInvalid = req.query.includeInvalid === 'true';
        res.json(readRecipes(includeInvalid));
    });

    app.get('/api/recipes/all', authenticate, requireAdmin, (req, res) => {
        res.json(readRecipes('all'));
    });

    app.post('/api/recipes', authenticate, requireEditor, (req, res) => {
        const {_isValid, _errors, ...recipe} = req.body;
        if (!validateOrFail(res, recipeValidator, recipe, 'recipe', req)) return;
        const recipes = readRecipes('all');
        if (recipes.find(r => r.name === recipe.name)) {
            return res.status(400).json({error: 'Recipe already exists'});
        }
        recipes.push(recipe);
        saveRecipes(recipes);
        res.status(201).json(recipe);
    });

    app.put('/api/recipes/:name', authenticate, requireEditor, (req, res) => {
        const name = safeDecodeURIComponent(req.params.name);
        if (name === null) return res.status(400).json({error: 'Invalid URL encoding'});
        const {_isValid, _errors, ...recipe} = req.body;
        if (!validateOrFail(res, recipeValidator, recipe, 'recipe', req)) return;
        const recipes = readRecipes('all');
        const idx = recipes.findIndex(r => r.name === name);
        if (idx === -1) {
            return res.status(404).json({error: 'Recipe not found'});
        }
        if (recipe.name !== name && recipes.find(r => r.name === recipe.name)) {
            return res.status(400).json({error: 'A recipe with this name already exists'});
        }
        recipes[idx] = recipe;
        saveRecipes(recipes);
        res.json(recipe);
    });

    app.delete('/api/recipes/:name', authenticate, requireEditor, (req, res) => {
        const name = safeDecodeURIComponent(req.params.name);
        if (name === null) return res.status(400).json({error: 'Invalid URL encoding'});
        const recipes = readRecipes('all');
        const idx = recipes.findIndex(r => r.name === name);
        if (idx === -1) {
            return res.status(404).json({error: 'Recipe not found'});
        }
        recipes.splice(idx, 1);
        saveRecipes(recipes);
        res.status(204).send();
    });
}

