import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { importRecipeFromHtml } from '../../src/utils/recipeImporter.js';

const fixture = (name: string) =>
    readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('Tasty Recipes parser', () => {
    it('extracts recipe name', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(typeof result.name).toBe('string');
        expect(result.name.length).toBeGreaterThan(0);
    });

    it('extracts servings as a number from data-amount', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(typeof result.servings).toBe('number');
        expect(result.servings).toBeGreaterThan(0);
    });

    it('extracts prepTime and cookTime as numeric strings', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(result.prepTime).toMatch(/^\d+$/);
        expect(result.cookTime).toMatch(/^\d+$/);
    });

    it('extracts at least one ingredient', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        const ingredients = Array.isArray(result.ingredients)
            ? result.ingredients
            : (result.ingredients as any[]).flatMap((g: any) => g.items ?? []);
        expect(ingredients.length).toBeGreaterThan(0);
    });

    it('extracts ingredient with ingredient name field', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        const ingredients = Array.isArray(result.ingredients)
            ? result.ingredients
            : (result.ingredients as any[]).flatMap((g: any) => g.items ?? []);
        const first = ingredients[0] as any;
        expect(first.ingredient).toBeTruthy();
    });

    it('extracts at least one instruction', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        const instructions = Array.isArray(result.instructions)
            ? result.instructions
            : (result.instructions as any[]).flatMap((g: any) => g.steps ?? []);
        expect(instructions.length).toBeGreaterThan(0);
    });

    it('defaults categories to ["Misc"]', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(result.categories).toEqual(['Misc']);
    });

    it('defaults macros to zeros when nutrition absent', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(result.macros).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });
});
