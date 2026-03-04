/**
 * Meal Plan Routes - Meal plan, multi-weekly cook plan, and participant endpoints
 */

export function registerMealPlanRoutes(app, { dataAccess, middleware, validators }) {
    const { readParticipants, saveParticipants, readMealPlan, saveMealPlan, readMultiWeeklyCookPlan, saveMultiWeeklyCookPlan, validateOrFail } = dataAccess;
    const { authenticate, requireEditor } = middleware;
    const { participantValidator, mealPlanValidator, multiWeeklyCookPlanValidator } = validators;

    // Participant endpoints
    app.get('/api/participants', authenticate, (req, res) => {
        res.json(readParticipants());
    });

    app.put('/api/participants', authenticate, requireEditor, (req, res) => {
        const participants = req.body;
        if (!Array.isArray(participants)) {
            return res.status(400).json({error: 'Invalid participants data'});
        }
        for (const p of participants) {
            if (!participantValidator(p)) {
                const isAdmin = req?.user?.isAdmin === true;
                return res.status(400).json({
                    error: 'Invalid participant',
                    ...(isAdmin ? { details: participantValidator.errors } : {})
                });
            }
        }
        saveParticipants(participants);
        res.json(participants);
    });

    // Meal plan endpoints
    app.get('/api/meal-plan', authenticate, (req, res) => {
        res.json(readMealPlan());
    });

    app.put('/api/meal-plan', authenticate, requireEditor, (req, res) => {
        const mealPlan = req.body;
        if (!validateOrFail(res, mealPlanValidator, mealPlan, 'meal plan', req)) return;
        saveMealPlan(mealPlan);
        res.json(mealPlan);
    });

    app.get('/api/multi-weekly-cook-plan', authenticate, (req, res) => {
        res.json(readMultiWeeklyCookPlan());
    });

    app.put('/api/multi-weekly-cook-plan', authenticate, requireEditor, (req, res) => {
        const plan = req.body;
        if (!validateOrFail(res, multiWeeklyCookPlanValidator, plan, 'multi-weekly cook plan', req)) return;
        saveMultiWeeklyCookPlan(plan);
        res.json(plan);
    });
}

