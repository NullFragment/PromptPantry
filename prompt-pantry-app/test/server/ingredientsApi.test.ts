import request from 'supertest';
import {afterAll, beforeAll, beforeEach, describe, expect, it} from 'vitest';
import {createTestEnvironment, writeTestFile, readTestFile, type TestEnvironment} from './testDataIsolation.js';

// Test UUID constants for store sections
const PRODUCE_SECTION_ID = 'b0000000-0000-0000-0000-000000000001';
const PROTEIN_SECTION_ID = 'b0000000-0000-0000-0000-000000000002';
const DAIRY_SECTION_ID   = 'b0000000-0000-0000-0000-000000000003';
const SPICES_SECTION_ID  = 'b0000000-0000-0000-0000-000000000004';

const sampleIngredient = {
    id: '550e8400-e29b-41d4-a716-446655440000',
    name: 'garlic',
    storeSectionId: PRODUCE_SECTION_ID
};

const sampleIngredientWithAliases = {
    id: '550e8400-e29b-41d4-a716-446655440001',
    name: 'chicken breast',
    storeSectionId: PROTEIN_SECTION_ID,
    aliases: ['boneless chicken breast', 'chicken breast, skinless']
};

describe('Ingredients API', () => {
    let env: TestEnvironment;

    beforeAll(() => {
        env = createTestEnvironment('ingredients-api');
    });

    beforeEach(() => {
        // Reset ingredients file
        writeTestFile(env.files.ingredientsFile, []);
        // Set up known store sections
        writeTestFile(env.files.storeSectionsFile, [
            { id: PRODUCE_SECTION_ID, name: 'Produce' },
            { id: PROTEIN_SECTION_ID, name: 'Protein' },
            { id: DAIRY_SECTION_ID,   name: 'Dairy' },
            { id: SPICES_SECTION_ID,  name: 'Spices' },
        ]);
        // Ensure testuser has Editor tier for write operations
        writeTestFile(env.files.usersFile, [
            {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Editor'}
        ]);
    });

    afterAll(() => {
        env.cleanup();
    });

    describe('GET /api/ingredients', () => {
        it('returns empty array when no ingredients exist', async () => {
            const {app} = env;
            const res = await request(app).get('/api/ingredients');
            expect(res.status).toBe(200);
            expect(res.body).toEqual([]);
        });

        it('returns all ingredients sorted alphabetically', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [
                {id: '1', name: 'zucchini', storeSectionId: PRODUCE_SECTION_ID},
                {id: '2', name: 'apple',    storeSectionId: PRODUCE_SECTION_ID},
                {id: '3', name: 'milk',     storeSectionId: DAIRY_SECTION_ID}
            ]);

            const res = await request(app).get('/api/ingredients');
            expect(res.status).toBe(200);
            expect(res.body).toHaveLength(3);
            expect(res.body[0].name).toBe('apple');
            expect(res.body[1].name).toBe('milk');
            expect(res.body[2].name).toBe('zucchini');
        });
    });

    describe('GET /api/ingredients/:id', () => {
        it('returns a single ingredient by ID', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app).get(`/api/ingredients/${sampleIngredient.id}`);
            expect(res.status).toBe(200);
            expect(res.body.name).toBe('garlic');
        });

        it('returns 404 for non-existent ingredient', async () => {
            const {app} = env;
            const res = await request(app).get('/api/ingredients/non-existent-id');
            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/ingredients/:id/usage', () => {
        it('returns zero usage for ingredient not in any recipe', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app).get(`/api/ingredients/${sampleIngredient.id}/usage`);
            expect(res.status).toBe(200);
            expect(res.body.recipeCount).toBe(0);
            expect(res.body.recipeNames).toEqual([]);
        });

        it('returns correct usage count when ingredient is used in recipes', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);
            writeTestFile(env.files.recipesFile, [
                {
                    name: 'Garlic Bread',
                    categories: ['Side'],
                    ingredients: [
                        {ingredient: 'garlic', ingredientId: sampleIngredient.id, quantity: '4', measure: 'cloves'}
                    ],
                    instructions: ['Make it'],
                    macros: {calories: 100, protein: 2, carbs: 15, fat: 4}
                },
                {
                    name: 'Garlic Soup',
                    categories: ['Dinner'],
                    ingredients: [
                        {ingredient: 'garlic', ingredientId: sampleIngredient.id, quantity: '10', measure: 'cloves'}
                    ],
                    instructions: ['Make it'],
                    macros: {calories: 200, protein: 5, carbs: 20, fat: 8}
                }
            ]);

            const res = await request(app).get(`/api/ingredients/${sampleIngredient.id}/usage`);
            expect(res.status).toBe(200);
            expect(res.body.recipeCount).toBe(2);
            expect(res.body.recipeNames).toContain('Garlic Bread');
            expect(res.body.recipeNames).toContain('Garlic Soup');
        });
    });

    describe('GET /api/store-sections', () => {
        it('returns store sections from storeSections.json as objects with name and emoji', async () => {
            const {app} = env;

            const res = await request(app).get('/api/store-sections');
            expect(res.status).toBe(200);
            expect(Array.isArray(res.body)).toBe(true);
            // Each section should be an object with at least a name field
            expect(res.body.length).toBeGreaterThan(0);
            expect(res.body[0]).toHaveProperty('name');
            // Verify some known sections are present
            const names = res.body.map((s: { name: string }) => s.name);
            expect(names).toContain('Dairy');
            expect(names).toContain('Produce');
        });
    });

    describe('POST /api/ingredients', () => {
        it('creates a new ingredient', async () => {
            const {app} = env;
            const newIngredient = {
                name: 'onion',
                storeSectionId: PRODUCE_SECTION_ID
            };

            const res = await request(app)
                .post('/api/ingredients')
                .send(newIngredient);

            expect(res.status).toBe(201);
            expect(res.body.name).toBe('onion');
            expect(res.body.storeSectionId).toBe(PRODUCE_SECTION_ID);
            expect(res.body.id).toBeDefined();
        });

        it('auto-generates UUID if not provided', async () => {
            const {app} = env;
            const res = await request(app)
                .post('/api/ingredients')
                .send({name: 'carrot', storeSectionId: PRODUCE_SECTION_ID});

            expect(res.status).toBe(201);
            expect(res.body.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i);
        });

        it('rejects duplicate ingredient name', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app)
                .post('/api/ingredients')
                .send({name: 'garlic', storeSectionId: PRODUCE_SECTION_ID});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('already exists');
        });

        it('rejects duplicate ingredient name case-insensitively', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app)
                .post('/api/ingredients')
                .send({name: 'GARLIC', storeSectionId: PRODUCE_SECTION_ID});

            expect(res.status).toBe(400);
        });

        it('rejects alias that conflicts with existing ingredient name', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app)
                .post('/api/ingredients')
                .send({
                    name: 'onion',
                    storeSectionId: PRODUCE_SECTION_ID,
                    aliases: ['garlic'] // conflicts with existing ingredient name
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('conflicts');
        });

        it('rejects alias that conflicts with existing alias', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredientWithAliases]);

            const res = await request(app)
                .post('/api/ingredients')
                .send({
                    name: 'turkey breast',
                    storeSectionId: PROTEIN_SECTION_ID,
                    aliases: ['boneless chicken breast'] // conflicts with existing alias
                });

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('conflicts');
        });

        it('rejects invalid ingredient (missing required fields)', async () => {
            const {app} = env;
            const res = await request(app)
                .post('/api/ingredients')
                .send({name: 'onion'}); // missing storeSectionId

            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/ingredients/:id', () => {
        it('updates an existing ingredient', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app)
                .put(`/api/ingredients/${sampleIngredient.id}`)
                .send({
                    ...sampleIngredient,
                    storeSectionId: SPICES_SECTION_ID
                });

            expect(res.status).toBe(200);
            expect(res.body.storeSectionId).toBe(SPICES_SECTION_ID);
        });

        it('returns 404 for non-existent ingredient', async () => {
            const {app} = env;
            // Use a valid UUID format that doesn't exist
            const res = await request(app)
                .put('/api/ingredients/550e8400-e29b-41d4-a716-000000000000')
                .send({name: 'onion', storeSectionId: PRODUCE_SECTION_ID});

            expect(res.status).toBe(404);
        });

        it('allows updating aliases', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app)
                .put(`/api/ingredients/${sampleIngredient.id}`)
                .send({
                    ...sampleIngredient,
                    aliases: ['garlic clove', 'garlic, minced']
                });

            expect(res.status).toBe(200);
            expect(res.body.aliases).toContain('garlic clove');
            expect(res.body.aliases).toContain('garlic, minced');
        });
    });

    describe('DELETE /api/ingredients/:id', () => {
        it('deletes an ingredient not used in any recipe', async () => {
            const {app} = env;
            // Ensure no recipes reference this ingredient
            writeTestFile(env.files.recipesFile, []);
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app).delete(`/api/ingredients/${sampleIngredient.id}`);
            expect(res.status).toBe(204);

            // Verify it's gone
            const getRes = await request(app).get(`/api/ingredients/${sampleIngredient.id}`);
            expect(getRes.status).toBe(404);
        });

        it('returns 404 for non-existent ingredient', async () => {
            const {app} = env;
            // Use a valid UUID format that doesn't exist
            const res = await request(app).delete('/api/ingredients/550e8400-e29b-41d4-a716-000000000000');
            expect(res.status).toBe(404);
        });

        it('blocks deletion of ingredient used in recipes', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);
            writeTestFile(env.files.recipesFile, [
                {
                    name: 'Garlic Bread',
                    categories: ['Side'],
                    ingredients: [
                        {ingredient: 'garlic', ingredientId: sampleIngredient.id, quantity: '4', measure: 'cloves'}
                    ],
                    instructions: ['Make it'],
                    macros: {calories: 100, protein: 2, carbs: 15, fat: 4}
                }
            ]);

            const res = await request(app).delete(`/api/ingredients/${sampleIngredient.id}`);
            expect(res.status).toBe(400);
            expect(res.body.error).toContain('used in recipes');
            expect(res.body.recipeCount).toBe(1);
        });
    });

    describe('POST /api/ingredients/merge', () => {
        it('merges multiple ingredients into target', async () => {
            const {app} = env;
            const source1 = {id: '550e8400-e29b-41d4-a716-446655440002', name: 'rocket',        storeSectionId: PRODUCE_SECTION_ID};
            const source2 = {id: '550e8400-e29b-41d4-a716-446655440003', name: 'arugula salad', storeSectionId: PRODUCE_SECTION_ID};
            const target  = {id: '550e8400-e29b-41d4-a716-446655440004', name: 'arugula',       storeSectionId: PRODUCE_SECTION_ID};

            writeTestFile(env.files.ingredientsFile, [source1, source2, target]);

            const res = await request(app)
                .post('/api/ingredients/merge')
                .send({
                    sourceIds: [source1.id, source2.id],
                    targetId: target.id
                });

            expect(res.status).toBe(200);
            expect(res.body.mergedIngredientCount).toBe(2);

            // Verify source ingredients are gone
            const ingredients = readTestFile<Array<{id: string; name: string}>>(env.files.ingredientsFile);
            expect(ingredients.find(i => i.id === source1.id)).toBeUndefined();
            expect(ingredients.find(i => i.id === source2.id)).toBeUndefined();

            // Verify target has new aliases
            const targetIng = ingredients.find(i => i.id === target.id);
            expect(targetIng).toBeDefined();
        });

        it('updates recipe references when merging', async () => {
            const {app} = env;
            const source = {id: '550e8400-e29b-41d4-a716-446655440005', name: 'rocket',  storeSectionId: PRODUCE_SECTION_ID};
            const target = {id: '550e8400-e29b-41d4-a716-446655440006', name: 'arugula', storeSectionId: PRODUCE_SECTION_ID};

            writeTestFile(env.files.ingredientsFile, [source, target]);
            writeTestFile(env.files.recipesFile, [
                {
                    name: 'Rocket Salad',
                    categories: ['Side'],
                    ingredients: [
                        {ingredient: 'rocket', ingredientId: source.id, quantity: '100', measure: 'g'}
                    ],
                    instructions: ['Toss'],
                    macros: {calories: 50, protein: 2, carbs: 5, fat: 1}
                }
            ]);

            const res = await request(app)
                .post('/api/ingredients/merge')
                .send({
                    sourceIds: [source.id],
                    targetId: target.id
                });

            expect(res.status).toBe(200);
            expect(res.body.updatedRecipeCount).toBe(1);

            // Verify recipe now references target
            const recipes = readTestFile<Array<{ingredients: Array<{ingredientId: string}>}>>(env.files.recipesFile);
            expect(recipes[0].ingredients[0].ingredientId).toBe(target.id);
        });

        it('adds source names as aliases to target', async () => {
            const {app} = env;
            const source = {id: '550e8400-e29b-41d4-a716-446655440007', name: 'rocket',  storeSectionId: PRODUCE_SECTION_ID, aliases: ['rucola']};
            const target = {id: '550e8400-e29b-41d4-a716-446655440008', name: 'arugula', storeSectionId: PRODUCE_SECTION_ID};

            writeTestFile(env.files.ingredientsFile, [source, target]);

            await request(app)
                .post('/api/ingredients/merge')
                .send({
                    sourceIds: [source.id],
                    targetId: target.id
                });

            const ingredients = readTestFile<Array<{id: string; aliases?: string[]}>>(env.files.ingredientsFile);
            const targetIng = ingredients.find(i => i.id === target.id);
            expect(targetIng?.aliases).toContain('rocket');
            expect(targetIng?.aliases).toContain('rucola');
        });

        it('merges container sizes from source into target, deduplicating by quantity+unit', async () => {
            const {app} = env;
            const source = {
                id: '550e8400-e29b-41d4-a716-446655440010',
                name: 'baby bella mushrooms',
                storeSectionId: PRODUCE_SECTION_ID,
                containerSizes: [
                    {quantity: 8, unit: 'oz', label: '8 oz pack'},
                    {quantity: 16, unit: 'oz'}
                ]
            };
            const target = {
                id: '550e8400-e29b-41d4-a716-446655440011',
                name: 'baby portabella mushrooms',
                storeSectionId: PRODUCE_SECTION_ID,
                containerSizes: [
                    {quantity: 16, unit: 'oz', label: '1 lb pack'},
                    {quantity: 32, unit: 'oz'}
                ]
            };

            writeTestFile(env.files.ingredientsFile, [source, target]);

            await request(app)
                .post('/api/ingredients/merge')
                .send({sourceIds: [source.id], targetId: target.id});

            const ingredients = readTestFile<Array<{id: string; containerSizes?: Array<{quantity: number; unit: string; label?: string}>}>>(env.files.ingredientsFile);
            const targetIng = ingredients.find(i => i.id === target.id);

            // 16 oz duplicate should be deduplicated (target's entry kept, source's discarded)
            expect(targetIng?.containerSizes).toHaveLength(3);
            expect(targetIng?.containerSizes).toEqual(expect.arrayContaining([
                {quantity: 8, unit: 'oz', label: '8 oz pack'},
                {quantity: 16, unit: 'oz', label: '1 lb pack'},
                {quantity: 32, unit: 'oz'}
            ]));
        });

        it('rejects when targetId is in sourceIds', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app)
                .post('/api/ingredients/merge')
                .send({
                    sourceIds: [sampleIngredient.id],
                    targetId: sampleIngredient.id
                });

            expect(res.status).toBe(400);
        });

        it('rejects when target does not exist', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app)
                .post('/api/ingredients/merge')
                .send({
                    sourceIds: [sampleIngredient.id],
                    targetId: 'non-existent-id'
                });

            expect(res.status).toBe(404);
        });
    });

    describe('GET /api/ingredients/:id/alias-usage', () => {
        it('returns usage for a specific alias text', async () => {
            const {app} = env;
            const ing = {
                id: '550e8400-e29b-41d4-a716-446655440100',
                name: 'onion',
                storeSectionId: PRODUCE_SECTION_ID,
                aliases: ['onion, chopped', 'yellow onion']
            };
            writeTestFile(env.files.ingredientsFile, [ing]);
            writeTestFile(env.files.recipesFile, [
                {
                    name: 'Soup',
                    categories: ['Dinner'],
                    ingredients: [
                        {ingredient: 'onion, chopped', ingredientId: ing.id, quantity: '1', measure: 'cup'}
                    ],
                    instructions: ['Cook'],
                    macros: {calories: 100, protein: 2, carbs: 15, fat: 1}
                }
            ]);

            const res = await request(app)
                .get(`/api/ingredients/${ing.id}/alias-usage`)
                .query({alias: 'onion, chopped'});

            expect(res.status).toBe(200);
            expect(res.body.recipeCount).toBe(1);
            expect(res.body.recipeNames).toContain('Soup');
        });

        it('returns zero usage when alias is not used in recipes', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredientWithAliases]);

            const res = await request(app)
                .get(`/api/ingredients/${sampleIngredientWithAliases.id}/alias-usage`)
                .query({alias: 'boneless chicken breast'});

            expect(res.status).toBe(200);
            expect(res.body.recipeCount).toBe(0);
            expect(res.body.recipeNames).toEqual([]);
        });

        it('returns 400 when alias query is missing', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app).get(`/api/ingredients/${sampleIngredient.id}/alias-usage`);
            expect(res.status).toBe(400);
        });
    });

    describe('PUT /api/ingredients/:id/aliases/:aliasIndex', () => {
        it('updates alias at index', async () => {
            const {app} = env;
            const ing = {
                id: '550e8400-e29b-41d4-a716-446655440101',
                name: 'garlic',
                storeSectionId: PRODUCE_SECTION_ID,
                aliases: ['garlic clove', 'garlic, minced']
            };
            writeTestFile(env.files.ingredientsFile, [ing]);

            const res = await request(app)
                .put(`/api/ingredients/${ing.id}/aliases/1`)
                .send({newAlias: 'garlic minced', updateRecipes: false});

            expect(res.status).toBe(200);
            expect(res.body.aliases).toContain('garlic minced');
            expect(res.body.aliases).not.toContain('garlic, minced');
            expect(res.body.aliases[0]).toBe('garlic clove');
        });

        it('updates recipe references when updateRecipes is true', async () => {
            const {app} = env;
            const ing = {
                id: '550e8400-e29b-41d4-a716-446655440102',
                name: 'onion',
                storeSectionId: PRODUCE_SECTION_ID,
                aliases: ['onion, choped']
            };
            writeTestFile(env.files.ingredientsFile, [ing]);
            writeTestFile(env.files.recipesFile, [
                {
                    name: 'Salad',
                    categories: ['Side'],
                    ingredients: [
                        {ingredient: 'onion, choped', ingredientId: ing.id, quantity: '1', measure: 'cup'}
                    ],
                    instructions: ['Mix'],
                    macros: {calories: 50, protein: 1, carbs: 5, fat: 0}
                }
            ]);

            const res = await request(app)
                .put(`/api/ingredients/${ing.id}/aliases/0`)
                .send({newAlias: 'onion, chopped', updateRecipes: true});

            expect(res.status).toBe(200);
            expect(res.body.updatedRecipeCount).toBe(1);

            const recipes = readTestFile<Array<{name: string; ingredients: Array<{ingredient: string}>}>>(env.files.recipesFile);
            expect(recipes[0].ingredients[0].ingredient).toBe('onion, chopped');
        });

        it('rejects new alias that conflicts with another ingredient', async () => {
            const {app} = env;
            const garlicWithAlias = { ...sampleIngredient, aliases: ['garlic clove'] };
            writeTestFile(env.files.ingredientsFile, [
                garlicWithAlias,
                {id: '550e8400-e29b-41d4-a716-446655440103', name: 'onion', storeSectionId: PRODUCE_SECTION_ID, aliases: ['red onion']}
            ]);

            const res = await request(app)
                .put(`/api/ingredients/${sampleIngredient.id}/aliases/0`)
                .send({newAlias: 'onion', updateRecipes: false});

            expect(res.status).toBe(400);
            expect(res.body.error).toContain('conflicts');
        });

        it('appends new alias when index equals current aliases length', async () => {
            const {app} = env;
            const ing = {
                id: '550e8400-e29b-41d4-a716-446655440106',
                name: 'parsley',
                storeSectionId: PRODUCE_SECTION_ID,
                aliases: ['fresh parsley']
            };
            writeTestFile(env.files.ingredientsFile, [ing]);

            const res = await request(app)
                .put(`/api/ingredients/${ing.id}/aliases/1`)
                .send({newAlias: 'flat-leaf parsley', updateRecipes: false});

            expect(res.status).toBe(200);
            expect(res.body.aliases).toHaveLength(2);
            expect(res.body.aliases[0]).toBe('fresh parsley');
            expect(res.body.aliases[1]).toBe('flat-leaf parsley');
        });
    });

    describe('DELETE /api/ingredients/:id/aliases/:aliasIndex', () => {
        it('removes alias when not used in recipes', async () => {
            const {app} = env;
            writeTestFile(env.files.ingredientsFile, [sampleIngredientWithAliases]);

            const res = await request(app).delete(
                `/api/ingredients/${sampleIngredientWithAliases.id}/aliases/0`
            );

            expect(res.status).toBe(200);
            expect(res.body.aliases).not.toContain('boneless chicken breast');
            expect(res.body.aliases).toContain('chicken breast, skinless');
        });

        it('updates recipes when useCanonicalName=true', async () => {
            const {app} = env;
            const ing = {
                id: '550e8400-e29b-41d4-a716-446655440104',
                name: 'milk',
                storeSectionId: DAIRY_SECTION_ID,
                aliases: ['whole milk']
            };
            writeTestFile(env.files.ingredientsFile, [ing]);
            writeTestFile(env.files.recipesFile, [
                {
                    name: 'Pudding',
                    categories: ['Dessert'],
                    ingredients: [
                        {ingredient: 'whole milk', ingredientId: ing.id, quantity: '2', measure: 'cups'}
                    ],
                    instructions: ['Stir'],
                    macros: {calories: 200, protein: 8, carbs: 20, fat: 8}
                }
            ]);

            const res = await request(app)
                .delete(`/api/ingredients/${ing.id}/aliases/0`)
                .query({useCanonicalName: 'true'});

            expect(res.status).toBe(200);
            const recipes = readTestFile<Array<{ingredients: Array<{ingredient: string}>}>>(env.files.recipesFile);
            expect(recipes[0].ingredients[0].ingredient).toBe('milk');
            const ingredients = readTestFile<Array<{id: string; aliases?: string[]}>>(env.files.ingredientsFile);
            expect(ingredients[0].aliases).toBeUndefined();
        });
    });

    describe('POST /api/ingredients/:id/aliases/merge', () => {
        it('merges source alias into target and updates recipes', async () => {
            const {app} = env;
            const ing = {
                id: '550e8400-e29b-41d4-a716-446655440105',
                name: 'onion',
                storeSectionId: PRODUCE_SECTION_ID,
                aliases: ['onion, choped', 'onion, chopped', 'yellow onion']
            };
            writeTestFile(env.files.ingredientsFile, [ing]);
            writeTestFile(env.files.recipesFile, [
                {
                    name: 'Stir Fry',
                    categories: ['Dinner'],
                    ingredients: [
                        {ingredient: 'onion, choped', ingredientId: ing.id, quantity: '1', measure: 'large'}
                    ],
                    instructions: ['Fry'],
                    macros: {calories: 80, protein: 1, carbs: 10, fat: 2}
                }
            ]);

            const res = await request(app)
                .post(`/api/ingredients/${ing.id}/aliases/merge`)
                .send({sourceAliasIndex: 0, targetAliasIndex: 1});

            expect(res.status).toBe(200);
            expect(res.body.updatedRecipeCount).toBe(1);
            expect(res.body.ingredient.aliases).not.toContain('onion, choped');
            expect(res.body.ingredient.aliases).toContain('onion, chopped');

            const recipes = readTestFile<Array<{ingredients: Array<{ingredient: string}>}>>(env.files.recipesFile);
            expect(recipes[0].ingredients[0].ingredient).toBe('onion, chopped');
        });

        it('merges source alias into canonical name when targetAliasIndex is canonical', async () => {
            const {app} = env;
            const ing = {
                id: '550e8400-e29b-41d4-a716-446655440106',
                name: 'tomato',
                storeSectionId: PRODUCE_SECTION_ID,
                aliases: ['tomatoes, diced']
            };
            writeTestFile(env.files.ingredientsFile, [ing]);
            writeTestFile(env.files.recipesFile, [
                {
                    name: 'Salsa',
                    categories: ['Side'],
                    ingredients: [
                        {ingredient: 'tomatoes, diced', ingredientId: ing.id, quantity: '2', measure: 'cups'}
                    ],
                    instructions: ['Chop'],
                    macros: {calories: 40, protein: 2, carbs: 8, fat: 0}
                }
            ]);

            const res = await request(app)
                .post(`/api/ingredients/${ing.id}/aliases/merge`)
                .send({sourceAliasIndex: 0, targetAliasIndex: 'canonical'});

            expect(res.status).toBe(200);
            expect(res.body.ingredient.aliases === undefined || res.body.ingredient.aliases?.length === 0).toBe(true);
            const recipes = readTestFile<Array<{ingredients: Array<{ingredient: string}>}>>(env.files.recipesFile);
            expect(recipes[0].ingredients[0].ingredient).toBe('tomato');
        });
    });

    describe('Permission checks', () => {
        it('allows Viewer to read ingredients', async () => {
            const {app} = env;
            writeTestFile(env.files.usersFile, [
                {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Viewer'}
            ]);
            writeTestFile(env.files.ingredientsFile, [sampleIngredient]);

            const res = await request(app).get('/api/ingredients');
            expect(res.status).toBe(200);
        });

        it('blocks Viewer from creating ingredients', async () => {
            const {app} = env;
            writeTestFile(env.files.usersFile, [
                {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Viewer'}
            ]);

            const res = await request(app)
                .post('/api/ingredients')
                .send({name: 'onion', storeSectionId: PRODUCE_SECTION_ID});

            expect(res.status).toBe(403);
        });

        it('allows Editor to create ingredients', async () => {
            const {app} = env;
            writeTestFile(env.files.usersFile, [
                {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Editor'}
            ]);

            const res = await request(app)
                .post('/api/ingredients')
                .send({name: 'onion', storeSectionId: PRODUCE_SECTION_ID});

            expect(res.status).toBe(201);
        });

        it('allows Admin to create ingredients', async () => {
            const {app} = env;
            writeTestFile(env.files.usersFile, [
                {username: 'testuser', password: '$2a$10$hashedpassword', tier: 'Admin'}
            ]);

            const res = await request(app)
                .post('/api/ingredients')
                .send({name: 'onion', storeSectionId: PRODUCE_SECTION_ID});

            expect(res.status).toBe(201);
        });
    });
});
