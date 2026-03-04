import {describe, expect, it} from 'vitest';
import Ajv from 'ajv/dist/2020.js';
import addFormats from 'ajv-formats';
import fs from 'fs';
import path from 'path';

const ajv = new Ajv({allErrors: true, strict: false});
addFormats(ajv);

const schemaPath = path.join(__dirname, '../../..', 'schemas', 'ingredient.schema.json');
const schema = JSON.parse(fs.readFileSync(schemaPath, 'utf8'));
const validate = ajv.compile(schema);

describe('ingredient.schema.json', () => {
    describe('valid ingredients', () => {
        it('accepts a minimal valid ingredient', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440000',
                name: 'garlic',
                storeSection: 'Produce'
            };
            const valid = validate(ingredient);
            expect(valid).toBe(true);
            expect(validate.errors).toBeNull();
        });

        it('accepts an ingredient with aliases', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440001',
                name: 'garlic',
                storeSection: 'Produce',
                aliases: ['garlic, minced', 'garlic clove', 'garlic, chopped']
            };
            const valid = validate(ingredient);
            expect(valid).toBe(true);
            expect(validate.errors).toBeNull();
        });

        it('accepts an ingredient with weight to volume conversion', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440002',
                name: 'flour',
                storeSection: 'Baking',
                conversions: {
                    weightToVolume: {
                        weight: {quantity: 120, unit: 'g'},
                        volume: {quantity: 1, unit: 'cup'}
                    }
                }
            };
            const valid = validate(ingredient);
            expect(valid).toBe(true);
            expect(validate.errors).toBeNull();
        });

        it('accepts an ingredient with portion to volume conversion', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440003',
                name: 'garlic',
                storeSection: 'Produce',
                conversions: {
                    portionToVolume: {
                        portion: {quantity: 1, description: 'clove'},
                        volume: {quantity: 1, unit: 'tsp'}
                    }
                }
            };
            const valid = validate(ingredient);
            expect(valid).toBe(true);
            expect(validate.errors).toBeNull();
        });

        it('accepts an ingredient with both conversions', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440004',
                name: 'butter',
                storeSection: 'Dairy',
                aliases: ['unsalted butter', 'salted butter'],
                conversions: {
                    weightToVolume: {
                        weight: {quantity: 113, unit: 'g'},
                        volume: {quantity: 0.5, unit: 'cup'}
                    },
                    portionToVolume: {
                        portion: {quantity: 1, description: 'stick'},
                        volume: {quantity: 0.5, unit: 'cup'}
                    }
                }
            };
            const valid = validate(ingredient);
            expect(valid).toBe(true);
            expect(validate.errors).toBeNull();
        });

        it('accepts Unassigned as a store section', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440005',
                name: 'mystery ingredient',
                storeSection: 'Unassigned'
            };
            const valid = validate(ingredient);
            expect(valid).toBe(true);
            expect(validate.errors).toBeNull();
        });

        it('accepts valid containerSizes', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440020',
                name: 'milk',
                storeSection: 'Dairy',
                containerSizes: [
                    { quantity: 3.78, unit: 'l', label: 'gallon' },
                    { quantity: 1.89, unit: 'l', label: 'half gallon' },
                    { quantity: 1, unit: 'l' }
                ]
            };
            const valid = validate(ingredient);
            expect(valid).toBe(true);
            expect(validate.errors).toBeNull();
        });
    });

    describe('invalid ingredients', () => {
        it('rejects an ingredient without id', () => {
            const ingredient = {
                name: 'garlic',
                storeSection: 'Produce'
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
            expect(validate.errors?.some(e => e.message?.includes('id'))).toBe(true);
        });

        it('rejects an ingredient without name', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440006',
                storeSection: 'Produce'
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('rejects an ingredient without storeSection', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440007',
                name: 'garlic'
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('rejects an ingredient with empty name', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440008',
                name: '',
                storeSection: 'Produce'
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('rejects an ingredient with empty storeSection', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440009',
                name: 'garlic',
                storeSection: ''
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('rejects invalid UUID format for id', () => {
            const ingredient = {
                id: 'not-a-valid-uuid',
                name: 'garlic',
                storeSection: 'Produce'
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('rejects empty alias in aliases array', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440010',
                name: 'garlic',
                storeSection: 'Produce',
                aliases: ['garlic, minced', '']
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('rejects conversion with zero quantity', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440011',
                name: 'flour',
                storeSection: 'Baking',
                conversions: {
                    weightToVolume: {
                        weight: {quantity: 0, unit: 'g'},
                        volume: {quantity: 1, unit: 'cup'}
                    }
                }
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('rejects conversion with negative quantity', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440012',
                name: 'flour',
                storeSection: 'Baking',
                conversions: {
                    weightToVolume: {
                        weight: {quantity: -100, unit: 'g'},
                        volume: {quantity: 1, unit: 'cup'}
                    }
                }
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('rejects conversion with empty unit', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440013',
                name: 'flour',
                storeSection: 'Baking',
                conversions: {
                    weightToVolume: {
                        weight: {quantity: 120, unit: ''},
                        volume: {quantity: 1, unit: 'cup'}
                    }
                }
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('rejects containerSizes with missing quantity', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440021',
                name: 'milk',
                storeSection: 'Dairy',
                containerSizes: [{ unit: 'l', label: 'gallon' }]
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });

        it('rejects containerSizes with missing unit', () => {
            const ingredient = {
                id: '550e8400-e29b-41d4-a716-446655440022',
                name: 'milk',
                storeSection: 'Dairy',
                containerSizes: [{ quantity: 3.78, label: 'gallon' }]
            };
            const valid = validate(ingredient);
            expect(valid).toBe(false);
            expect(validate.errors).toBeDefined();
        });
    });
});

