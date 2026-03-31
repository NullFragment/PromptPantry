---
title: Store Section Inline Creation Unification
date: 2026-03-30
status: approved
---

# Store Section Inline Creation Unification

## Problem

The ingredient edit/create panel allows users to create a new store section inline via a
plain text input. This path never calls `POST /api/store-sections`, so the section is only
stored as a string on the ingredient's `storeSection` field — it is never written to
`storeSections.json`. As a result, the section does not appear in the Manage Sections modal
or any UI that reads the canonical section list. Additionally, store sections are not sorted
consistently across all display surfaces.

## Goals

- Make the inline "add new section" flow identical to the standalone Manage Sections flow:
  same emoji + name editor UI, same API call, same validation.
- Remove the deferred section-creation logic from the ingredient save handler.
- Ensure store sections are always displayed alphabetically with "Unassigned" pinned last,
  across every surface.

---

## Design

### 1. New shared component: `NewSectionForm`

**File:** `src/components/ingredients/NewSectionForm.tsx`

Extracted from `ManageSectionsModal`. Renders:

- Emoji input
- Section name text input
- Confirm and Cancel buttons

Handles local validation: empty name rejection, case-insensitive duplicate detection against
an `existingSections: string[]` prop. Makes no API calls itself — purely presentational.

**Props:**

| Prop | Type | Description |
|------|------|-------------|
| `existingSections` | `string[]` | Used for client-side duplicate detection |
| `onSave` | `(name: string, emoji?: string) => Promise<{ success: boolean; error?: string }>` | Called on confirm; the component owns its own loading state (disables confirm button, shows spinner during the async call) |
| `onCancel` | `() => void` | Called on cancel |

`NewSectionForm` owns its own `isSaving` state internally. The confirm button is disabled
and shows a spinner while `onSave` is in flight. Enter on the name input triggers confirm
(preserving the existing `ManageSectionsModal` keyboard behavior).

**`ManageSectionsModal` isSaving split:** The current top-level `isSaving` that gates all
three operations (add, edit, delete) is replaced as follows:
- Add path: delegates to `NewSectionForm`'s internal `isSaving`.
- Edit path: gets its own local `isSaving` state.
- Delete path: gets its own local `isSaving` state (independent of edit).

Each operation is independently gated; no path blocks another.

`ManageSectionsModal` is updated to use `NewSectionForm` in place of its current inline
editor, with no change to its external behavior.

### 2. Updated `NameAndSectionFields` flow

When the user selects "Add new section…" from the store section dropdown:

1. The dropdown is replaced by `NewSectionForm` rendered inline.
2. On confirm, `NameAndSectionFields` calls `saveSection` (from `useStoreSections`, passed
   down as a prop from `Ingredients.tsx`) — identical to what `ManageSectionsModal` calls.
3. On success, the new section is set as the currently selected dropdown value, exactly as
   if the user had picked an existing section. The form returns to dropdown mode.
4. On error (duplicate, network failure), `NewSectionForm` displays the error inline. The
   ingredient form stays open.
5. On cancel, the dropdown is restored with no section change.

The `saveSection` function is threaded down from `App.tsx` → `Ingredients.tsx` (already
arrives as `onSaveSection` prop) → `IngredientEditForm` (new `saveSection` prop added to
`IngredientEditFormProps`) → `NameAndSectionFields`.

`saveSection` from `useStoreSections` has the signature
`(section: Partial<StoreSectionDefinition> & { name: string }, isNew: boolean) => Promise<SaveSectionResult>`.
`NewSectionForm.onSave` expects `(name: string, emoji?: string) => Promise<{ success, error? }>`.
`NameAndSectionFields` bridges these with an adapter lambda:
`(name, emoji) => saveSection({ name, emoji }, true)`.

**`ingredientFormTypes.ts`:** Remove `isNewSection: boolean` and `newSectionName: string`
fields — they are no longer needed.

**`Ingredients.tsx`:** Remove the deferred section-creation block in the ingredient save
handler. By the time the user saves an ingredient, the section already exists in
`storeSections.json`.

### 3. Consistent sorting

`sortSectionsWithUnassignedLast` (already in `storeSectionUtils.ts`) sorts alphabetically
with "Unassigned" pinned last. Two changes needed:

1. **`useStoreSections`** — apply `sortSectionsWithUnassignedLast` after fetch and after
   every mutation. `sortSectionsWithUnassignedLast` operates on `string[]`; since
   `useStoreSections` stores `StoreSectionDefinition[]`, sort by mapping to names, sorting,
   then re-mapping back to objects:
   `defs.sort((a, b) => sortSectionsWithUnassignedLast([a.name, b.name])[0] === a.name ? -1 : 1)`
   — or introduce a thin `sortSectionDefs(defs: StoreSectionDefinition[])` helper in
   `storeSectionUtils.ts` that wraps the existing utility. The helper approach is preferred
   for readability. This fixes `NameAndSectionFields` dropdown and `ManageSectionsModal`.

2. **`Ingredients.tsx`** — the `storeSections` memo (line ~136) maps `storeSectionDefs`
   to name strings without sorting. Apply `sortSectionsWithUnassignedLast` here so the
   toolbar filter dropdown is also sorted.

### 4. Bulk section assignment path

`Ingredients.tsx`'s `SelectionActionBar` has a "New section…" option in the bulk section
assignment dropdown. `handleBulkApplyNewSection` writes the section name to all selected
ingredients but never calls `POST /api/store-sections` — the same bug as the inline
ingredient edit path.

Fix: `handleBulkApplyNewSection` becomes `async`. Before bulk-applying the section to
ingredients, it calls `await onSaveSection({ name }, true)`. If section creation fails the
function returns early — the bulk-apply is aborted and an error is surfaced to the user. If
it succeeds, `isBulkSettingSection` is set true around the ingredient update loop as today.

---

## File Inventory

| File                                                    | Change                                                                                                       |
|---------------------------------------------------------|--------------------------------------------------------------------------------------------------------------|
| `src/components/ingredients/NewSectionForm.tsx`         | Create — extracted + generalized from ManageSectionsModal                                                    |
| `src/components/ingredients/ManageSectionsModal.tsx`    | Update — use NewSectionForm; split isSaving into per-operation local state                                   |
| `src/components/ingredients/NameAndSectionFields.tsx`   | Update — use NewSectionForm; bridge to saveSection via adapter lambda                                        |
| `src/components/ingredients/IngredientEditForm.tsx`     | Update — add saveSection prop to IngredientEditFormProps; thread to NameAndSectionFields                     |
| `src/components/ingredients/ingredientFormTypes.ts`     | Update — remove isNewSection, newSectionName                                                                 |
| `src/components/Ingredients.tsx`                        | Update — remove deferred section-creation; pass onSaveSection to IngredientEditForm; fix bulk path; sort memo |
| `src/hooks/useStoreSections.ts`                         | Update — apply sortSectionDefs after fetch and mutations                                                     |
| `src/utils/storeSectionUtils.ts`                        | Update — add sortSectionDefs(defs: StoreSectionDefinition[]) helper                                          |

---

## Error Handling

- Section creation failure in inline flow: error shown inside `NewSectionForm`, ingredient
  form remains open, no data is lost.
- Duplicate section name: caught by `NewSectionForm` local validation before API call where
  possible; server-side duplicate rejection surfaced as an inline error if it slips through.

---

## Testing

- `NewSectionForm` gets its own direct tests: renders emoji + name inputs; Enter on name
  triggers confirm; confirm calls `onSave` and shows spinner; `onSave` failure shows inline
  error; cancel calls `onCancel`; duplicate name shows validation error without calling
  `onSave`. Do not rely on `ManageSectionsModal` tests for implicit coverage — existing
  tests that interact with the inline add inputs will need to be updated to work through
  `NewSectionForm`.
- `NameAndSectionFields` — new tests:
  - Selecting "Add new section…" renders `NewSectionForm`.
  - Successful submit calls `saveSection` and selects the new section in the dropdown.
  - Failed submit shows inline error, dropdown not changed.
  - Cancel restores the dropdown.
- `useStoreSections` — assert returned list is sorted with Unassigned last after fetch and
  after create/update/delete.
- `Ingredients.tsx` bulk path — assert that `handleBulkApplyNewSection` calls
  `onSaveSection` before updating ingredient sections.
