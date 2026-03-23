/**
 * Data Access Layer - Shared file I/O utilities for all route modules.
 * Handles reading/writing JSON files and provides data accessors.
 */
import fs from 'fs';
import path from 'path';

/**
 * @param {string} dataDir - Path to the data directory
 * @param {object} validators - Pre-compiled schema validators
 */
export function createDataAccess(dataDir, validators) {
    const RECIPES_FILE = path.join(dataDir, 'recipes.json');
    const PARTICIPANTS_FILE = path.join(dataDir, 'participants.json');
    const MEAL_PLAN_FILE = path.join(dataDir, 'mealPlan.json');
    const MULTI_WEEK_FILE = path.join(dataDir, 'multiWeeklyCookPlan.json');
    const USERS_FILE = path.join(dataDir, 'users.json');
    const SETTINGS_FILE = path.join(dataDir, 'settings.json');
    const INGREDIENTS_FILE = path.join(dataDir, 'ingredients.json');
    const STORE_SECTIONS_FILE = path.join(dataDir, 'storeSections.json');

    const { recipeValidator, storeSectionValidator } = validators;

    const readJsonFile = (filePath, fallback) => {
        try {
            const data = fs.readFileSync(filePath, 'utf8');
            return JSON.parse(data);
        } catch (err) {
            if (err.code === 'ENOENT') return fallback;
            console.error(`Error reading ${filePath}:`, err);
            return fallback;
        }
    };

    const writeJsonFile = (filePath, data) => {
        const tmp = filePath + '.tmp';
        fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
        fs.renameSync(tmp, filePath);
    };

    const readRecipes = (includeInvalid = false) => {
        const data = readJsonFile(RECIPES_FILE, []);
        if (!Array.isArray(data)) return [];
        if (includeInvalid === 'all') {
            return data;
        }
        if (includeInvalid) {
            return data.map(r => {
                if (!recipeValidator) return {...r, _isValid: true};
                const isValid = recipeValidator(r);
                if (!isValid) {
                    return {
                        ...r,
                        _isValid: false,
                        _errors: recipeValidator.errors.map(err => `${err.instancePath} ${err.message}`).join(', ')
                    };
                }
                return {...r, _isValid: true};
            });
        }
        return data.filter(r => {
            if (!recipeValidator) return true;
            const isValid = recipeValidator(r);
            if (!isValid) {
                console.warn(`Recipe "${r.name || 'Unknown'}" failed schema validation:`, recipeValidator.errors.map(err => `${err.instancePath} ${err.message}`).join(', '));
            }
            return isValid;
        });
    };

    const saveRecipes = (recipes) => {
        const cleanedRecipes = recipes.map(r => {
            const {_isValid, _errors, ...rest} = r;
            return rest;
        });
        const sortedRecipes = [...cleanedRecipes].sort((a, b) => a.name.localeCompare(b.name));
        writeJsonFile(RECIPES_FILE, sortedRecipes);
    };

    const readIngredients = () => {
        const data = readJsonFile(INGREDIENTS_FILE, []);
        if (!Array.isArray(data)) return [];
        return data.sort((a, b) => a.name.localeCompare(b.name));
    };

    const saveIngredients = (ingredients) => {
        const sortedIngredients = [...ingredients].sort((a, b) => a.name.localeCompare(b.name));
        writeJsonFile(INGREDIENTS_FILE, sortedIngredients);
    };

    const readStoreSections = () => {
        const data = readJsonFile(STORE_SECTIONS_FILE, []);
        if (!Array.isArray(data)) return [];
        return data;
    };

    const writeStoreSections = (data) => {
        if (storeSectionValidator && !storeSectionValidator(data)) {
            throw new Error('Store sections data failed schema validation');
        }
        writeJsonFile(STORE_SECTIONS_FILE, data);
    };

    const readUsers = () => {
        const data = readJsonFile(USERS_FILE, []);
        let users = Array.isArray(data) ? data : [];
        const filtered = users.filter(u => typeof u.tier === 'string' && ['Viewer', 'Editor', 'Admin'].includes(u.tier));
        if (filtered.length !== users.length) {
            users = filtered;
            saveUsers(users);
        }
        return users;
    };

    const saveUsers = (users) => {
        writeJsonFile(USERS_FILE, users);
    };

    const MACRO_LIMITS_DEFAULTS = {
        proteinPercentMin: 0,
        proteinPercentMax: 100,
        fatPercentMin: 0,
        fatPercentMax: 100,
        calorieDeficitMax: 25
    };

    const readSettings = () => {
        const raw = readJsonFile(SETTINGS_FILE, {registrationEnabled: true, advancedMode: false});
        const settings = { ...raw };
        const users = readUsers();
        if (users.length === 0) {
            settings.registrationEnabled = true;
        }
        if (!settings.macroLimits || typeof settings.macroLimits !== 'object') {
            settings.macroLimits = { ...MACRO_LIMITS_DEFAULTS };
        } else {
            settings.macroLimits = { ...MACRO_LIMITS_DEFAULTS, ...settings.macroLimits };
        }
        return settings;
    };

    const saveSettings = (settings) => {
        writeJsonFile(SETTINGS_FILE, settings);
    };

    const readParticipants = () => readJsonFile(PARTICIPANTS_FILE, []);
    const saveParticipants = (participants) => writeJsonFile(PARTICIPANTS_FILE, participants);

    const readMealPlan = () => readJsonFile(MEAL_PLAN_FILE, {});
    const saveMealPlan = (mealPlan) => writeJsonFile(MEAL_PLAN_FILE, mealPlan);

    const readMultiWeeklyCookPlan = () => readJsonFile(MULTI_WEEK_FILE, {});
    const saveMultiWeeklyCookPlan = (plan) => writeJsonFile(MULTI_WEEK_FILE, plan);

    // Purge invalid users on startup (one-time cleanup)
    const purgeInvalidUsers = () => {
        const startupUsers = readUsers();
        const validUsers = startupUsers.filter(u => typeof u.tier === 'string' && ['Viewer', 'Editor', 'Admin'].includes(u.tier));
        if (validUsers.length !== startupUsers.length) {
            saveUsers(validUsers);
        }
    };

    /**
     * Validates data against a schema validator. Returns true if valid.
     * On failure, sends a 400 response and returns false.
     * Only admins see full validation error details.
     */
    const validateOrFail = (res, validator, data, errorLabel, req) => {
        if (!validator || !validator(data)) {
            const errorDetails = validator?.errors?.map(err => `${err.instancePath || '(root)'} ${err.message}`).join('; ') || '';
            res.status(400).json({
                error: errorDetails ? `Invalid ${errorLabel}: ${errorDetails}` : `Invalid ${errorLabel}`,
            });
            return false;
        }
        return true;
    };

    return {
        readRecipes,
        saveRecipes,
        readIngredients,
        saveIngredients,
        readStoreSections,
        writeStoreSections,
        readUsers,
        saveUsers,
        readSettings,
        saveSettings,
        readParticipants,
        saveParticipants,
        readMealPlan,
        saveMealPlan,
        readMultiWeeklyCookPlan,
        saveMultiWeeklyCookPlan,
        purgeInvalidUsers,
        validateOrFail,
        MACRO_LIMITS_DEFAULTS,
    };
}



