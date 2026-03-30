# Recipe Importer & Suggestion Algorithm Design

**Date:** 2026-03-28

---

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [UX Flow](#ux-flow)
- [Framework Detection & Parsers](#framework-detection--parsers)
- [Field Mapping](#field-mapping)
- [Ingredient Resolution](#ingredient-resolution)
- [Save Validation](#save-validation)
- [Error Handling & Post-Import Warning](#error-handling--post-import-warning)
- [Suggestion Algorithm Improvements](#suggestion-algorithm-improvements)
- [Testing](#testing)

---

## Overview

Allow users to import recipes from external websites by pasting the page source or recipe card HTML into a modal. The feature detects which recipe framework the page uses and delegates to the most specific available parser, falling back to schema.org JSON-LD for unknown sites.

All parsing is client-side (no server round-trip). Parsed data pre-fills the existing RecipeEditForm; the user reviews and saves normally via the existing flow.

---

## Architecture

A single new file `src/utils/recipeImporter.ts` owns all detection and parsing logic. It exports one public function:

```ts
importRecipeFromHtml(html: string, sourceUrl?: string): Partial<Recipe>
```

Internally it runs the detection chain by parsing the HTML string with `DOMParser` into a `Document`, then delegates to one of three isolated parsers:

- `parseWprm(doc: Document): Partial<Recipe>` — WP Recipe Maker
- `parseTastyRecipes(doc: Document): Partial<Recipe>` — Tasty Recipes plugin
- `parseJsonLd(doc: Document): Partial<Recipe>` — schema.org JSON-LD fallback

A new Express endpoint `GET /api/recipes/scrape?url=<encoded-url>` fetches the page server-side and returns the raw HTML. This avoids CORS restrictions that would block client-side fetch for nearly all recipe sites. The endpoint requires `authenticate` + `requireEditor` middleware (same as other recipe mutations). It sets a reasonable timeout (10s) and returns an appropriate error status on failure.

All parsers return `Partial<Recipe>`. Fields not found in the source default as follows:

- `categories` → `["Misc"]` (required by schema; user must correct in the form)
- `macros` → `{ calories: 0, protein: 0, carbs: 0, fat: 0 }`
- `prepTime` / `cookTime` → `"0"` (numeric minute string, matching the existing data format)
- `notes` → first line is always `"Imported from: <url>"` when a URL is known, followed by any notes extracted from the recipe card (newline-separated)

### Pre-filling the form

`ImportRecipeModal` is wired at the `RecipeModal` level. After `importRecipeFromHtml` returns successfully, `RecipeModal` calls the following state setters directly:

- `setEditedRecipe(parsed)` — sets the recipe object
- `setMacroInputs({ calories: String(parsed.macros.calories), ... })` — macros are tracked as strings in a separate state object
- `setServingsInput(String(parsed.servings ?? 1))` — servings is also a separate string state

This is the same state-wiring path used when opening an existing recipe for editing.

---

## UX Flow

1. An "Import from website" button is added to the RecipeModal header.
2. Clicking opens `ImportRecipeModal` — a simple overlay with two modes:

**Mode 1 — URL (default):**
- A URL text input labelled "Recipe URL"
- An "Import" button — sends `GET /api/recipes/scrape?url=<encoded>`, then runs the parsing chain client-side
- A spinner/loading state while the server fetches the page
- On server fetch failure: Mode 2 (HTML paste) appears below with the message *"Couldn't fetch this page automatically — it may block scrapers. Paste the page source below instead."*

**Mode 2 — HTML paste (fallback, or manually triggered):**
- A `<textarea>` with instructions:
  > *Paste the recipe page source here. To get it: right-click the recipe card on the page → Inspect → right-click the highlighted element → Copy → Copy outerHTML. Or for the full page: right-click anywhere → View Page Source → Select All → Copy.*
- A "Parse Recipe" button

3. On successful parse (either mode): the import modal closes, `RecipeEditForm` opens pre-filled with parsed data, and a dismissible amber warning banner is shown at the top of the form (see [Post-Import Warning](#error-handling--post-import-warning)).
4. On parse failure: a red error box is shown inline within `ImportRecipeModal`. The modal stays open.
5. The import modal never saves anything; it only hydrates the form.

---

## Framework Detection & Parsers

Detection runs in priority order against the full parsed `Document`. The user may paste either just the recipe card element or the entire page source — both work identically since detection searches the whole document.

| Priority | Framework          | Detection selector                                                            |
|----------|--------------------|-------------------------------------------------------------------------------|
| 1        | WP Recipe Maker    | `[id^="wprm-recipe-container"]`                                               |
| 2        | Tasty Recipes      | `.tasty-recipes`                                                              |
| 3        | schema.org JSON-LD | `script[type="application/ld+json"]` filtered for `"@type": "Recipe"`        |
| —        | None found         | Throw parse error                                                             |

### Source URL Tracking

The URL used for import is always known when Mode 1 is used (the user typed it). When Mode 2 (HTML paste) is used, attempt to extract the URL from the pasted content:
1. `<link rel="canonical" href="...">`
2. `<meta property="og:url" content="...">`

In both cases, the resolved URL is passed to `importRecipeFromHtml` as `sourceUrl` and prepended to notes.

### WPRM Parser

Covers the majority of target recipes (howsweeteats, hungryhappens, damndelicious, onceuponachef, rasamalaysia, noblepig, cafedelites, hungryinthailand, ninjacue, cookinginthemidwest, spendwithpennies).

WPRM stores quantity, unit, and name in separate spans, giving clean structured extraction:

- Name: `.wprm-recipe-name`
- Servings: `data-servings` attribute on the root element
- Prep time: `.wprm-recipe-prep_time-minutes` (integer → emit as numeric string, e.g. `"30"`)
- Cook time: `.wprm-recipe-cook_time-minutes` (same)
- Ingredient groups: `.wprm-recipe-ingredient-group` → each group has a name (`.wprm-recipe-ingredient-group-name`) and rows (`.wprm-recipe-ingredient`) with `.wprm-recipe-ingredient-amount`, `.wprm-recipe-ingredient-unit`, `.wprm-recipe-ingredient-name` — maps directly to grouped `ingredients` schema format
- Instruction groups: `.wprm-recipe-instruction-group` → each group has `.wprm-recipe-instruction-group-name` and `.wprm-recipe-instruction-text` rows — maps to grouped `instructions` format
- Notes: `.wprm-recipe-notes` → stored in `recipe.notes`
- Tags: `.wprm-recipe-keyword` elements
- Nutrition: `.wprm-recipe-nutrition-container` — find child elements containing `wprm-nutrition-label` text matching "Calories", "Protein", "Carbohydrates", "Fat" and extract associated value spans

### Tasty Recipes Parser

Covers gimmesomeoven.com.

- Name: `.tasty-recipes-title`
- Prep time: `.tasty-recipes-prep-time` (text like "5 minutes" — strip non-numeric, emit as numeric string)
- Cook time: `.tasty-recipes-cook-time` (same)
- Servings: first `[data-amount]` value inside `.tasty-recipes-yield`
- Ingredients: `.tasty-recipes-ingredients li` — flat strings, parsed with ingredient regex (see below)
- Instructions: `.tasty-recipes-instructions li` — flat text strings
- Notes: `.tasty-recipes-notes`
- Nutrition: `.tasty-recipes-nutrition` — extract calories, protein, carbohydrates, fat if present

### JSON-LD Parser (Fallback)

Covers food.com, seriouseats.com, and any other site with schema.org Recipe markup.

Find all `<script type="application/ld+json">` blocks, parse each as JSON, find the one with `"@type": "Recipe"` (may be nested inside a `@graph` array). Extract:

- `name`
- `prepTime` / `cookTime` — ISO 8601 duration (`PT30M`) → parse minutes with `/PT(?:(\d+)H)?(?:(\d+)M)?/`, emit as numeric string (e.g. `"30"`)
- `recipeYield` — parse leading integer for servings
- `recipeIngredient[]` — flat strings, parsed with ingredient regex
- `recipeInstructions[]` — array of strings or `HowToStep` objects (extract `.text`)
- `keywords` — comma-split into `tags`
- `nutrition` — map `calories`, `proteinContent`, `carbohydrateContent`, `fatContent` if present

### Ingredient String Parsing (Tasty Recipes & JSON-LD)

Free-text ingredient strings (e.g., `"1 cup all-purpose flour"`) are parsed with a best-effort regex split into `{ quantity, measure, ingredient }`. Known failure cases the user will need to correct manually:

- Unicode fraction characters (`½`, `¾`) — not matched by `\d`
- Range quantities (`1-2 cups`) — only the first number is captured
- Inline preparation notes (`"1 cup flour (sifted)"`) — parenthetical ends up in the ingredient name
- Ingredients with no quantity (`"Salt to taste"`) — quantity and measure will be empty

---

## Field Mapping

| Recipe Field     | WPRM                                        | Tasty Recipes                           | JSON-LD                              |
|------------------|---------------------------------------------|-----------------------------------------|--------------------------------------|
| `name`           | `.wprm-recipe-name`                         | `.tasty-recipes-title`                  | `name`                               |
| `categories`     | Default `["Misc"]`                          | Default `["Misc"]`                      | Default `["Misc"]`                   |
| `prepTime`       | `.wprm-recipe-prep_time-minutes` (→ string) | `.tasty-recipes-prep-time` (strip text) | `prepTime` ISO 8601 → numeric string |
| `cookTime`       | `.wprm-recipe-cook_time-minutes` (→ string) | `.tasty-recipes-cook-time` (strip text) | `cookTime` ISO 8601 → numeric string |
| `servings`       | `data-servings` on root                     | `[data-amount]` in `.tasty-recipes-yield` | `recipeYield` (parse int)          |
| `ingredients`    | Grouped via `.wprm-recipe-ingredient-group` | Flat `li` strings (regex-parsed)        | Flat `recipeIngredient[]` (regex-parsed) |
| `instructions`   | Grouped via `.wprm-recipe-instruction-group` | Flat `li` strings                      | `recipeInstructions[]`               |
| `notes`          | `"Imported from: <url>\n" + .wprm-recipe-notes` | `"Imported from: <url>\n" + .tasty-recipes-notes` | `"Imported from: <url>"` |
| `tags`           | `.wprm-recipe-keyword`                      | —                                       | `keywords` (comma-split)             |
| `macros.calories`| From nutrition container                    | From nutrition section                  | `nutrition.calories`                 |
| `macros.protein` | From nutrition container                    | From nutrition section                  | `nutrition.proteinContent`           |
| `macros.carbs`   | From nutrition container                    | From nutrition section                  | `nutrition.carbohydrateContent`      |
| `macros.fat`     | From nutrition container                    | From nutrition section                  | `nutrition.fatContent`               |

All macro fields default to `0` if not found. `categories` always defaults to `["Misc"]`.

---

## Ingredient Resolution

After parsing, each ingredient has a `name` string but no `ingredientId`. A second pass attempts to match each ingredient name against the existing ingredient library before pre-filling the form.

`recipeImporter.ts` exports a second function:

```ts
resolveIngredients(
  ingredients: RawIngredient[],
  library: IngredientDefinition[]
): ResolvedIngredient[]
```

Matching logic (in order):
1. Exact match on `canonical` name (case-insensitive)
2. Match on any entry in the `aliases` array (case-insensitive)
3. No match → ingredient is imported without `ingredientId`

`RecipeModal` calls `resolveIngredients` after `importRecipeFromHtml` returns, passing the already-loaded ingredient library from the `useIngredients` hook. Matched ingredients get their `ingredientId` populated automatically. Unmatched ingredients are imported as-is — the user must link or create them manually.

**No new ingredients are created automatically.** The user is responsible for creating any ingredient definitions that don't already exist in the library before or after importing.

---

## Save Validation

This is a broader improvement to the recipe save flow that applies to all recipes (not just imports), prompted by the import feature surfacing the need for better inline validation feedback.

### Current behavior (to be replaced)

The save button calls `POST /api/recipes`, and if the server returns a validation error, the modal closes and an error toast appears. The user has no indication of which field failed.

### New behavior

Client-side validation runs before the save request is sent. If validation fails:

- The modal stays open — it never closes on a failed save
- Failing fields are highlighted with a red outline
- A red error summary banner appears at the top of the form listing what needs to be fixed
- The save request is not sent until all client-side validation passes

### Validation rules

| Rule                                  | Field highlighted                     |
|---------------------------------------|---------------------------------------|
| Name is empty                         | Name input                            |
| No categories selected                | Categories selector                   |
| Any ingredient missing `ingredientId` | That ingredient row                   |
| Any macro field is non-numeric        | That macro input                      |
| Instructions list is empty            | Instructions section header           |

Unlinked ingredients (missing `ingredientId`) are a hard block on saving. The error message names the specific ingredients: *"The following ingredients are not linked to your ingredient library and must be linked or removed before saving: [list]."*

Schema validation still also runs server-side as before — client-side validation is a UX improvement, not a replacement for server-side integrity checks.

---

## Error Handling & Post-Import Warning

### Import Failure (red box, inline in ImportRecipeModal)

Shown when the parser cannot proceed. The modal stays open so the user can try again.

| Condition                              | Behavior                                                                             |
|----------------------------------------|--------------------------------------------------------------------------------------|
| Server fetch fails (timeout, blocked)  | Mode 2 (HTML paste) appears inline — not a hard error, just a fallback prompt        |
| No framework detected                  | Red box: "Couldn't find a recipe in the pasted content. Make sure the page contains a recipe card." |
| Framework detected, name missing       | Red box: "Found a recipe card but couldn't extract a recipe name."                   |
| Framework detected, no ingredients     | Red box: "Found a recipe card but couldn't extract ingredients."                     |

### Post-Import Review Warning (amber banner, top of RecipeEditForm)

Shown whenever a recipe was imported (not manually created). Stays visible and dismissible until the user saves or explicitly closes it.

> **Review required before saving.** This recipe was imported automatically and may contain errors. Check that: the category is correct (it defaults to "Misc"), ingredients are correct and linked to your ingredient library, instructions are complete and properly ordered, times and servings are accurate, and macros have been filled in (they default to 0 if not found on the source page).

---

## Suggestion Algorithm Improvements

All changes are isolated to `src/components/RecipePicker.tsx` (the `suggestions` useMemo) unless noted. No new files are needed.

### Ingredients Mode

**1 — Use ingredient library for matching**

Replace the current raw string normalization heuristic (`length >= 3`, `<= 6 words`) with canonical matching against the ingredient library. For each ingredient in a recipe, look up its `ingredientId` in the library and match on the canonical name or any alias. This eliminates false positives from short/noisy strings and false negatives from alias mismatches.

The ingredient library is already available in `RecipePicker` via props (passed down from `App.tsx` through the existing `useIngredients` hook). A lookup map `Map<ingredientId, IngredientDefinition>` should be built once outside the `useMemo` to avoid rebuilding per render.

**2 — Minimum shared ingredient threshold**

Add a `minSharedIngredients` state (default: `1`, range: `1–5`) controlled by a small stepper UI in the Suggestions tab toolbar. The existing `filter(item => item.sharedCount >= 1)` becomes `filter(item => item.sharedCount >= minSharedIngredients)`.

**3 — Thumbs up/down weighting toggle**

Add a `useRatingBonus` boolean state (default: `true`) controlled by a toggle in the Suggestions tab toolbar. When on, apply the existing `+100` / `-50` rating bonus. When off, all recipes score purely on ingredient overlap.

---

### Macros Mode

**4 — Revised scoring weights**

Current weights penalize the most-deficient macro signal by ranking overall balance higher. Revised weights make the most-deficient macro the primary signal:

| Component | What it measures                                 | Old weight | New weight |
|-----------|--------------------------------------------------|------------|------------|
| `p1`      | Proportional fill of protein + carbs + fat gaps  | ×100       | ×50        |
| `p2`      | Fill of the single most-deficient macro          | ×50        | ×100       |
| `p3`      | Fill of calorie gap                              | ×10        | ×20        |
| `p4`      | Shared ingredient count (tiebreaker)             | ×1         | ×5         |

**5 — Normalize by target, not by remaining gap**

Current: `Math.min(r.macros.protein, remaining.protein) / remaining.protein`

This makes scores volatile — early in the week when `remaining` is large, every recipe scores low. Normalize by the weekly target instead:

```
Math.min(r.macros.protein, remaining.protein) / weeklyTargets.protein
```

This answers "what fraction of your weekly protein target does this recipe contribute?" — a stable, meaningful value regardless of how much is already planned.

**6 — Penalty for exceeding macros**

Currently `remaining` is clamped to `0.1` when a macro is already exceeded, effectively treating overshoot as "nearly full." Instead, apply a penalty proportional to the overshoot:

- If `remaining[macro] >= 0`: score normally
- If `remaining[macro] < 0`: multiply that macro's contribution by a penalty factor, e.g. `0.5 * (remaining[macro] / weeklyTargets[macro])` (a negative value, reducing the overall score)

Recipes that would further worsen an already-exceeded macro rank lower. Recipes with zero of that macro are unaffected.

**7 — Serving count consideration**

The recipe's macro contribution should reflect how it will actually be added to the plan. Use the currently-selected multiplier from `selectedRecipes[r.name]` (defaulting to `1`) when calculating `r.macros.protein * multiplier` etc. in the scoring pass. This means a recipe selected for 3 servings is evaluated as 3x its per-serving macros.

---

### Both Modes

**8 — Recency penalty**

De-rank recipes that have been cooked recently. `getRecipeCookCount(multiWeeklyCookPlan, mealPlan, r.name)` already returns a cook count. Apply a recency multiplier to the final score:

```
recencyMultiplier = Math.max(0.2, 1 - (cookCount * 0.15))
```

A recipe cooked 5+ times gets a 20% floor score. A never-cooked recipe is unaffected. This pushes variety without completely hiding frequently-used recipes.

The multiplier is applied after all other scoring, so it affects both modes consistently.

---

### UI Changes in RecipePicker

| Control                        | Mode       | Type    | Default |
|-------------------------------|------------|---------|---------|
| Min shared ingredients stepper | Ingredients | 1–5 stepper | 1   |
| Rating bonus toggle            | Ingredients | toggle  | on      |

Both controls live in the Suggestions tab toolbar alongside the existing Ingredients/Macros toggle. No new props needed — all state is local to `RecipePicker`.

---

## Testing

### Test fixtures

The `Recipes-to-scrape.txt` file contains real recipe HTML and is added to `.gitignore` — it must not be committed to the repo. Small committed HTML snapshot files are extracted from it for use in unit tests:

- `test/fixtures/wprm-howsweeteats.html` — WPRM with grouped ingredients and nutrition
- `test/fixtures/wprm-damndelicious.html` — WPRM without nutrition
- `test/fixtures/tasty-recipes-gimmesomeoven.html` — Tasty Recipes card
- `test/fixtures/jsonld-food-com.html` — food.com (JSON-LD only)
- `test/fixtures/jsonld-seriouseats.html` — Serious Eats (JSON-LD only)

These are minimal extracts (just the recipe card or script block), not full page dumps.

### Test files

Each parser is a pure function (takes a `Document`, returns `Partial<Recipe>`), making them straightforward to unit test with the committed snapshots.

| Test file                        | Covers                                                                                                                     |
|----------------------------------|----------------------------------------------------------------------------------------------------------------------------|
| `recipeImporter.test.ts`         | Detection chain — correct parser selected per input; parse error thrown when no framework found                            |
| `wprmParser.test.ts`             | Field extraction; grouped ingredients with quantity/measure/name splits; grouped instructions; nutrition present and absent; `categories` defaults to `["Misc"]` |
| `tastyRecipesParser.test.ts`     | Field extraction; yield parsing; flat ingredient regex parsing; `categories` defaults to `["Misc"]`                        |
| `jsonLdParser.test.ts`           | Field extraction; ISO 8601 time parsing; `@graph` nesting; `categories` defaults to `["Misc"]`                            |
| `resolveIngredients.test.ts`     | Exact canonical name match; alias match; no match leaves `ingredientId` undefined; case-insensitivity                     |

Each parser test asserts: name, ingredient array length and structure, instruction count, prep/cook times as numeric strings, servings, and macro values.

### Save validation

Save validation logic is pure (takes a `Recipe`, returns a list of `ValidationError` objects with field paths) and tested in:

| Test file                        | Covers                                                                                                              |
|----------------------------------|---------------------------------------------------------------------------------------------------------------------|
| `recipeValidation.test.ts`       | Empty name, missing categories, unlinked ingredients, empty instructions, non-numeric macros; clean recipe passes with no errors |

### Suggestion algorithm

The `suggestions` useMemo in `RecipePicker` is complex enough to warrant unit-testing the scoring logic extracted into a standalone pure function. Tests cover:

| Test file                        | Covers                                                                                                              |
|----------------------------------|---------------------------------------------------------------------------------------------------------------------|
| `suggestionScoring.test.ts`      | Ingredients mode: library-based matching, min threshold, rating bonus on/off; Macros mode: normalized scoring, macro overshoot penalty, serving count multiplier, recency penalty |
