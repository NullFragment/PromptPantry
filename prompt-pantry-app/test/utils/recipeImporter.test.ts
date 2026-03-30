import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { importRecipeFromHtml } from '../../src/utils/recipeImporter.js';

const fixture = (name: string) =>
    readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('importRecipeFromHtml - detection', () => {
    it('throws when no recipe framework is found', () => {
        expect(() => importRecipeFromHtml('<html><body>no recipe here</body></html>'))
            .toThrow(/no recipe/i);
    });

    it('detects WPRM from fixture', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        expect(result.name).toBeTruthy();
        expect(result.ingredients).toBeDefined();
    });

    it('detects Tasty Recipes from fixture', () => {
        const result = importRecipeFromHtml(fixture('tasty-recipes-gimmesomeoven.html'));
        expect(result.name).toBeTruthy();
    });

    it('defaults categories to ["Misc"] for all frameworks', () => {
        const result = importRecipeFromHtml(fixture('wprm-howsweeteats.html'));
        expect(result.categories).toEqual(['Misc']);
    });

    it('defaults macros to zeros when not present', () => {
        const result = importRecipeFromHtml(fixture('wprm-damndelicious.html'));
        expect(result.macros).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it('prepends "Imported from: <url>" to notes when sourceUrl is provided', () => {
        const result = importRecipeFromHtml(
            fixture('wprm-howsweeteats.html'),
            'https://example.com/recipe'
        );
        expect(result.notes).toMatch(/^Imported from: https:\/\/example\.com\/recipe/);
    });
});
