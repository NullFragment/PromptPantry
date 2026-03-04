import request from 'supertest';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {createTestEnvironment, writeTestFile, type TestEnvironment} from './testDataIsolation.js';

const makeRecipe = (overrides: Record<string, unknown>) => ({
    name: 'Test Recipe',
    categories: ['Dinner'],
    prepTime: '10',
    cookTime: '20',
    servings: 4,
    tags: [],
    ingredients: [{ingredient: 'Salt', ingredientId: '00000000-0000-0000-0000-000000000001', quantity: '1', measure: 'tsp'}],
    instructions: ['Cook it'],
    macros: {calories: 100, protein: 10, carbs: 10, fat: 5},
    ...overrides,
});

const ingredientDef = {
    id: '00000000-0000-0000-0000-000000000001',
    name: 'Salt',
    storeSection: 'Spices',
};

describe('GET /api/recipes/audit', () => {
    let env: TestEnvironment;

    beforeAll(() => {
        env = createTestEnvironment('recipe-audit');
    });

    beforeEach(() => {
        writeTestFile(env.files.usersFile, [
            {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Admin'}
        ]);
    });

    afterAll(() => {
        env.cleanup();
    });

    it('returns clean audit when all recipes are valid and fully linked', async () => {
        writeTestFile(env.files.recipesFile, [makeRecipe({})]);
        writeTestFile(env.files.ingredientsFile, [ingredientDef]);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(200);
        expect(res.body.summary.totalRecipes).toBe(1);
        expect(res.body.summary.recipesWithIssues).toBe(0);
        expect(res.body.recipes).toHaveLength(0);
    });

    it('detects unlinked ingredients (missing ingredientId)', async () => {
        writeTestFile(env.files.recipesFile, [
            makeRecipe({ingredients: [{ingredient: 'Pepper', quantity: '1', measure: 'tsp'}]})
        ]);
        writeTestFile(env.files.ingredientsFile, [ingredientDef]);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(200);
        expect(res.body.summary.totalUnlinked).toBe(1);
        expect(res.body.recipes[0].issues).toEqual(
            expect.arrayContaining([expect.objectContaining({type: 'unlinked'})])
        );
    });

    it('detects broken ingredient links', async () => {
        writeTestFile(env.files.recipesFile, [
            makeRecipe({ingredients: [{ingredient: 'Ghost', ingredientId: '99999999-9999-9999-9999-999999999999', quantity: '1', measure: 'cup'}]})
        ]);
        writeTestFile(env.files.ingredientsFile, [ingredientDef]);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(200);
        expect(res.body.summary.totalBrokenLinks).toBe(1);
        expect(res.body.recipes[0].issues).toEqual(
            expect.arrayContaining([expect.objectContaining({type: 'broken_link'})])
        );
    });

    it('detects missing measurements', async () => {
        writeTestFile(env.files.recipesFile, [
            makeRecipe({ingredients: [{ingredient: 'Salt', ingredientId: '00000000-0000-0000-0000-000000000001'}]})
        ]);
        writeTestFile(env.files.ingredientsFile, [ingredientDef]);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(200);
        expect(res.body.summary.totalMissingMeasurements).toBe(1);
        expect(res.body.recipes[0].issues).toEqual(
            expect.arrayContaining([expect.objectContaining({type: 'missing_measurement'})])
        );
    });

    it('accepts metric-only measurements as valid', async () => {
        writeTestFile(env.files.recipesFile, [
            makeRecipe({ingredients: [{ingredient: 'Salt', ingredientId: '00000000-0000-0000-0000-000000000001', metric: {quantity: '5', measure: 'g'}}]})
        ]);
        writeTestFile(env.files.ingredientsFile, [ingredientDef]);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(200);
        const measurementIssues = res.body.recipes.flatMap(
            (r: { issues: { type: string }[] }) => r.issues.filter((i: { type: string }) => i.type === 'missing_measurement')
        );
        expect(measurementIssues).toHaveLength(0);
    });

    it('accepts imperial-only measurements as valid', async () => {
        writeTestFile(env.files.recipesFile, [
            makeRecipe({ingredients: [{ingredient: 'Salt', ingredientId: '00000000-0000-0000-0000-000000000001', imperial: {quantity: '1', measure: 'oz'}}]})
        ]);
        writeTestFile(env.files.ingredientsFile, [ingredientDef]);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(200);
        const measurementIssues = res.body.recipes.flatMap(
            (r: { issues: { type: string }[] }) => r.issues.filter((i: { type: string }) => i.type === 'missing_measurement')
        );
        expect(measurementIssues).toHaveLength(0);
    });

    it('detects schema-invalid recipes', async () => {
        writeTestFile(env.files.recipesFile, [
            {name: 'Bad Recipe', categories: ['NotACategory'], ingredients: [{ingredient: 'X'}], instructions: ['Do'], macros: {}}
        ]);
        writeTestFile(env.files.ingredientsFile, []);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(200);
        expect(res.body.summary.totalSchemaInvalid).toBeGreaterThanOrEqual(1);
    });

    it('handles grouped ingredients', async () => {
        writeTestFile(env.files.recipesFile, [
            makeRecipe({
                ingredients: [
                    {name: 'Sauce', ingredients: [{ingredient: 'Ketchup', quantity: '2', measure: 'tbsp'}]},
                    {name: 'Base', ingredients: [{ingredient: 'Rice', ingredientId: '00000000-0000-0000-0000-000000000001', quantity: '1', measure: 'cup'}]}
                ]
            })
        ]);
        writeTestFile(env.files.ingredientsFile, [ingredientDef]);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(200);
        const unlinked = res.body.recipes.flatMap(
            (r: { issues: { type: string }[] }) => r.issues.filter((i: { type: string }) => i.type === 'unlinked')
        );
        expect(unlinked).toHaveLength(1);
        expect(unlinked[0].ingredient).toContain('Ketchup');
        expect(unlinked[0].ingredient).toContain('Sauce');
    });

    it('reports multiple issues per recipe', async () => {
        writeTestFile(env.files.recipesFile, [
            makeRecipe({ingredients: [{ingredient: 'Mystery'}]})
        ]);
        writeTestFile(env.files.ingredientsFile, [ingredientDef]);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(200);
        const recipe = res.body.recipes[0];
        const types = recipe.issues.map((i: { type: string }) => i.type);
        expect(types).toContain('unlinked');
        expect(types).toContain('missing_measurement');
    });

    it('returns 403 for non-admin users', async () => {
        writeTestFile(env.files.usersFile, [
            {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Editor'}
        ]);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(403);
    });

    it('returns empty results for empty recipe list', async () => {
        writeTestFile(env.files.recipesFile, []);
        writeTestFile(env.files.ingredientsFile, []);

        const res = await request(env.app).get('/api/recipes/audit');
        expect(res.status).toBe(200);
        expect(res.body.summary.totalRecipes).toBe(0);
        expect(res.body.summary.recipesWithIssues).toBe(0);
        expect(res.body.recipes).toHaveLength(0);
    });
});
