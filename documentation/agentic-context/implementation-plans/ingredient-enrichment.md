# Ingredient Database Enrichment

## Context

Enriching and cleaning up the ingredient database as a prerequisite to building a proper
ingredient knowledge base with common container sizes and unit conversions. This is a
multi-phase task requiring approval between phases.

**Data files:** `./data/ingredients.json`, `./data/recipes.json`
**Output files:** `./data/claude/results/enriched.json`, `./data/claude/results/needs-review.json`, `./data/claude/results/summary.md`

---

## Phase 1: Audit — Complete ✅

### A. Non-Ingredients (noted — leave alone for now)

These are likely incorrect recipe translations from original source data and will require
manual fixup. Do not touch in this enrichment pass.

| ID         | Name                  | Reason                                                          |
|------------|-----------------------|-----------------------------------------------------------------|
| `e323b9d1` | Cheesecake:           | Label/section header (has colon)                                |
| `b8a58e04` | Topping:              | Label/section header (has colon)                                |
| `2bf3ba4e` | Season With Salt      | Recipe instruction, not an ingredient                           |
| `49d12c5b` | Scant 1 Cup           | Measurement notation, not an ingredient                         |
| `a7b631ef` | Scoop                 | Measurement unit                                                |
| `1ab33a01` | Scoops                | Measurement unit                                                |
| `a01eac3c` | Omelette              | Prepared dish                                                   |
| `b954f5b8` | Fries                 | Prepared food                                                   |
| `15f48a78` | Cub Water             | Likely typo ("Club Water"?), unclear                            |
| `56ba628e` | Pasta Water           | Byproduct/technique, not purchasable                            |
| `ce3ee9bb` | Kind Bar              | Brand name (packaged snack)                                     |
| `06740da2` | Barilla Protein Pasta | Brand name — should be "Protein Pasta" or merged into Pasta     |
| `c6d54df0` | Box Goodles           | Brand name (Goodles pasta)                                      |
| `3f62c6aa` | Oatly Barista         | Brand name — should be "Oat Milk (Barista)" or merged into a generic oat milk |

### B. Merge Proposals

#### Confirmed merges

| Retire UUID | Retire Name                | Keep UUID  | Keep Name           | Action                                                               |
|-------------|----------------------------|------------|---------------------|----------------------------------------------------------------------|
| `5de81812`  | Gochujan                   | `750bdc39` | Gochujang           | Typo — add "Gochujan" as alias                                       |
| `849f0673`  | Minced Garlic              | `b6fb1b87` | Garlic              | Already aliased; add "Minced Garlic" as alias                        |
| `8f48e239`  | Canned Crushed Tomatoes    | `a5a813b2` | Crushed Tomatoes    | "Canned" is redundant; add as alias                                  |
| `a7dfa4c1`  | Crumbled Feta              | `d3d0f351` | Feta Crumbles       | Same thing; add "Crumbled Feta" as alias; rename canonical to "Feta" |
| `8ec1a71b`  | Pasta Choices              | `5bada7b3` | Pasta               | Meaningless variant name                                             |
| `a5290448`  | Parmesan Cheese            | `994dce5c` | Parmigiano Reggiano | Use full canonical name; add "Parmesan", "Parmesan Cheese" as aliases|
| `a7147d08`  | Light Grated Parmesan      | `994dce5c` | Parmigiano Reggiano | Add "Light Grated Parmesan" as alias                                 |
| `6b405455`  | Vanilla Protein Powder     | `66128e52` | Protein Powder      | Generic canonical; add "Vanilla Protein Powder" as alias             |
| `16d1032f`  | Vanilla Whey               | `66128e52` | Protein Powder      | Add "Vanilla Whey" as alias                                          |
| `3ddeabf5`  | Vanilla Whey Powder        | `66128e52` | Protein Powder      | Add "Vanilla Whey Powder" as alias                                   |
| `383326f6`  | Scoop Vanilla Whey Protein | `66128e52` | Protein Powder      | Add "Scoop Vanilla Whey Protein" as alias                            |

#### Name-only fixes (UUID unchanged)

| UUID       | Current Name  | Fixed Name         | Note           |
|------------|---------------|--------------------|----------------|
| `56e9704e` | Sun- Tomatoes | Sun-Dried Tomatoes | Truncated name |

#### Keep separate (distinct products)

- `7d0f66a8` Lime / `48f8e7bd` Limes / `52b729cb` Lime Juice — fruit vs juice
- `f5b68257` Green Onions / `2760b706` Spring Onions — different varieties
- `85cd2c25` Sesame Seeds / `ad436577` Toasted Sesame Seeds — distinct prep
- `cd6fc63d` English Muffins / `07165816` Whole Wheat English Muffins — distinct products
- `567f406e` Broccoli / `c055f4f0` Broccoli Florets — whole head vs prepped florets
- `c34285f5` Chicken Broth / `c4cec848` Chicken Stock — culinarily distinct
- `760cdc47` Soy Sauce / `9914d3ad` Low Sodium Soy Sauce — distinct dietary products
- `3532d5e0` Mayo / `1f6de6ee` Light Mayo — distinct products
- `96b769a2` Greek Yogurt / `e5256313` Yogurt — distinct products
- `804aa482` Milk / `5079765e` 2% Milk / `650afe11` Almond Milk — distinct
- `129c88ac` Rice / `2e1ea635` White Rice / `83c4c014` Brown Rice / `8b1cd72f` Basmati Rice — distinct types

#### Chili Flakes cluster

| Retire UUID | Retire Name          | Keep UUID  | Keep Name         | Action                              |
|-------------|----------------------|------------|-------------------|-------------------------------------|
| `9b704e46`  | Chili Flakes         | `afc11f31` | Red Pepper Flakes | Add "Chili Flakes" as alias         |
| `6942de14`  | Crushed Chili Flakes | `afc11f31` | Red Pepper Flakes | Add "Crushed Chili Flakes" as alias |
| `e5746d3b`  | Red Chili Flakes     | `afc11f31` | Red Pepper Flakes | Add "Red Chili Flakes" as alias     |

#### Cinnamon / Cumin — keep specific form as canonical

| Retire UUID | Retire Name | Keep UUID  | Keep Name       | Action                  |
|-------------|-------------|------------|-----------------|-------------------------|
| `fb9d500c`  | Cinnamon    | `f7b15552` | Ground Cinnamon | Add "Cinnamon" as alias |
| `7b0ed57b`  | Cumin       | `50f03bfa` | Ground Cumin    | Add "Cumin" as alias    |

#### Tomato / Tomatoes — singular canonical

| Retire UUID | Retire Name | Keep UUID  | Keep Name | Action                                        |
|-------------|-------------|------------|-----------|-----------------------------------------------|
| `ed8509b9`  | Tomatoes    | `d2bc2e81` | Tomato    | Add "Tomatoes", "chopped tomatoes" as aliases |

### C. `storeSection: "Unassigned"` (need category)

97 of 195 ingredients have `storeSection: "Unassigned"`. Will be fixed during Enrichment phase.

### D. Missing `containerSizes` and `conversions`

100% of all 195 ingredients are missing both fields. All will be addressed in Enrichment phase.

### E. Name Cleanup Flags

| ID         | Current Name                         | Fix                | Action                                                                                                                   |
|------------|--------------------------------------|--------------------|--------------------------------------------------------------------------------------------------------------------------|
| `56e9704e` | Sun- Tomatoes                        | Sun-Dried Tomatoes | Handled in merge table above                                                                                             |
| `15f48a78` | Cub Water                            | (retire)           | Recipe-level fix — retire ingredient, remap recipe refs to `19674a6a` Water; set `measure` to "cup" if currently empty  |
| `8256ca29` | Shawarma Seasoning Or 7 Spice Powder | Shawarma Seasoning | Name-only fix; edit `notes` on affected recipes to mention 7 Spice Powder as a substitute                               |
| `cf48abf0` | Snap Or Mangetout Peas               | Snap Peas          | Name-only fix; edit `notes` on affected recipes to mention Sugar Snap Peas / Mangetout as substitutes                   |

### Open Questions (need answers before Phase 2)

1. Should non-ingredient entries (`Cheesecake:`, `Season With Salt`, `Scoop`, etc.) go
   in the merge/retire table, or be handled as a separate deletion pass?
2. For the Protein Powder cluster — single canonical `Protein Powder`, or keep
   `Vanilla Protein Powder` / `Chocolate Protein Powder` as separate entries?
   (Recipes appear to reference specific flavors.)

---

## Phase 2: Merge Proposal — Approved ✅

---

## Phase 3: Enrichment — Complete ✅

184 ingredients enriched, 25 flagged for review.

Batches of 10, alphabetically. Each batch runs as an independent subagent writing to an
isolated output file to prevent write conflicts. A merge pass consolidates everything at the end.

**Batch output path:** `./data/claude/results/enriched_batch_NN.json`
**Needs-review path:** `./data/claude/results/needs_review_batch_NN.json`
**Final consolidated output:** `./data/claude/results/enriched.json`, `./data/claude/results/needs-review.json`

---

### Batch Status

| Batch | Range                             | Count | Status     |
|-------|-----------------------------------|-------|------------|
| 1     | 2% Milk → Barilla Protein Pasta   | 10    | ✅ Complete |
| 2     | Basil → Bread Crumbs              | 10    | ✅ Complete |
| 3     | Broccoli → Carrot                 | 10    | ✅ Complete |
| 4     | Cayenne Pepper → Chicken Stock    | 10    | ✅ Complete |
| 5     | Chicken Thighs → Cornstarch       | 10    | ✅ Complete |
| 6     | Cottage Cheese → Egg              | 10    | ✅ Complete |
| 7     | Egg Whites → Garam Masala         | 10    | ✅ Complete |
| 8     | Garlic → Ground Pork              | 10    | ✅ Complete |
| 9     | Ground Turkey → Ketchup           | 10    | ✅ Complete |
| 10    | Kind Bar → Low-fat Cheese         | 10    | ✅ Complete |
| 11    | Mango → Mustard                   | 10    | ✅ Complete |
| 12    | Noodles → Orange                  | 10    | ✅ Complete |
| 13    | Orange Juice → Pasta              | 10    | ✅ Complete |
| 14    | Pasta Water → Pork Tenderloin     | 10    | ✅ Complete |
| 15    | Potato Starch → Red Pepper Flakes | 10    | ✅ Complete |
| 16    | Red Pesto → Salt & Pepper         | 10    | ✅ Complete |
| 17    | Scant 1 Cup → Sirloin Steak       | 10    | ✅ Complete |
| 18    | Skirt Steak → Strips Turkey Bacon | 10    | ✅ Complete |
| 19    | Sugar → Tomato Paste              | 10    | ✅ Complete |
| 20    | Tomato Sauce → Water              | 10    | ✅ Complete |
| 21    | White Rice → Yogurt               | 9     | ✅ Complete |

---

### Parallel Launch Strategy

Run batches in groups of **3–5** using parallel Agent tool calls in a single message. Each
agent is isolated (separate output file), so groups can be as large as desired.

**Recommended grouping** (5 rounds):

- Round 1: Batches 2–5
- Round 2: Batches 6–9
- Round 3: Batches 10–13
- Round 4: Batches 14–17
- Round 5: Batches 18–21

After all batches complete, run a **merge pass** to consolidate batch files into
`./data/claude/results/enriched.json` and `./data/claude/results/needs-review.json`.

---

### Subagent Prompt Template

Use the following prompt when launching an enrichment subagent. Replace `{N}` (two-digit,
zero-padded), `{FIRST}`, and `{LAST}` for each batch.

````
You are enriching a batch of ingredients for the PromptPantry meal planning app.

## Task

Read `./data/ingredients.json`, find all ingredients whose names fall alphabetically from
"{FIRST}" through "{LAST}" (inclusive), and enrich each one with `storeSection`,
`containerSizes`, and `conversions`.

Write results to `./data/claude/results/enriched_batch_{N}.json` and uncertain items to
`./data/claude/results/needs_review_batch_{N}.json`. These are **disjoint sets** — an
ingredient goes to exactly one file, never both.

**Write incrementally** — after processing each ingredient, immediately append it to the
appropriate file before moving to the next. Do not accumulate results in memory and write
at the end. This ensures partial progress is preserved if the session hits a context limit.

## Non-Ingredient IDs to Skip

These IDs appear in the data but are not real ingredients. Include them in the output with
`"skip": true` and a brief `"reason"`:

- e323b9d1 (Cheesecake:)
- b8a58e04 (Topping:)
- 2bf3ba4e (Season With Salt)
- 49d12c5b (Scant 1 Cup)
- a7b631ef (Scoop)
- 1ab33a01 (Scoops)
- a01eac3c (Omelette)
- b954f5b8 (Fries)
- 15f48a78 (Cub Water)
- 56ba628e (Pasta Water)
- ce3ee9bb (Kind Bar)
- 06740da2 (Barilla Protein Pasta)
- c6d54df0 (Box Goodles)
- 3f62c6aa (Oatly Barista)

## Output Format

Write a JSON array to `./data/claude/results/batches/batch-{N}.json`. One object per ingredient.

**Normal ingredient:**
```json
{
  "id": "uuid",
  "name": "Name",
  "storeSection": "Section",
  "containerSizes": [
    { "quantity": 32, "unit": "fl oz", "label": "1 qt" }
  ],
  "conversions": {
    "weightToVolume": {
      "weight": { "quantity": 8.5, "unit": "oz" },
      "volume": { "quantity": 1, "unit": "cup" }
    }
  }
}
```

**Portion-based conversion** (whole produce, eggs, etc.):
```json
{
  "conversions": {
    "portionToVolume": {
      "portion": { "quantity": 1, "description": "medium avocado" },
      "volume": { "quantity": 0.75, "unit": "cup" }
    }
  }
}
```

**No applicable conversion** (prepared sauces, condiments, brand items): omit `conversions` entirely.

**Non-ingredient:** `{ "id": "uuid", "name": "Name", "skip": true, "reason": "brief reason" }`

## Valid storeSection Values

Produce, Dairy, Meat & Seafood, Bakery, Frozen, Pantry, Baking, Beverages,
Condiments, Spices, International, Snacks, Deli, Health & Supplements, Canned Goods

## Routing Rules

- **Confident** → append to `enriched_batch_{N}.json`
- **Uncertain** → append to `needs_review_batch_{N}.json` ONLY (do NOT also write to enriched)
- **Non-ingredient** → append to `needs_review_batch_{N}.json` ONLY

An ingredient must appear in exactly one file, never both.

## needs_review format

```json
{
  "entry": {
    "id": "uuid",
    "name": "Name",
    "storeSection": "...",
    "containerSizes": [...],
    "conversions": {...},
    "reason": "Explain what is uncertain or why this was flagged"
  },
  "decision": ""
}
```

Leave `"decision"` as an empty string. The user will fill it in before the apply pass runs.
````

---

### Merge Pass Prompt (run after all batches complete)

````
Merge all batch enrichment files into the consolidated output files.

1. Read all files matching `./data/claude/results/enriched_batch_*.json`.
2. Read the existing `./data/claude/results/enriched.json`.
3. Merge: add all new entries to the existing array. Omit any with `"skip": true`.
   If an entry with the same `id` already exists, keep the existing one (Batch 1 is authoritative).
4. Write the merged array to `./data/claude/results/enriched.json`.
5. Merge all `needs_review_batch_*.json` into `./data/claude/results/needs-review.json`.
   Verify the two files are disjoint — no `id` should appear in both.
6. Update the batch status table in
   `documentation/agentic-context/implementation-plans/ingredient-enrichment.md` —
   mark all completed batches ✅ and Phase 3 as Complete ✅.
````

---

### Batch 1 — Complete ✅ (2% Milk → Barilla Protein Pasta)

| Ingredient            | storeSection | Containers                         | Conversions             | Notes                   |
|-----------------------|--------------|------------------------------------|-------------------------|-------------------------|
| 2% Milk               | Dairy        | 1 qt / ½ gal / 1 gal              | 1 cup = 8.5 oz          |                         |
| All-purpose Flour     | Baking       | 2 / 5 / 10 lb bags                 | 1 cup = 4.25 oz         |                         |
| Almond Butter         | Pantry       | 12 oz / 16 oz jars                 | 1 tbsp = 0.56 oz        |                         |
| Almond Milk           | Beverages    | 1 qt / ½ gal                       | 1 cup = 8.5 oz          | Changed from Pantry     |
| Apple Cider Vinegar   | Pantry       | 16 / 32 / 64 fl oz                 | 1 cup = 8.5 oz          |                         |
| Arrabbiata            | Pantry       | 24 oz jar                          | —                       | No conversion (sauce)   |
| Avocado               | Produce      | single / bag of 4                  | 1 medium = ¾ cup        | portionToVolume         |
| Baking Powder         | Baking       | 6 / 8.1 / 12 oz tins               | 1 tsp = 0.14 oz         | Changed from Unassigned |
| Banana                | Produce      | single / 1.5 lb bunch / 3 lb bag   | 1 medium = ½ cup mashed | portionToVolume         |
| Barilla Protein Pasta | Pantry       | 12 oz box                          | 1 cup dry = 3.5 oz      | Changed from Unassigned |

---

## Phase 4: Apply Pass — Complete ✅

Write a one-shot script `data/claude/apply-enrichment.js` that runs all four steps below, then delete it after verification.

---

### Step 1 — Merge enriched.json → ingredients.json

For each entry in `data/claude/results/enriched.json`, find the matching ingredient in `data/ingredients.json` by `id` and apply:

- **`storeSection`** — overwrite with enriched value
- **`containerSizes`** — overwrite entirely
- **`conversions`** — overwrite entirely (remove key if absent in enriched)
- **`name`** — overwrite only if different (Asian Noodles, Vegetable Oil, Granola were renamed in Phase 3)
- **`aliases`** — **preserve existing** — enriched.json does not carry aliases

Ingredients in `ingredients.json` with no match in `enriched.json` are left unchanged (the 7 ⚠️-prefixed entries).

Validate every result against `schemas/ingredient.schema.json` via AJV. Abort on any validation error. Write `ingredients.json` atomically (`.tmp` → rename), sorted by name.

---

### Step 2 — Execute Phase 2 merge proposals

For each row: add the retired name (and any aliases) to the target's `aliases` array, remap all
`ingredientId` references in `data/recipes.json` from retired UUID → target UUID, delete the
retired ingredient entry.

Also apply name-only fixes (UUID unchanged).

#### Merges

| Retire UUID | Retire Name                | Keep UUID  | Keep Name           |
|-------------|----------------------------|------------|---------------------|
| `5de81812`  | Gochujan                   | `750bdc39` | Gochujang           |
| `849f0673`  | Minced Garlic              | `b6fb1b87` | Garlic              |
| `8f48e239`  | Canned Crushed Tomatoes    | `a5a813b2` | Crushed Tomatoes    |
| `a7dfa4c1`  | Crumbled Feta              | `d3d0f351` | Feta                |
| `8ec1a71b`  | Pasta Choices              | `5bada7b3` | Pasta               |
| `a5290448`  | Parmesan Cheese            | `994dce5c` | Parmigiano Reggiano |
| `a7147d08`  | Light Grated Parmesan      | `994dce5c` | Parmigiano Reggiano |
| `6b405455`  | Vanilla Protein Powder     | `66128e52` | Protein Powder      |
| `16d1032f`  | Vanilla Whey               | `66128e52` | Protein Powder      |
| `3ddeabf5`  | Vanilla Whey Powder        | `66128e52` | Protein Powder      |
| `383326f6`  | Scoop Vanilla Whey Protein | `66128e52` | Protein Powder      |
| `9b704e46`  | Chili Flakes               | `afc11f31` | Red Pepper Flakes   |
| `6942de14`  | Crushed Chili Flakes       | `afc11f31` | Red Pepper Flakes   |
| `e5746d3b`  | Red Chili Flakes           | `afc11f31` | Red Pepper Flakes   |
| `fb9d500c`  | Cinnamon                   | `f7b15552` | Ground Cinnamon     |
| `7b0ed57b`  | Cumin                      | `50f03bfa` | Ground Cumin        |
| `ed8509b9`  | Tomatoes                   | `d2bc2e81` | Tomato              |

#### Name-only fixes (UUID unchanged)

| UUID       | Old Name        | New Name           |
|------------|-----------------|--------------------|
| `56e9704e` | Sun- Tomatoes   | Sun-Dried Tomatoes |
| `d3d0f351` | Feta Crumbles   | Feta               |

---

### Step 3 — Apply Phase 3 deferred items

| Action | Retire UUID | Retire Name | Keep UUID  | Keep Name  | Note                                             |
|--------|-------------|-------------|------------|------------|--------------------------------------------------|
| Merge  | `0a374de2`  | Fried Egg   | (Egg UUID) | Egg        | Find Egg by name; add "Fried Egg" as alias       |
| Merge  | `1ab33a01`  | Scoops      | `a7b631ef` | ⚠️ Scoop  | Add "Scoops" as alias; remap recipes; delete     |

---

### Step 4 — Verify recipe integrity

After all writes, scan every `ingredientId` reference in `data/recipes.json` against the final
`data/ingredients.json` ID set. Print any broken links (recipe name + ingredient display text +
missing UUID). Zero broken links required before marking Phase 4 complete.

---

### Key files

| File                                                           | Role                                  |
|----------------------------------------------------------------|---------------------------------------|
| `data/ingredients.json`                                        | Target — live ingredient database     |
| `data/claude/results/enriched.json`                            | Source — 200 enriched objects         |
| `data/recipes.json`                                            | Integrity check + remap target        |
| `schemas/ingredient.schema.json`                               | AJV validation schema                 |
| `prompt-pantry-app/server/dataAccess.js`                       | Atomic write + sort pattern reference |
| `prompt-pantry-app/server/ingredientRoutes.js` (lines 154–227) | Existing merge logic reference        |
| `prompt-pantry-app/server/ingredientHelpers.js`                | `forEachRecipeIngredient` helper      |
