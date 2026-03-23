# Shopping List Container Display + Store Section Emojis

## Context

The shopping list currently shows container recommendations as a small indigo line below each ingredient row ("Buy: ½ gal"). This is easy to miss. The new format promotes the container label to the primary right-side value, with the raw recipe total shown as a small muted hint: `(6 cups) ½ gal`. Additionally, the cross-unit conversion in container matching is broken when recipe quantities are in a different domain than container sizes (e.g., cups of flour vs. lb bags). Finally, store sections are getting emoji support — user-configurable via the section headers in the shopping list and a new Manage Sections modal in the Ingredients tab.

---

## Part 1: Shopping List Item Row Display

### What changes

**File:** `prompt-pantry-app/src/components/ShoppingList.tsx` — `ShoppingListItemRow` component (lines 33–96)

Current layout:
- Right side: measurement quantity (bold)
- Below: `"Buy: ½ gal"` in small indigo text

New layout (single row, right-aligned):
- `(6 cups)` — `text-xs`, `text-gray-500 dark:text-gray-500`, normal weight, with a small right margin
- `½ gal` — `text-sm`, `font-bold`, `text-gray-200 dark:text-gray-200` (same weight/size as ingredient name)
- When no container exists: just `8 cloves` bold, no parenthetical hint

Remove the `containerRec` `<p>` element entirely. Merge into the right-side `<div>`.

---

## Part 2: Cross-Domain Container Unit Conversion

### Problem

`calculateContainerNeeds` in `prompt-pantry-app/src/utils/containerUtils.ts` normalizes to `ml` via `convertVolume`. This works for volume↔volume (cups → fl oz) but silently fails for:
- Volume recipe quantity + weight containers (4 cups flour → lb bags)
- Weight recipe quantity + volume containers

### Fix

Add a new exported function to `containerUtils.ts`:

```ts
calculateContainerNeedsWithConversions(
    quantity: number,
    unit: string,
    containerSizes: ContainerSize[],
    ingredientDef: IngredientDefinition | null,
    preferFewerContainers?: boolean
): ContainerRecommendationItem[]
```

Logic:
1. Check if recipe unit and container units share the same domain (both volume, both weight, both "each")
2. If mismatch and `ingredientDef.conversions.weightToVolume` exists, use it to convert the recipe quantity into the container's domain before calling `calculateContainerNeeds`
3. The `each` case: if recipe unit is "each" and containers are "each", pass through directly (already works accidentally via `toMl` returning raw value for unknown units — make this explicit)

Use `isVolumeUnit` / `isWeightUnit` from `prompt-pantry-app/src/utils/unitConversions.ts` to detect domain.

Update `ShoppingListItemRow` to call `calculateContainerNeedsWithConversions` instead of `calculateContainerNeeds`, passing `ingredientDef`.

---

## Part 3: Store Section Data + Schema

### New file: `data/storeSections.json`

```json
[
  { "name": "Bakery",              "emoji": "🥐" },
  { "name": "Baking",             "emoji": "🧁" },
  { "name": "Beverages",          "emoji": "🥤" },
  { "name": "Canned Goods",       "emoji": "🥫" },
  { "name": "Condiments",         "emoji": "🫙" },
  { "name": "Dairy",              "emoji": "🥛" },
  { "name": "Deli",               "emoji": "🥪" },
  { "name": "Frozen",             "emoji": "🧊" },
  { "name": "Health & Supplements", "emoji": "💊" },
  { "name": "International",      "emoji": "🌍" },
  { "name": "Meat & Seafood",     "emoji": "🥩" },
  { "name": "Pantry",             "emoji": "🏪" },
  { "name": "Produce",            "emoji": "🥦" },
  { "name": "Snacks",             "emoji": "🍿" },
  { "name": "Spices",             "emoji": "🌶️" },
  { "name": "Unassigned",         "emoji": "❓" }
]
```

### New file: `schemas/storeSection.schema.json`

```json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "type": "array",
  "items": {
    "type": "object",
    "required": ["name"],
    "properties": {
      "name":  { "type": "string", "minLength": 1 },
      "emoji": { "type": "string" }
    },
    "additionalProperties": false
  }
}
```

### New TypeScript type in `prompt-pantry-app/src/types.ts`

```ts
export interface StoreSectionDefinition {
    name: string;
    emoji?: string;
}
```

---

## Part 4: Backend API

### `server/dataAccess.js`

Add `readStoreSections()` and `writeStoreSections(data)` following the existing atomic-write pattern (`.tmp` → rename, AJV validate against schema).

### `server/routes/` (or inline in server entry point — follow existing pattern)

| Method | Path | Description |
|--------|------|-------------|
| GET    | `/api/store-sections` | Return all sections |
| POST   | `/api/store-sections` | Create a new section |
| PUT    | `/api/store-sections/:name` | Update name or emoji |
| DELETE | `/api/store-sections/:name` | Delete with reassignment |

DELETE body: `{ action: 'uncategorize' | 'merge', targetSection?: string }`

On delete:
- `uncategorize`: update all ingredients with `storeSection === name` to `"Unassigned"`
- `merge`: update all ingredients with `storeSection === name` to `targetSection`

Both actions go through `writeIngredients` after patching, keeping atomic write semantics.

---

## Part 5: Frontend — `useStoreSections` Hook

New file: `prompt-pantry-app/src/hooks/useStoreSections.ts`

Follows the same shape as `useIngredients`:
- `storeSections` state + `fetchStoreSections()`
- `saveSection(section, isNew)` — POST or PUT
- `deleteSection(name, action, targetSection?)` — DELETE

Pass `storeSections` down from `App.tsx` alongside `ingredients`.

---

## Part 6: Shopping List Section Headers

In `ShoppingList.tsx`, the section header button (lines 426–449) currently shows `{section}` as plain text.

Changes:
- Accept `storeSections: StoreSectionDefinition[]` as a prop
- Build a lookup `Map<string, StoreSectionDefinition>` from it
- Display `{def?.emoji} {section}` in the header if emoji exists
- Make the emoji clickable (inline popover with a plain `<input>` for emoji entry, max 2 chars) — on confirm, calls `saveSection({ name: section, emoji: newEmoji }, false)`

The popover should be a simple controlled input, not a full emoji picker library. Users can type or paste any emoji.

---

## Part 7: Ingredients Tab — Manage Sections Modal

### Trigger

Add a "Manage Sections" button to the Ingredients tab header area (alongside any existing controls). Style: `btn-ghost` or secondary variant.

### Modal contents

List of all sections (from `storeSections`), each row showing:
- Emoji (editable inline, same input approach as Part 6)
- Section name (editable inline text input)
- Item count (how many ingredients use this section — computed client-side from `ingredients`)
- Delete button (disabled if it's the only section)

Delete flow:
1. Click delete → inline confirmation within the row
2. If section has 0 ingredients: delete immediately
3. If section has ingredients: show two radio options — "Move to Unassigned" or "Merge into [dropdown of other sections]" — then confirm

Add Section:
- Input at the bottom of the list: name + emoji, "Add" button → POST

---

## Part 8: Cleanup

- Add `.superpowers/` to `.gitignore` (currently missing).
- Migrate `N/A` → `Unassigned`: update all ingredients in `data/ingredients.json` with `storeSection === "N/A"` to `"Unassigned"`. `N/A` is excluded from `storeSections.json`.

---

## Verification

1. **Container display**: Add milk (6 cups/week) to a recipe, open shopping list — confirm `(6 cups) ½ gal` appears, no "Buy:" line below
2. **Cross-domain**: Ingredient with volume recipe usage + weight containers (e.g., flour) — confirm container is recommended correctly
3. **No container**: Garlic (cloves) — confirm just `8 cloves` bold, no parens
4. **Section emojis**: Shopping list headers show 🥛 Dairy, 🥦 Produce, etc.
5. **Inline emoji edit**: Click emoji in section header → input appears → save → header updates
6. **Manage Sections modal**: Open from Ingredients tab → edit name, emoji, delete with merge/uncategorize → ingredients update accordingly
7. Run `npm test` — no regressions
8. Run `npm run lint` — under 50 warnings
