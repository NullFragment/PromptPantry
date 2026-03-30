import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { importRecipeFromHtml } from '../../src/utils/recipeImporter.js';

const fixture = (name: string) =>
    readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('WPRM parser', () => {
    it('extracts recipe name', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        expect(typeof result.name).toBe('string');
        expect(result.name!.length).toBeGreaterThan(0);
    });

    it('extracts servings as a number', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        expect(typeof result.servings).toBe('number');
        expect(result.servings).toBeGreaterThan(0);
    });

    it('extracts prepTime and cookTime as numeric strings', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        expect(result.prepTime).toMatch(/^\d+$/);
        expect(result.cookTime).toMatch(/^\d+$/);
    });

    it('extracts ingredients with ingredient name', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        const flat = (result.ingredients as any[]).flatMap((i: any) =>
            'ingredients' in i ? i.ingredients : [i]
        );
        expect(flat.length).toBeGreaterThan(0);
        expect(flat[0].ingredient).toBeTruthy();
    });

    it('extracts instructions', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        const flat = Array.isArray(result.instructions)
            ? result.instructions
            : (result.instructions as any[]).flatMap((g: any) => g.steps ?? []);
        expect(flat.length).toBeGreaterThan(0);
    });

    it('defaults macros to zeros when nutrition absent', () => {
        const result = importRecipeFromHtml(fixture('wprm-damndelicious.html'));
        expect(result.macros).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it('parses macros from WPRM nutrition label shortcode outside the recipe card', () => {
        const result = importRecipeFromHtml(fixture('wprm-nutrition-shortcode.html'));
        expect(result.macros).toEqual({ calories: 116, protein: 5, carbs: 10, fat: 6 });
    });

    it('preserves named ingredient groups as IngredientGroup[]', () => {
        const result = importRecipeFromHtml(fixture('wprm-grouped.html'));
        const groups = result.ingredients as import('../../src/types').IngredientGroup[];
        expect(groups).toHaveLength(2);
        expect(groups[0].name).toBe('Marinade');
        expect(groups[0].ingredients).toHaveLength(2);
        expect(groups[0].ingredients[0].ingredient).toBe('plain yogurt');
        expect(groups[1].name).toBe('Sauce');
        expect(groups[1].ingredients).toHaveLength(2);
    });

    it('preserves named instruction groups as InstructionGroup[]', () => {
        const result = importRecipeFromHtml(fixture('wprm-grouped.html'));
        const groups = result.instructions as import('../../src/types').InstructionGroup[];
        expect(groups).toHaveLength(2);
        expect(groups[0].name).toBe('Marinate');
        expect(groups[0].steps).toHaveLength(2);
        expect(groups[1].name).toBe('Make Sauce');
        expect(groups[1].steps).toHaveLength(2);
    });

    it('returns flat arrays when only one unnamed ingredient group', () => {
        const result = importRecipeFromHtml(fixture('wprm-damndelicious.html'));
        expect(Array.isArray(result.ingredients)).toBe(true);
        expect('ingredients' in (result.ingredients as unknown[])[0]).toBe(false);
    });
});
