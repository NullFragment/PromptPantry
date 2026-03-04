# Persistence

On-disk storage, data files, write patterns, and local backups.

## Data Files

All data is stored as JSON files under the `data/` directory. When running with Node directly, the path is configurable via the `DATA_DIR` env var (default `../data`). In Docker, the container path is fixed at `/app/data`, with the compose file mounting the host directory `/srv/prompt-pantry` to that path.

| File                       | Purpose                                  | Schema                          |
|----------------------------|------------------------------------------|---------------------------------|
| `recipes.json`             | Recipe definitions                       | `recipe.schema.json`            |
| `participants.json`        | Participant profiles and macro targets   | `participant.schema.json`       |
| `mealPlan.json`            | Daily meal plan (date → meal slots)      | `mealPlan.schema.json`          |
| `multiWeeklyCookPlan.json` | Weekly cook plan with batch tracking     | `multiWeeklyCookPlan.schema.json` |
| `ingredients.json`         | Ingredient definitions (aliases, store sections, conversions) | `ingredient.schema.json` |
| `users.json`               | User accounts (username, hashed password, tier) | `user.schema.json`        |
| `settings.json`            | App settings (registration, advancedMode, macroLimits) | (validated in code)   |

## Write Pattern

All file writes use an atomic two-step pattern to prevent data corruption:

1. Write data to a temporary file (`<filename>.tmp`)
2. Rename the temporary file to the final path

This ensures that a crash during write does not leave a half-written file.

## Read Behavior

- `readJsonFile(path, fallback)` reads and parses JSON; returns `fallback` on `ENOENT`
- Recipes are optionally filtered to valid-only (per schema) unless `includeInvalid` is requested
- Users are filtered to valid tiers (`Viewer`, `Editor`, `Admin`) on read
- Settings are merged with defaults for `macroLimits`
- Recipes and ingredients are sorted by name before save

## Schema Validation

All write endpoints validate payloads against JSON schemas in `schemas/` using AJV before persisting. The schemas
define:

- **recipe.schema.json**: name, categories, ingredients (flat or grouped with optional `ingredientId`), instructions
  (flat or grouped), macros, optional fields (prepTime, cookTime, servings, tags, videoLink, notes, rating, isFavorite)
- **ingredient.schema.json**: id (UUID), name, storeSection, optional aliases, containerSizes, conversions
  (weightToVolume, portionToVolume)
- **participant.schema.json**: name, optional icon, maintenanceCalories, calorieDeficit, macro percentages
- **user.schema.json**: username, password, tier (Viewer / Editor / Admin)
- **mealPlan.schema.json**: date-keyed object with meal type arrays (breakfast, lunch, dinner, snacks, drinks)
- **multiWeeklyCookPlan.schema.json**: week-start-keyed object with UUID-keyed recipe instances

## Client-Side Persistence

- `localStorage` stores backups of `mealPlan` and `multiWeeklyCookPlan` and user preferences (`darkMode`,
  `advancedMode`, `unitSystem`)
- On mount, `useMealPlan` hydrates from localStorage first, then fetches from the API
- If the server store is empty but localStorage has data, the client seeds the server with the local copy

## Legacy Formats

The app expects the current compact schemas as defined in the `schemas/` directory. Older persisted formats are not
automatically migrated at runtime.
