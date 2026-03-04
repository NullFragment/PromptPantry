/**
 * Settings Routes - Settings CRUD endpoints
 */

export function registerSettingsRoutes(app, { dataAccess, middleware }) {
    const { readSettings, saveSettings, MACRO_LIMITS_DEFAULTS } = dataAccess;
    const { authenticate, requireAdmin } = middleware;

    const validateLimitField = (value, min = 0, max = 100) =>
        typeof value === 'number' && value >= min && value <= max;

    app.get('/api/settings', authenticate, (req, res) => {
        res.json(readSettings());
    });

    app.put('/api/settings', authenticate, requireAdmin, (req, res) => {
        // Only accept known fields — strip anything else
        const { registrationEnabled, advancedMode, macroLimits } = req.body;
        const settings = readSettings();

        if (typeof registrationEnabled === 'boolean') {
            settings.registrationEnabled = registrationEnabled;
        }
        if (typeof advancedMode === 'boolean') {
            settings.advancedMode = advancedMode;
        }
        if (macroLimits != null && typeof macroLimits === 'object') {
            const limits = settings.macroLimits || { ...MACRO_LIMITS_DEFAULTS };
            const limitFields = ['proteinPercentMin', 'proteinPercentMax', 'fatPercentMin', 'fatPercentMax', 'calorieDeficitMax'];
            for (const field of limitFields) {
                if (validateLimitField(macroLimits[field])) {
                    limits[field] = macroLimits[field];
                }
            }
            if (limits.proteinPercentMin > limits.proteinPercentMax || limits.fatPercentMin > limits.fatPercentMax) {
                return res.status(400).json({ error: 'Invalid macro limits: min must be less than or equal to max' });
            }
            settings.macroLimits = limits;
        }

        saveSettings(settings);
        res.json(settings);
    });

    app.get('/api/settings/registration', authenticate, (req, res) => {
        const settings = readSettings();
        res.json({registrationEnabled: settings.registrationEnabled});
    });

    app.put('/api/settings/registration', authenticate, requireAdmin, (req, res) => {
        const {registrationEnabled} = req.body;
        if (typeof registrationEnabled !== 'boolean') {
            return res.status(400).json({error: 'Invalid value for registrationEnabled'});
        }

        const settings = readSettings();
        settings.registrationEnabled = registrationEnabled;
        saveSettings(settings);

        res.json({registrationEnabled: settings.registrationEnabled});
    });
}

