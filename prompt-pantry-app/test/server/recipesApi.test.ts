import request from 'supertest';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {createTestEnvironment, writeTestFile, readTestFile, type TestEnvironment} from './testDataIsolation.js';

const VALID_RECIPE_ID = 'a0000000-0000-0000-0000-000000000001';
const INVALID_RECIPE_ID = 'a0000000-0000-0000-0000-000000000002';

const validRecipe = {
    id: VALID_RECIPE_ID,
    name: 'Valid Recipe',
    categories: ['Dinner'],
    prepTime: '10',
    cookTime: '20',
    servings: 4,
    tags: [],
    ingredients: [{ingredient: 'Salt'}],
    instructions: ['Cook it'],
    macros: {calories: 100, protein: 10, carbs: 10, fat: 5}
};

const invalidRecipe = {
    id: INVALID_RECIPE_ID,
    name: 'Invalid Recipe',
    categories: ['InvalidCategory'], // Invalid category
    prepTime: '10',
    cookTime: '20',
    servings: 4,
    tags: [],
    ingredients: [{ingredient: 'Salt'}],
    instructions: ['Cook it'],
    macros: {calories: 100, protein: 10, carbs: 10, fat: 5}
};

describe('Recipes API - Invalid Recipes Handling', () => {
    let env: TestEnvironment;

    beforeAll(() => {
        env = createTestEnvironment('recipes-api');
    });

    beforeEach(() => {
        // Reset recipes file with test data
        writeTestFile(env.files.recipesFile, [validRecipe, invalidRecipe]);
        // Ensure testuser has Editor tier for write operations
        writeTestFile(env.files.usersFile, [
            {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Editor'}
        ]);
    });

    afterAll(() => {
        env.cleanup();
    });

    it('fails to update an invalid recipe (reproducing the issue)', async () => {
        const {app} = env;
        const updatedInvalidRecipe = {...invalidRecipe, cookTime: '30', categories: ['Dinner']}; // Now valid
        const res = await request(app)
            .put(`/api/recipes/${INVALID_RECIPE_ID}`)
            .send(updatedInvalidRecipe);

        // CURRENT BEHAVIOR: returns 404 Recipe not found
        expect(res.status).toBe(200);
    });

    it('fails to delete an invalid recipe (reproducing the issue)', async () => {
        const {app} = env;
        const res = await request(app)
            .delete(`/api/recipes/${INVALID_RECIPE_ID}`);

        // CURRENT BEHAVIOR: returns 404 Recipe not found
        expect(res.status).toBe(204);
    });

    it('loses invalid recipes when saving a valid one (reproducing the data loss issue)', async () => {
        const {app} = env;
        const updatedValidRecipe = {...validRecipe, cookTime: '30'};
        await request(app)
            .put(`/api/recipes/${encodeURIComponent(validRecipe.name)}`)
            .send(updatedValidRecipe);

        const recipesInFile = readTestFile<Array<{name: string}>>(env.files.recipesFile);
        const invalidRecipeInFile = recipesInFile.find(r => r.name === invalidRecipe.name);

        // CURRENT BEHAVIOR: invalidRecipeInFile will be undefined
        expect(invalidRecipeInFile).toBeDefined();
    });
});

describe('Recipes API - Variant recipes', () => {
    let env: TestEnvironment;

    beforeAll(() => {
        env = createTestEnvironment('recipes-api-variant');
    });

    const BASE_RECIPE_ID = 'b0000000-0000-0000-0000-000000000001';

    beforeEach(() => {
        const baseRecipe = {
            id: BASE_RECIPE_ID,
            name: 'Overnight Oats',
            categories: ['Breakfast'],
            prepTime: '5 min',
            cookTime: '0',
            servings: 1,
            tags: ['oatmeal'],
            ingredients: [{ingredient: 'Oats', quantity: '1/2', measure: 'cup'}, {ingredient: 'Milk', quantity: '1/2', measure: 'cup'}],
            instructions: ['Mix oats and milk.', 'Refrigerate overnight.'],
            macros: {calories: 200, protein: 8, carbs: 30, fat: 5}
        };
        writeTestFile(env.files.recipesFile, [baseRecipe]);
        writeTestFile(env.files.usersFile, [
            {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Editor'}
        ]);
    });

    afterAll(() => {
        env.cleanup();
    });

    it('accepts POST of a variant recipe (baseRecipeId, ingredientAdditions, instructionAdditions)', async () => {
        const variantRecipe = {
            name: 'Overnight Oats: Chocolate',
            categories: ['Breakfast'],
            prepTime: '5 min',
            cookTime: '0',
            servings: 1,
            tags: ['oatmeal', 'chocolate'],
            ingredients: [],
            instructions: [],
            macros: {calories: 220, protein: 9, carbs: 35, fat: 6},
            baseRecipeId: BASE_RECIPE_ID,
            ingredientAdditions: [{ingredient: 'Cocoa powder', quantity: '1', measure: 'tbsp'}],
            instructionAdditions: ['Stir in cocoa before serving.']
        };
        const {app} = env;
        const res = await request(app)
            .post('/api/recipes')
            .send(variantRecipe);
        expect(res.status).toBe(201);
        expect(res.body.name).toBe('Overnight Oats: Chocolate');
        expect(res.body.baseRecipeId).toBe(BASE_RECIPE_ID);
        expect(res.body.ingredientAdditions).toHaveLength(1);
        expect(res.body.instructionAdditions).toHaveLength(1);
    });
});
