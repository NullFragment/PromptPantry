import request from 'supertest';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {createTestEnvironment, deleteTestFile, writeTestFile, type TestEnvironment} from './testDataIsolation.js';

const SAMPLE_RECIPE_ID = 'a1b2c3d4-0000-0000-0000-000000000001';

// Compact format: recipeId + servings (schema requires recipeId as UUID)
const samplePlan = {
    '2026-01-02': {
        dinner: [{
            recipeId: SAMPLE_RECIPE_ID,
            servings: 2
        }]
    }
};
const sampleMulti = {'2026-01-02': {'uuid-test-1': {recipeId: SAMPLE_RECIPE_ID, servings: 2}}};

describe('Meal plan API', () => {
    let env: TestEnvironment;

    beforeAll(() => {
        env = createTestEnvironment('meal-plan-api');
    });

    beforeEach(() => {
        deleteTestFile(env.files.mealPlanFile);
        deleteTestFile(env.files.multiWeekFile);
        // Ensure testuser has Editor tier for write operations
        writeTestFile(env.files.usersFile, [
            {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Editor'}
        ]);
    });

    afterAll(() => {
        env.cleanup();
    });

    it('writes and reads meal plan', async () => {
        const {app} = env;
        const putRes = await request(app).put('/api/meal-plan').send(samplePlan);
        expect(putRes.status).toBe(200);

        const getRes = await request(app).get('/api/meal-plan');
        expect(getRes.body['2026-01-02'].dinner[0].servings).toBe(2);
    });

    it('rejects invalid meal plan payload', async () => {
        const {app} = env;
        const res = await request(app).put('/api/meal-plan').send({foo: 'bar'});
        expect(res.status).toBe(400);
    });

    it('writes and reads multi weekly cook plan', async () => {
        const {app} = env;
        const putRes = await request(app).put('/api/multi-weekly-cook-plan').send(sampleMulti);
        expect(putRes.status).toBe(200);

        const getRes = await request(app).get('/api/multi-weekly-cook-plan');
        expect(getRes.body['2026-01-02']['uuid-test-1'].recipeId).toBe(SAMPLE_RECIPE_ID);
        expect(getRes.body['2026-01-02']['uuid-test-1'].servings).toBe(2);
    });
});
