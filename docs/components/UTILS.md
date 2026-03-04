# Shared Utilities

Utility modules used across multiple components and hooks.

## apiRequest (`src/utils/apiRequest.ts`)

Typed fetch wrapper for all API communication.

| Function                          | Purpose                                              |
|-----------------------------------|------------------------------------------------------|
| `apiRequest<T>(url, options?)`    | Fetch with error handling; returns parsed JSON `T`   |
| `apiJson<T>(url, method, body?)`  | Convenience wrapper for JSON POST/PUT/DELETE requests |

Both functions throw on non-OK responses with the error message from the response body.

## mealPlanUtils (`src/utils/mealPlanUtils.ts`)

Meal plan calculations, UUID generation, and cook tracking.

| Function / Constant                                     | Purpose                                              |
|---------------------------------------------------------|------------------------------------------------------|
| `ALL_MEAL_TYPES`                                        | `['breakfast', 'lunch', 'dinner', 'snacks', 'drinks']` |
| `generateUUID()`                                        | Generate a v4-style UUID                             |
| `isTransferredItem(item)`                               | Check if a cook plan item was transferred from another week |
| `findRecipeInstances(cookPlan, recipeName)`             | Find all instances of a recipe in a week's cook plan |
| `findBaseRecipeInstance(cookPlan, recipeName)`           | Find the non-transferred instance                    |
| `getOriginalSourceWeek(multiPlan, weekStart, instanceId)` | Trace a transferred item back to its origin week  |
| `getAllMealsForDay(dayPlan, participants?)`              | Get all meal slots for a day                         |
| `calculateDayTotals(dayPlan, participants?)`             | Sum macros for a day's meals                         |
| `calculateParticipantTargets(participant)`               | Compute calorie/macro targets from participant profile |
| `getParticipantStatus(current, target)`                  | Status color and diff percentage for progress display |
| `isRecipeFitForParticipant(recipe, participant, ...)`    | Check if a recipe fits a participant's remaining needs |
| `getUsedServingsForWeek(mealPlan, recipeName, weekStart)` | Count used servings in a specific week             |
| `getRecipeCookCount(multiPlan, mealPlan, recipeName)`    | Total cook count across all weeks                   |
| `dehydrateMealPlan(mealPlan)`                            | Convert full MealPlan to compact storage format      |
| `hydrateMealPlan(compact, recipes)`                      | Convert compact storage format to full MealPlan      |
| `isCompactMealPlan(plan)`                                | Check if a plan is in compact format                 |

## recipeUtils (`src/utils/recipeUtils.ts`)

Recipe ingredient and measurement utilities.

| Function                                               | Purpose                                              |
|--------------------------------------------------------|------------------------------------------------------|
| `flattenIngredients(ingredients)`                      | Flatten grouped ingredients into a flat list         |
| `flattenInstructions(instructions)`                    | Flatten grouped instructions into a flat list        |
| `renderMeasurement(ingredient, system)`                | Render a single measurement in the selected unit system |
| `renderMeasurementWithConversion(ingredient, system, ingredientDef)` | Render with ingredient-specific unit conversion |
| `normalizeIngredientName(name)`                        | Normalize name for comparison (lowercase, trim, strip prep notes) |
| `extractMeasureFromName(name)`                         | Extract quantity and measure embedded in ingredient name |
| `parseQuantity(quantity)`                              | Parse fractional quantities (e.g., "1 1/2" -> 1.5)  |
| `aggregateIngredients(items)`                          | Aggregate ingredients by normalized name             |
| `renderAggregatedMeasurement(totals, system)`          | Render combined measurements from aggregation        |
| `getPrimaryQuantityAndUnit(ingredient, system)`        | Get the primary quantity/unit for a given unit system |
| `resolveCanonicalName(ingredientName, ingredientDefs)` | Resolve an ingredient name (or alias) to its canonical name |
| `getIngredientStoreSection(ingredientName, ingredientDefs)` | Look up the store section for an ingredient     |

## unitConversions (`src/utils/unitConversions.ts`)

Volume, weight, and portion unit conversions.

| Function                                    | Purpose                                              |
|---------------------------------------------|------------------------------------------------------|
| `convertVolume(qty, fromUnit, toUnit)`      | Convert between volume units (cups, tbsp, tsp, ml, L, etc.) |
| `convertWeight(qty, fromUnit, toUnit)`      | Convert between weight units (g, kg, oz, lb, etc.)   |
| `convertUsingIngredient(qty, unit, target, ingredientDef)` | Convert using ingredient-specific ratios (weightToVolume, portionToVolume) |
| `isVolumeUnit(unit)`                        | Check if a unit is a volume unit                     |
| `isWeightUnit(unit)`                        | Check if a unit is a weight unit                     |
| `isMetricUnit(unit)`                        | Check if a unit belongs to the metric system         |
| `isImperialUnit(unit)`                      | Check if a unit belongs to the imperial system       |
| `normalizeToPreferredUnit(qty, unit, system)` | Normalize a quantity to the preferred unit for display |

## containerUtils (`src/utils/containerUtils.ts`)

Container size calculations for shopping list display.

| Function                                     | Purpose                                              |
|----------------------------------------------|------------------------------------------------------|
| `calculateContainerNeeds(totalQty, unit, containerSizes)` | Calculate how many of each container size are needed |
| `formatContainerRecommendation(needs)`       | Format container needs into a display string         |

## storeSectionUtils (`src/utils/storeSectionUtils.ts`)

Store section normalization and sorting.

| Function                                | Purpose                                              |
|-----------------------------------------|------------------------------------------------------|
| `toTitleCase(str)`                      | Convert string to Title Case                         |
| `sortSectionsWithUnassignedLast(sections)` | Sort sections alphabetically with "Unassigned" last |
| `normalizeStoreSection(section)`        | Normalize section name for comparison                |

## ingredientFormUtils (`src/utils/ingredientFormUtils.ts`)

Ingredient form validation and payload building.

| Function                                | Purpose                                              |
|-----------------------------------------|------------------------------------------------------|
| `validateAliases(aliases)`              | Validate alias list (no duplicates, no empty strings)|
| `buildIngredientPayload(formData)`      | Build API payload from ingredient edit form data     |

## Constants & Types

- `ALL_MEAL_TYPES` is the single source of truth for meal slot types used throughout planners, utilities, and schemas
- Unit enums and type definitions live in `src/types.ts`
- See `schemas/` for the canonical data validation definitions
