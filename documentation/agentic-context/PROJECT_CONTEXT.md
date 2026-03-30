# Project Context

Reference document capturing project state, architectural decisions, and continuity information for PromptPantry.

**Last updated:** March 2026

---

## Table of Contents

- [Implementation Status](#implementation-status)
- [Architecture Decisions](#architecture-decisions)
- [Deferred Items](#deferred-items)
- [Domain Model Reference](#domain-model-reference)

---

## Implementation Status

| Area                   | Description                                                               | Status      |
|------------------------|---------------------------------------------------------------------------|-------------|
| Core Recipe Management | CRUD, variants, JSON editor, recipe modal                                 | Complete    |
| Weekly Planner         | 7-day grid, drag-and-drop, batch cooking sidebar, leftover tracking       | Complete    |
| Monthly Calendar       | Calendar view with daily nutritional totals and participant progress       | Complete    |
| Shopping List          | Ingredient aggregation from cook plan, store section grouping, conversions | Complete    |
| Ingredient Management  | Full CRUD, aliases, merging, store sections, container sizes              | Complete    |
| Ingredient Enrichment  | 208 ingredients enriched with sections/conversions; 19 retired            | Complete    |
| Participant Tracking   | Multi-participant profiles with macro goals and progress bars             | Complete    |
| Authentication         | JWT httpOnly cookie, bcrypt passwords, 7-day expiry                       | Complete    |
| Authorization (RBAC)   | Viewer / Editor / Admin tiers, server-side enforcement                    | Complete    |
| Admin Panel            | User management, settings, recipe audit, registration toggle              | Complete    |
| Dark Mode              | Full dark mode with `class` strategy via Tailwind                         | Complete    |
| Unit System            | Metric / imperial / both toggle, persisted per user                       | Complete    |
| Docker Deployment      | Docker Compose with Traefik labels, bind mount for data                   | Complete    |
| Documentation          | Architecture, component, and development docs                             | Complete    |
| Recipe Importer        | URL fetch + HTML paste fallback, WPRM/Tasty Recipes/JSON-LD parsers       | Complete    |
| Save Validation        | Client-side validation with unlinked-ingredient blocking                  | Complete    |
| Suggestion Algorithm   | Improved scoring with library-based matching, recency penalty, UI controls | Complete    |
| Recipe Audit Fixes     | 7 ⚠️ ingredient entries from enrichment need manual recipe fixes          | In Progress |

---

## Architecture Decisions

### Persistence

- **JSON file storage** chosen over a database — suited for single-user or small-team self-hosted deployments with no
  operational overhead.
- **Atomic writes** (write to `.tmp` then rename) used in `server/dataAccess.js` to prevent data corruption on crash.
- **AJV validation** runs on every save against `schemas/*.schema.json`.

### Authentication

- **JWT in httpOnly cookie** (7-day expiry) to avoid XSS exposure of tokens.
- **First-user-becomes-Admin** pattern — no bootstrap configuration needed.
- **Test auth bypass** (`req.user = testuser Admin`) enabled when `DEPLOYED` env var is unset; disabled automatically
  in Docker via `DEPLOYED=true`.

### Meal Plan Sync

- **Compact format** in `data/mealPlan.json` — stores only `{ recipeName, servings }` per slot.
- **Hydration on load** — `mealPlanUtils.ts` expands compact slots into full `MealSlot` objects by recipe name lookup.
- **localStorage seed** — if server returns empty meal plan but localStorage has data, the app seeds the server with
  the local copy (handles first-boot and data loss recovery).
- **Debounced API writes** — plan updates write to localStorage immediately and debounce the API PUT.

### Frontend State

- **Hook-per-concern** pattern — `useRecipes`, `useMealPlan`, `useIngredients`, `useUIState`, etc. Components never
  fetch directly.
- **`AppContext`** distributes `userTier`, `canEdit`, `unitSystem`, `advancedMode`, `darkMode` to descendants.
- **Server factory pattern** (`serverFactory.js`) creates the Express app with a configurable `DATA_DIR` — used by
  tests to get isolated data directories without touching `data/`.

### Recipe Variants

- A recipe with `baseRecipeName` is a variant. It inherits all ingredients and instructions from the base and extends
  them via `ingredientAdditions` / `instructionAdditions`.
- `recipeUtils.ts` resolves variants to their full form via `resolveVariantRecipe()`.

### Recipe Import & Parsing

- **Client-side parsing** via `DOMParser` — WPRM, Tasty Recipes, and JSON-LD formats detected in a chain. Avoids
  external parser dependencies and keeps import logic testable.
- **Server proxy for URL fetch** — avoids CORS errors. Client sends URL, server fetches the page with standard headers
  and returns raw HTML.
- **Fallback HTML paste** — when URL is unavailable or fails, users can paste HTML snippets directly for manual
  extraction.

### Save Validation

- **Client-side validation** runs before the API call in `RecipeEditForm`. Detects unlinked ingredients via
  `ingredientId` check and blocks saves with a user-facing modal.
- **Server-side schema validation** still runs as an integrity check but is not the primary validation gate.
- Validation is extracted to pure utilities (`recipeValidation.ts`) to enable unit testing independent of React.

### Suggestion Scoring

- **Pure utility function** (`suggestionScoring.ts`) implements scoring logic: name match (via string-distance library),
  recency penalty for older recipes, and category/tag weighting.
- **UI controls** in `RecipePicker` allow toggling recency penalty and limiting result count, enabling quick
  experimentation without code changes.
- Scoring is testable independently via unit tests on the pure function.

---

## Deferred Items

| Item                              | Reason                                              | Revisit When                      |
|-----------------------------------|-----------------------------------------------------|-----------------------------------|
| Recipe audit ⚠️ fixes (7 entries) | Requires manual review of affected recipes          | Next development session          |
| Multi-tenant account groups       | Significant architectural change, low priority      | Post-launch user feedback         |
| Grocery shopping integration      | Requires external API agreements or scraping        | Post-launch user feedback         |

---

## Domain Model Reference

- **Recipe**: Central content entity. Has ingredients (each optionally linked to an `IngredientDefinition` via UUID),
  instructions, nutritional info, tags, categories, ratings, and favorites. Variants extend a base recipe.
- **MealPlan**: Weekly schedule of `MealSlot` entries. Stored in compact format on disk; hydrated to full objects in
  memory. Keyed by date string and meal type.
- **MultiWeeklyCookPlan**: Multi-week batch cooking tracker. Recipes with multipliers and manual usage tracking.
  Source of truth for the shopping list.
- **IngredientDefinition**: Canonical ingredient with `name`, `aliases`, `storeSection`, `containerSizes`, and
  `conversions`. Referenced from recipe ingredients via UUID (`ingredientId`).
- **Participant**: Named user with macro goals (`calories`, `protein`, `carbs`, `fat`). Progress is computed from the
  meal plan.
- **User**: Auth entity with `username`, hashed `password`, and `tier` (`Viewer` | `Editor` | `Admin`).
- **Settings**: Application-wide config — `registrationEnabled`, `advancedMode`, `macroLimits`.
