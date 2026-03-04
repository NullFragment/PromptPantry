/**
 * Ingredient Routes - Ingredient CRUD, merge, alias management
 */
import crypto from 'crypto';
import { createIngredientHelpers, toTitleCase, forEachRecipeIngredient } from './ingredientHelpers.js';

export function registerIngredientRoutes(app, { dataAccess, middleware, validators }) {
    const { readIngredients, saveIngredients, readRecipes, saveRecipes, validateOrFail } = dataAccess;
    const { authenticate, requireEditor } = middleware;
    const { ingredientValidator } = validators;

    const {
        findIngredientUsage,
        checkIngredientNameConflict,
        checkAliasConflict,
        findAliasUsage,
        updateRecipeIngredientDisplay
    } = createIngredientHelpers({ readRecipes, readIngredients, saveRecipes });

    const findIngredientOr404 = (id, res) => {
        const ingredients = readIngredients();
        const ingredient = ingredients.find(i => i.id === id);
        if (!ingredient) {
            res.status(404).json({error: 'Ingredient not found'});
            return null;
        }
        return { ingredients, ingredient };
    };

    app.get('/api/ingredients', authenticate, (req, res) => {
        res.json(readIngredients());
    });

    app.get('/api/ingredients/:id', authenticate, (req, res) => {
        const result = findIngredientOr404(req.params.id, res);
        if (!result) return;
        res.json(result.ingredient);
    });

    app.get('/api/ingredients/:id/usage', authenticate, (req, res) => {
        const result = findIngredientOr404(req.params.id, res);
        if (!result) return;
        const recipeNames = findIngredientUsage(req.params.id);
        res.json({ recipeCount: recipeNames.length, recipeNames });
    });

    app.get('/api/ingredients/:id/alias-usage', authenticate, (req, res) => {
        const result = findIngredientOr404(req.params.id, res);
        if (!result) return;
        const alias = req.query.alias;
        if (alias === undefined || alias === '') {
            return res.status(400).json({error: 'Query parameter "alias" is required'});
        }
        if (Array.isArray(alias)) {
            return res.status(400).json({error: 'Only a single alias parameter is allowed'});
        }
        const recipeNames = findAliasUsage(req.params.id, alias);
        res.json({ recipeCount: recipeNames.length, recipeNames });
    });

    app.get('/api/store-sections', authenticate, (req, res) => {
        const ingredients = readIngredients();
        const sections = [...new Set(ingredients.map(i => i.storeSection).filter(Boolean))];
        const sorted = sections.sort((a, b) => {
            if (a === 'Unassigned') return 1;
            if (b === 'Unassigned') return -1;
            return a.localeCompare(b);
        });
        res.json(sorted);
    });

    app.post('/api/ingredients', authenticate, requireEditor, (req, res) => {
        const ingredient = req.body;

        ingredient.id = crypto.randomUUID();

        if (ingredient.storeSection && ingredient.storeSection !== 'Unassigned') {
            ingredient.storeSection = toTitleCase(ingredient.storeSection);
        }

        if (!validateOrFail(res, ingredientValidator, ingredient, 'ingredient', req)) return;

        if (checkIngredientNameConflict(ingredient.name)) {
            return res.status(400).json({error: 'An ingredient with this name already exists'});
        }

        const aliasConflict = checkAliasConflict(ingredient.aliases);
        if (aliasConflict) {
            return res.status(400).json({
                error: `Alias "${aliasConflict.alias}" conflicts with ${aliasConflict.type} of ingredient "${aliasConflict.conflictsWith}"`
            });
        }

        const ingredients = readIngredients();
        ingredients.push(ingredient);
        saveIngredients(ingredients);
        res.status(201).json(ingredient);
    });

    app.put('/api/ingredients/:id', authenticate, requireEditor, (req, res) => {
        const id = req.params.id;
        const result = findIngredientOr404(id, res);
        if (!result) return;
        const { ingredients } = result;

        const ingredient = req.body;
        ingredient.id = id;

        if (ingredient.storeSection && ingredient.storeSection !== 'Unassigned') {
            ingredient.storeSection = toTitleCase(ingredient.storeSection);
        }

        if (!validateOrFail(res, ingredientValidator, ingredient, 'ingredient', req)) return;

        const idx = ingredients.findIndex(i => i.id === id);

        if (checkIngredientNameConflict(ingredient.name, id)) {
            return res.status(400).json({error: 'An ingredient with this name already exists'});
        }

        const aliasConflict = checkAliasConflict(ingredient.aliases, id);
        if (aliasConflict) {
            return res.status(400).json({
                error: `Alias "${aliasConflict.alias}" conflicts with ${aliasConflict.type} of ingredient "${aliasConflict.conflictsWith}"`
            });
        }

        ingredients[idx] = ingredient;
        saveIngredients(ingredients);
        res.json(ingredient);
    });

    app.delete('/api/ingredients/:id', authenticate, requireEditor, (req, res) => {
        const id = req.params.id;
        const result = findIngredientOr404(id, res);
        if (!result) return;
        const { ingredients } = result;
        const idx = ingredients.findIndex(i => i.id === id);

        const usedIn = findIngredientUsage(id);
        if (usedIn.length > 0) {
            return res.status(400).json({
                error: 'Cannot delete ingredient that is used in recipes',
                recipeCount: usedIn.length,
                recipeNames: usedIn.slice(0, 10)
            });
        }

        ingredients.splice(idx, 1);
        saveIngredients(ingredients);
        res.status(204).send();
    });

    app.post('/api/ingredients/merge', authenticate, requireEditor, (req, res) => {
        const { sourceIds, targetId } = req.body;

        if (!sourceIds || !Array.isArray(sourceIds) || sourceIds.length === 0) {
            return res.status(400).json({error: 'sourceIds must be a non-empty array'});
        }
        if (!targetId) {
            return res.status(400).json({error: 'targetId is required'});
        }
        if (sourceIds.includes(targetId)) {
            return res.status(400).json({error: 'targetId cannot be in sourceIds'});
        }

        const ingredients = readIngredients();
        const targetIngredient = ingredients.find(i => i.id === targetId);
        if (!targetIngredient) {
            return res.status(404).json({error: 'Target ingredient not found'});
        }

        const sourceIngredients = [];
        for (const sourceId of sourceIds) {
            const sourceIng = ingredients.find(i => i.id === sourceId);
            if (!sourceIng) {
                return res.status(404).json({error: `Source ingredient ${sourceId} not found`});
            }
            sourceIngredients.push(sourceIng);
        }

        const newAliases = new Set(targetIngredient.aliases || []);
        for (const sourceIng of sourceIngredients) {
            newAliases.add(sourceIng.name);
            if (sourceIng.aliases) {
                sourceIng.aliases.forEach(a => newAliases.add(a));
            }
        }

        const mergedAliases = [...newAliases].sort();
        const aliasConflict = checkAliasConflict(mergedAliases, [targetId, ...sourceIds]);
        if (aliasConflict) {
            return res.status(400).json({
                error: `Alias "${aliasConflict.alias}" conflicts with ${aliasConflict.type} of ingredient "${aliasConflict.conflictsWith}"`
            });
        }

        targetIngredient.aliases = mergedAliases;

        const sourceIdSet = new Set(sourceIds);
        const recipes = readRecipes('all');
        let updatedRecipeCount = 0;

        recipes.forEach(recipe => {
            let recipeUpdated = false;
            forEachRecipeIngredient(recipe, (ing) => {
                if (sourceIdSet.has(ing.ingredientId)) {
                    ing.ingredientId = targetId;
                    recipeUpdated = true;
                }
            });
            if (recipeUpdated) updatedRecipeCount++;
        });

        saveRecipes(recipes);

        const updatedIngredients = ingredients.filter(i => !sourceIdSet.has(i.id));
        const targetIdx = updatedIngredients.findIndex(i => i.id === targetId);
        updatedIngredients[targetIdx] = targetIngredient;
        saveIngredients(updatedIngredients);

        res.json({
            mergedIngredientCount: sourceIds.length,
            updatedRecipeCount,
            targetIngredient
        });
    });

    // Must be before PUT/DELETE .../aliases/:aliasIndex so "merge" is not captured as aliasIndex
    app.post('/api/ingredients/:id/aliases/merge', authenticate, requireEditor, (req, res) => {
        const id = req.params.id;
        let { sourceAliasIndex, targetAliasIndex } = req.body;

        const sourceNum = typeof sourceAliasIndex === 'number' ? sourceAliasIndex : parseInt(sourceAliasIndex, 10);
        if (Number.isNaN(sourceNum) || sourceNum < 0) {
            return res.status(400).json({ error: 'sourceAliasIndex must be a non-negative number' });
        }
        sourceAliasIndex = sourceNum;

        const isCanonical = targetAliasIndex === 'canonical';
        const targetNum = isCanonical ? -1 : (typeof targetAliasIndex === 'number' ? targetAliasIndex : parseInt(targetAliasIndex, 10));
        if (!isCanonical && (Number.isNaN(targetNum) || targetNum < 0)) {
            return res.status(400).json({ error: 'targetAliasIndex must be a non-negative number or "canonical"' });
        }
        targetAliasIndex = isCanonical ? 'canonical' : targetNum;

        const result = findIngredientOr404(id, res);
        if (!result) return;
        const { ingredients, ingredient } = result;
        const aliases = ingredient.aliases || [];

        if (sourceAliasIndex >= aliases.length) {
            return res.status(400).json({ error: 'sourceAliasIndex out of range' });
        }
        const sourceText = aliases[sourceAliasIndex];
        let targetText;
        if (targetAliasIndex === 'canonical') {
            targetText = ingredient.name;
        } else {
            if (targetAliasIndex >= aliases.length) {
                return res.status(400).json({ error: 'targetAliasIndex out of range' });
            }
            targetText = aliases[targetAliasIndex];
        }
        if (sourceText === targetText) {
            return res.status(400).json({ error: 'Source and target cannot be the same' });
        }

        const updatedRecipeCount = updateRecipeIngredientDisplay(id, sourceText, targetText);
        const newAliases = aliases.filter((_, i) => i !== sourceAliasIndex);
        ingredient.aliases = newAliases.length > 0 ? newAliases : undefined;
        saveIngredients(ingredients);
        res.json({ ingredient: { ...ingredient }, updatedRecipeCount });
    });

    app.put('/api/ingredients/:id/aliases/:aliasIndex', authenticate, requireEditor, (req, res) => {
        const id = req.params.id;
        const aliasIndex = parseInt(req.params.aliasIndex, 10);
        const { newAlias, updateRecipes } = req.body;

        if (Number.isNaN(aliasIndex) || aliasIndex < 0) {
            return res.status(400).json({ error: 'Invalid alias index' });
        }
        const newAliasTrimmed = typeof newAlias === 'string' ? newAlias.trim() : '';
        if (!newAliasTrimmed) {
            return res.status(400).json({ error: 'newAlias is required and must be non-empty' });
        }

        const result = findIngredientOr404(id, res);
        if (!result) return;
        const { ingredients, ingredient } = result;
        const aliases = [...(ingredient.aliases || [])];
        if (aliasIndex > aliases.length) {
            return res.status(404).json({ error: 'Alias index out of range' });
        }

        const isAppend = aliasIndex === aliases.length;
        const oldAlias = !isAppend ? aliases[aliasIndex] : null;
        if (oldAlias != null && oldAlias.trim().toLowerCase() === newAliasTrimmed.toLowerCase()) {
            return res.json(ingredient);
        }

        const conflict = checkAliasConflict([newAliasTrimmed], id);
        if (conflict) {
            return res.status(400).json({
                error: `Alias "${conflict.alias}" conflicts with ${conflict.type} of ingredient "${conflict.conflictsWith}"`
            });
        }
        const nameLower = ingredient.name.toLowerCase();
        if (newAliasTrimmed.toLowerCase() === nameLower) {
            return res.status(400).json({ error: 'Alias cannot match the ingredient name' });
        }

        let updatedRecipeCount = 0;
        if (!isAppend && updateRecipes === true && oldAlias != null) {
            updatedRecipeCount = updateRecipeIngredientDisplay(id, oldAlias, newAliasTrimmed);
        }

        if (isAppend) {
            aliases.push(newAliasTrimmed);
        } else {
            aliases[aliasIndex] = newAliasTrimmed;
        }
        ingredient.aliases = aliases.length > 0 ? aliases : undefined;
        saveIngredients(ingredients);
        res.json({ ...ingredient, updatedRecipeCount });
    });

    app.delete('/api/ingredients/:id/aliases/:aliasIndex', authenticate, requireEditor, (req, res) => {
        const id = req.params.id;
        const aliasIndex = parseInt(req.params.aliasIndex, 10);
        const useCanonicalName = req.query.useCanonicalName === 'true';
        const replacementAlias = req.query.replacementAlias;

        if (Number.isNaN(aliasIndex) || aliasIndex < 0) {
            return res.status(400).json({ error: 'Invalid alias index' });
        }

        const result = findIngredientOr404(id, res);
        if (!result) return;
        const { ingredients, ingredient } = result;
        const aliases = ingredient.aliases || [];
        if (aliasIndex >= aliases.length) {
            return res.status(404).json({ error: 'Alias index out of range' });
        }

        const aliasToRemove = aliases[aliasIndex];
        const usedIn = findAliasUsage(id, aliasToRemove);

        if (usedIn.length > 0) {
            if (!useCanonicalName && (replacementAlias === undefined || replacementAlias === '')) {
                return res.status(400).json({
                    error: 'This alias is used in recipes. Provide replacementAlias or useCanonicalName=true',
                    recipeCount: usedIn.length,
                    recipeNames: usedIn.slice(0, 10)
                });
            }
        }

        let newDisplayText = null;
        if (usedIn.length > 0) {
            if (useCanonicalName) {
                newDisplayText = ingredient.name;
            } else {
                const replacement = typeof replacementAlias === 'string' ? replacementAlias.trim() : '';
                const validTargets = [ingredient.name, ...(ingredient.aliases || [])].filter(a => a !== aliasToRemove);
                const match = validTargets.find(a => a.trim().toLowerCase() === replacement.toLowerCase());
                if (!match) {
                    return res.status(400).json({
                        error: 'replacementAlias must be the canonical name or another alias of this ingredient'
                    });
                }
                newDisplayText = match;
            }
        }

        let actualUpdatedCount = 0;
        if (newDisplayText !== null) {
            actualUpdatedCount = updateRecipeIngredientDisplay(id, aliasToRemove, newDisplayText);
        }

        const newAliases = aliases.filter((_, i) => i !== aliasIndex);
        ingredient.aliases = newAliases.length > 0 ? newAliases : undefined;
        saveIngredients(ingredients);
        res.json({ ...ingredient, updatedRecipeCount: actualUpdatedCount });
    });
}

