# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `prompt-pantry-app/`:

```bash
npm run dev          # Vite frontend (5173) + Express API (3001) concurrently
npm run build        # tsc + vite build → dist/
npm run lint         # ESLint (max-warnings: 50)
npm test             # Vitest (run once)
npm run test-interactive  # Vitest watch mode
npm run test:coverage     # Coverage report (68% branch threshold)
npm run server       # Express API only (port 3001)
```

Run a single test file:
```bash
npx vitest run test/mealPlanUtils.test.ts
```

## Architecture

The app is a full-stack TypeScript/React + Express monolith. All source lives under `prompt-pantry-app/`. The `schemas/` and `data/` directories are at the repo root and are shared by both frontend and backend.

**Data layer:**
- All persistence is JSON files in `data/` (no database).
- `server/dataAccess.js` handles all file I/O with atomic writes (`.tmp` → rename) and AJV validation against `schemas/*.schema.json` on every save.
- `serverFactory.js` creates the Express app with a configurable data directory — this is how tests get isolated data without touching `data/`.

**Compact ↔ full hydration (meal plan):**
- `data/mealPlan.json` stores only `{ recipeName, servings }` per slot (compact format).
- On load, `mealPlanUtils.ts` hydrates compact slots into full `MealSlot` objects by looking up the recipe by name. Before saving, it dehydrates back to compact.
- If the server returns empty data, the app seeds from `localStorage` as a fallback.

**Frontend state:**
- `App.tsx` is the root coordinator (auth check, active view routing, sync state).
- All server communication is in custom hooks (`useRecipes`, `useMealPlan`, `useIngredients`, `useUIState`). Components never fetch directly.
- `AppContext` distributes user tier and edit permissions to descendants.
- Standardized `apiRequest<T>()` / `apiJson()` utilities in `src/utils/` wrap all fetch calls with consistent error handling and typed returns.

**Authentication:**
- JWT in httpOnly cookie, 7-day expiry. First registered user becomes Admin; subsequent users default to Viewer.
- Three tiers: Viewer (read-only), Editor, Admin. Enforced server-side via `authenticate`, `requireEditor`, `requireAdmin` middleware in `server/middleware.js`.
- Test auth bypass is disabled when `DEPLOYED=true`.

**Recipe variants:**
- A recipe can have a `baseRecipeName` field making it a variant. Variants inherit all ingredients and instructions from the base and extend them via `ingredientAdditions` / `instructionAdditions`.
- `src/utils/recipeUtils.ts` resolves variants to their full form via `resolveVariantRecipe()`.

**Ingredient system:**
- Ingredients have canonical names, `aliases`, `storeSection`, `containerSizes`, and `conversions`.
- The shopping list aggregates recipe ingredients by matching them to canonical ingredients (including alias lookup) and groups them by store section.
- Server supports ingredient merging (retire one UUID, remap all recipe references to another).

**Design system:**
- Centralized in `src/styles/designTokens.ts`. Tailwind dark mode uses the `class` strategy.
- Meal-type colors (breakfast=orange, lunch=green, dinner=blue, snack=purple) are defined in `tailwind.config.js`.

## Key Conventions

- `server/` is CommonJS (`.js`); `src/` is ESM TypeScript. Do not mix module systems.
- TypeScript is strict: `noUnusedLocals`, `noUnusedParameters` are enforced.
- ESLint bans `console.log`; use `console.warn` / `console.error`.
- Large features are split into subdirectories with barrel `index.ts` exports (e.g., `components/RecipeModal/`, `components/WeeklyPlanner/`).
- The `pre-push` git hook auto-bumps the patch version in `Navigation.tsx` and amends the commit — expect this to run on push.

## Environment Variables

| Variable         | Notes                                          |
|------------------|------------------------------------------------|
| `JWT_SECRET`     | Required in production; app crashes without it |
| `PORT`           | API port (default: 3001)                       |
| `DATA_DIR`       | Override data directory path                   |
| `DEPLOYED`       | Set `true` to disable test auth bypass         |
| `SECURE_COOKIES` | Set `true` for HTTPS-only cookies              |
| `CORS_ORIGINS`   | Comma-separated allowed origins                |
