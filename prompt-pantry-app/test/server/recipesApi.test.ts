import request from 'supertest';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {createTestEnvironment, writeTestFile, readTestFile, type TestEnvironment} from './testDataIsolation.js';

const validRecipe = {
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
            .put(`/api/recipes/${encodeURIComponent(invalidRecipe.name)}`)
            .send(updatedInvalidRecipe);

        // CURRENT BEHAVIOR: returns 404 Recipe not found
        expect(res.status).toBe(200);
    });

    it('fails to delete an invalid recipe (reproducing the issue)', async () => {
        const {app} = env;
        const res = await request(app)
            .delete(`/api/recipes/${encodeURIComponent(invalidRecipe.name)}`);

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
