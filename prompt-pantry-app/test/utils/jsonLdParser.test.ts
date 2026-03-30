import { readFileSync } from 'fs';
import { join } from 'path';
import { describe, expect, it } from 'vitest';
import { importRecipeFromHtml } from '../../src/utils/recipeImporter.js';

const fixture = (name: string) =>
    readFileSync(join(__dirname, '../fixtures', name), 'utf-8');

describe('JSON-LD parser', () => {
    it('extracts recipe name from food.com fixture', () => {
        const result = importRecipeFromHtml(fixture('jsonld-food-com.html'));
        expect(typeof result.name).toBe('string');
        expect(result.name.length).toBeGreaterThan(0);
    });

    it('extracts servings as a number', () => {
        const result = importRecipeFromHtml(fixture('jsonld-food-com.html'));
        expect(typeof result.servings).toBe('number');
        expect(result.servings).toBeGreaterThan(0);
    });

    it('parses ISO 8601 duration to numeric string', () => {
        const html = `<script type="application/ld+json">
            {"@type":"Recipe","name":"Test","prepTime":"PT30M","cookTime":"PT1H15M",
             "recipeIngredient":["1 cup flour"],"recipeInstructions":["Mix"]}
        </script>`;
        const result = importRecipeFromHtml(html);
        expect(result.prepTime).toBe('30');
        expect(result.cookTime).toBe('75');
    });

    it('handles @graph nesting', () => {
        const html = `<script type="application/ld+json">
            {"@graph":[{"@type":"WebPage"},{"@type":"Recipe","name":"Nested","prepTime":"PT10M",
             "recipeIngredient":["1 egg"],"recipeInstructions":["Cook"]}]}
        </script>`;
        const result = importRecipeFromHtml(html);
        expect(result.name).toBe('Nested');
    });

    it('extracts HowToStep instructions', () => {
        const result = importRecipeFromHtml(fixture('jsonld-food-com.html'));
        const instructions = Array.isArray(result.instructions)
            ? result.instructions
            : (result.instructions as any[]).flatMap((g: any) => g.steps ?? []);
        expect(instructions.length).toBeGreaterThan(0);
        expect(typeof instructions[0]).toBe('string');
    });

    it('extracts ingredients', () => {
        const result = importRecipeFromHtml(fixture('jsonld-food-com.html'));
        const ingredients = Array.isArray(result.ingredients)
            ? result.ingredients
            : (result.ingredients as any[]).flatMap((g: any) => g.items ?? []);
        expect(ingredients.length).toBeGreaterThan(0);
    });

    it('defaults categories to ["Misc"]', () => {
        const result = importRecipeFromHtml(fixture('jsonld-food-com.html'));
        expect(result.categories).toEqual(['Misc']);
    });

    it('defaults macros to zeros when nutrition absent', () => {
        const result = importRecipeFromHtml(fixture('jsonld-food-com.html'));
        expect(result.macros).toEqual({ calories: 0, protein: 0, carbs: 0, fat: 0 });
    });

    it('preserves HowToSection grouping as InstructionGroup[]', () => {
        const result = importRecipeFromHtml(fixture('jsonld-sections.html'));
        const groups = result.instructions as import('../../src/types').InstructionGroup[];
        expect(groups).toHaveLength(2);
        expect(groups[0].name).toBe('Make the Meat Sauce');
        expect(groups[0].steps).toHaveLength(2);
        expect(groups[0].steps[0]).toBe('Brown the ground beef in a large skillet.');
        expect(groups[1].name).toBe('Assemble and Bake');
        expect(groups[1].steps).toHaveLength(2);
    });

    it('returns flat instructions when no HowToSection present', () => {
        const result = importRecipeFromHtml(fixture('jsonld-food-com.html'));
        expect(Array.isArray(result.instructions)).toBe(true);
        if (result.instructions.length > 0) {
            expect(typeof result.instructions[0]).toBe('string');
        }
    });
});
