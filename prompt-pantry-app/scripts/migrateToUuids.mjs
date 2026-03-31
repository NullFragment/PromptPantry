#!/usr/bin/env node
import { readFileSync, writeFileSync, renameSync } from 'fs';
import { resolve } from 'path';
import { randomUUID } from 'crypto';

const DATA_DIR = resolve(import.meta.dirname, '../../data');

function readJson(file) {
  const raw = readFileSync(resolve(DATA_DIR, file), 'utf8');
  return JSON.parse(raw);
}

function writeAtomic(file, data) {
  const dest = resolve(DATA_DIR, file);
  const tmp = dest + '.tmp';
  writeFileSync(tmp, JSON.stringify(data, null, 2) + '\n', 'utf8');
  renameSync(tmp, dest);
}

// ── Load all files ────────────────────────────────────────────────────────────

const sections = readJson('storeSections.json');
const recipes = readJson('recipes.json');
const ingredients = readJson('ingredients.json');
const mealPlan = readJson('mealPlan.json');
const cookPlan = readJson('multiWeeklyCookPlan.json');

const warnings = [];

// ── Step 1: Assign UUIDs to store sections ────────────────────────────────────

const unassignedSection = sections.find(s => s.name === 'Unassigned');
if (!unassignedSection) {
  console.error('ERROR: "Unassigned" section not found in storeSections.json. Aborting.');
  process.exit(1);
}

const dupSection = sections.find((s, i) => sections.findIndex(x => x.name === s.name) !== i);
if (dupSection) {
  console.error(`ERROR: duplicate section name "${dupSection.name}". Aborting.`);
  process.exit(1);
}

const dupRecipe = recipes.find((r, i) => recipes.findIndex(x => x.name === r.name) !== i);
if (dupRecipe) {
  console.error(`ERROR: duplicate recipe name "${dupRecipe.name}". Aborting.`);
  process.exit(1);
}

let sectionsAssigned = 0;
for (const section of sections) {
  if (!section.id) {
    section.id = randomUUID();
    sectionsAssigned++;
  }
}

const sectionNameToId = Object.fromEntries(sections.map(s => [s.name, s.id]));
const unassignedId = sectionNameToId['Unassigned'];

// ── Step 2: Assign UUIDs to recipes ──────────────────────────────────────────

let recipesAssigned = 0;
for (const recipe of recipes) {
  if (!recipe.id) {
    recipe.id = randomUUID();
    recipesAssigned++;
  }
}

const recipeNameToId = Object.fromEntries(recipes.map(r => [r.name, r.id]));

// ── Step 3: Update recipes — set baseRecipeId ─────────────────────────────────

let baseRecipeLinked = 0;
for (const recipe of recipes) {
  if (recipe.baseRecipeName) {
    const baseId = recipeNameToId[recipe.baseRecipeName];
    if (baseId) {
      recipe.baseRecipeId = baseId;
      baseRecipeLinked++;
    } else {
      warnings.push(`Recipe "${recipe.name}": baseRecipeName "${recipe.baseRecipeName}" not found in recipes`);
    }
  }
}

// ── Step 4: Update ingredients — set storeSectionId ──────────────────────────

let ingredientsLinked = 0;
for (const ingredient of ingredients) {
  const sectionId = sectionNameToId[ingredient.storeSection];
  if (sectionId) {
    ingredient.storeSectionId = sectionId;
    ingredientsLinked++;
  } else {
    warnings.push(`Ingredient "${ingredient.name}": storeSection "${ingredient.storeSection}" not found; using Unassigned`);
    ingredient.storeSectionId = unassignedId;
  }
}

// ── Step 5: Update mealPlan — set recipeId on compact slots ──────────────────
// Structure: { "YYYY-MM-DD": { "breakfast": [...], "lunch": [...], ... } }
// Compact slot: has recipeName string, no nested recipe object

let mealSlotsLinked = 0;
for (const [date, dayPlan] of Object.entries(mealPlan)) {
  for (const [mealType, slots] of Object.entries(dayPlan)) {
    if (!Array.isArray(slots)) continue;
    for (const slot of slots) {
      if (slot.recipeName && !slot.recipe) {
        const recipeId = recipeNameToId[slot.recipeName];
        if (recipeId) {
          slot.recipeId = recipeId;
          mealSlotsLinked++;
        } else {
          warnings.push(`mealPlan ${date}/${mealType}: recipeName "${slot.recipeName}" not found in recipes`);
        }
      }
    }
  }
}

// ── Step 6: Update multiWeeklyCookPlan — set recipeId ────────────────────────
// Structure: { "YYYY-MM-DD": { "instanceId": { recipeName, servings, multiplier, ... } } }

let cookPlanItemsLinked = 0;
for (const [date, dayPlan] of Object.entries(cookPlan)) {
  for (const [instanceId, item] of Object.entries(dayPlan)) {
    if (item.recipeName) {
      const recipeId = recipeNameToId[item.recipeName];
      if (recipeId) {
        item.recipeId = recipeId;
        cookPlanItemsLinked++;
      } else {
        warnings.push(`multiWeeklyCookPlan ${date}/${instanceId}: recipeName "${item.recipeName}" not found in recipes`);
      }
    }
  }
}

// ── Write all files atomically ────────────────────────────────────────────────

writeAtomic('storeSections.json', sections);
writeAtomic('recipes.json', recipes);
writeAtomic('ingredients.json', ingredients);
writeAtomic('mealPlan.json', mealPlan);
writeAtomic('multiWeeklyCookPlan.json', cookPlan);

// ── Summary ───────────────────────────────────────────────────────────────────

console.log('\n=== UUID Migration Complete ===\n');
console.log(`Store sections : ${sections.length} total, ${sectionsAssigned} new UUIDs assigned`);
console.log(`Recipes        : ${recipes.length} total, ${recipesAssigned} new UUIDs assigned, ${baseRecipeLinked} base recipe links set`);
console.log(`Ingredients    : ${ingredients.length} total, ${ingredientsLinked} storeSectionId fields set`);
console.log(`Meal slots     : ${mealSlotsLinked} compact slots linked to recipe UUIDs`);
console.log(`Cook plan items: ${cookPlanItemsLinked} items linked to recipe UUIDs`);

if (warnings.length > 0) {
  console.log(`\n⚠️  Warnings (${warnings.length}):`);
  for (const w of warnings) {
    console.warn('  ' + w);
  }
} else {
  console.log('\nNo warnings.');
}
