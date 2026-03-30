import type { Recipe } from '../types';
import { flattenIngredients, flattenInstructions } from './recipeUtils';

export interface ValidationError {
    field: string;
    message: string;
}

export function validateRecipe(recipe: Partial<Recipe>): ValidationError[] {
    const errors: ValidationError[] = [];

    if (!recipe.name?.trim()) {
        errors.push({ field: 'name', message: 'Recipe name is required.' });
    }

    if (!recipe.categories?.length) {
        errors.push({ field: 'categories', message: 'At least one category is required.' });
    }

    const allIngredients = flattenIngredients(recipe.ingredients ?? []);
    const unlinked = allIngredients.filter(i => !i.ingredientId);
    if (unlinked.length > 0) {
        const names = unlinked.map(i => i.ingredient).join(', ');
        errors.push({
            field: 'ingredients',
            message: `The following ingredients must be linked before saving: ${names}.`,
        });
    }

    const instructions = flattenInstructions(recipe.instructions ?? []);
    if (instructions.length === 0) {
        errors.push({ field: 'instructions', message: 'At least one instruction step is required.' });
    }

    const macros = recipe.macros ?? ({} as Record<string, unknown>);
    (['calories', 'protein', 'carbs', 'fat'] as const).forEach(key => {
        if (isNaN(Number(macros[key]))) {
            errors.push({ field: `macros.${key}`, message: `${key} must be a number.` });
        }
    });

    return errors;
}
