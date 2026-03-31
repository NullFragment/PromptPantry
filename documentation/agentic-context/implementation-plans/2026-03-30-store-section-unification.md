# Store Section Unification Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or
> superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Unify the inline "add new section" flow with the standalone Manage Sections flow so every section
creation path calls `POST /api/store-sections`, and ensure sections are always sorted alphabetically with
"Unassigned" last.

**Architecture:** Extract a shared `NewSectionForm` component from `ManageSectionsModal`. Wire it into
`NameAndSectionFields` (inline ingredient edit) and fix `handleBulkApplyNewSection` in `Ingredients.tsx`.
Add a `sortSectionDefs` helper and apply it consistently in `useStoreSections`.

**Tech Stack:** React, TypeScript, Vitest, @testing-library/react

**Design document:** [Store Section Unification Design](../agent-designs/2026-03-30-store-section-unification-design.md)

---

## File Inventory

| File                                                       | Change                                                       |
|------------------------------------------------------------|--------------------------------------------------------------|
| `src/utils/storeSectionUtils.ts`                           | Add `sortSectionDefs(defs: StoreSectionDefinition[])` helper |
| `src/hooks/useStoreSections.ts`                            | Apply `sortSectionDefs` after fetch and every mutation       |
| `src/components/ingredients/NewSectionForm.tsx`            | Create — extracted + generalized from ManageSectionsModal    |
| `src/components/ingredients/ManageSectionsModal.tsx`       | Use NewSectionForm; split shared isSaving into per-op state  |
| `src/components/ingredients/ingredientFormTypes.ts`        | Remove `isNewSection` and `newSectionName`                   |
| `src/components/ingredients/IngredientEditForm.tsx`        | Add `saveSection` prop; thread to NameAndSectionFields       |
| `src/components/ingredients/NameAndSectionFields.tsx`      | Use NewSectionForm; bridge via adapter lambda                |
| `src/components/Ingredients.tsx`                           | Remove deferred creation; fix bulk path; sort memo           |
| `test/utils/storeSectionUtils.test.ts`                     | Create — tests for `sortSectionDefs`                         |
| `test/hooks/useStoreSections.test.ts`                      | Create — assert sorted output after fetch and mutations      |
| `test/components/ingredients/NewSectionForm.test.tsx`      | Create — direct unit tests for NewSectionForm                |
| `test/components/ingredients/NameAndSectionFields.test.tsx`| Create — new section flow tests                              |

---

## Task 1: Add `sortSectionDefs` to storeSectionUtils

**Files:**

- Modify: `prompt-pantry-app/src/utils/storeSectionUtils.ts`
- Create: `prompt-pantry-app/test/utils/storeSectionUtils.test.ts`

### Step 1.1 — Write the failing test

```typescript
// test/utils/storeSectionUtils.test.ts
import { describe, it, expect } from 'vitest';
import { sortSectionDefs, sortSectionsWithUnassignedLast } from '../../src/utils/storeSectionUtils';
import type { StoreSectionDefinition } from '../../src/types';

describe('sortSectionDefs', () => {
    it('sorts definitions alphabetically by name', () => {
        const input: StoreSectionDefinition[] = [
            { name: 'Produce' },
            { name: 'Dairy' },
            { name: 'Meat' },
        ];
        const result = sortSectionDefs(input);
        expect(result.map(d => d.name)).toEqual(['Dairy', 'Meat', 'Produce']);
    });

    it('pins Unassigned last regardless of alphabetical position', () => {
        const input: StoreSectionDefinition[] = [
            { name: 'Unassigned' },
            { name: 'Produce' },
            { name: 'Dairy' },
        ];
        const result = sortSectionDefs(input);
        expect(result.map(d => d.name)).toEqual(['Dairy', 'Produce', 'Unassigned']);
    });

    it('preserves emoji field when present', () => {
        const input: StoreSectionDefinition[] = [
            { name: 'Produce', emoji: '🥦' },
            { name: 'Dairy', emoji: '🥛' },
        ];
        const result = sortSectionDefs(input);
        expect(result[0]).toEqual({ name: 'Dairy', emoji: '🥛' });
        expect(result[1]).toEqual({ name: 'Produce', emoji: '🥦' });
    });

    it('returns empty array unchanged', () => {
        expect(sortSectionDefs([])).toEqual([]);
    });
});
```

- [ ] **Step 1.1:** Write the test file above at `prompt-pantry-app/test/utils/storeSectionUtils.test.ts`.

- [ ] **Step 1.2:** Run the test to verify it fails.

  Run: `cd prompt-pantry-app && npx vitest run test/utils/storeSectionUtils.test.ts`

  Expected: FAIL with "sortSectionDefs is not a function" (or similar import error).

- [ ] **Step 1.3:** Add `sortSectionDefs` to `storeSectionUtils.ts`.

  Read `prompt-pantry-app/src/utils/storeSectionUtils.ts` first, then add after the existing
  `sortSectionsWithUnassignedLast` function:

  ```typescript
  export function sortSectionDefs(defs: StoreSectionDefinition[]): StoreSectionDefinition[] {
      const sorted = [...defs];
      sorted.sort((a, b) => {
          const names = sortSectionsWithUnassignedLast([a.name, b.name]);
          return names[0] === a.name ? -1 : 1;
      });
      return sorted;
  }
  ```

- [ ] **Step 1.4:** Run the test to verify it passes.

  Run: `cd prompt-pantry-app && npx vitest run test/utils/storeSectionUtils.test.ts`

  Expected: All 4 tests PASS.

- [ ] **Step 1.5:** Commit.

  ```bash
  git add prompt-pantry-app/src/utils/storeSectionUtils.ts \
          prompt-pantry-app/test/utils/storeSectionUtils.test.ts
  git commit -m "Add sortSectionDefs helper to storeSectionUtils"
  ```

---

## Task 2: Apply sorting in `useStoreSections`

**Files:**

- Modify: `prompt-pantry-app/src/hooks/useStoreSections.ts`
- Create: `prompt-pantry-app/test/hooks/useStoreSections.test.ts`

### Background

`useStoreSections` calls `fetchStoreSections()` after every mutation. `fetchStoreSections` calls
`setStoreSections(result.data)`. The sort should be applied at that single call site.

- [ ] **Step 2.1:** Write the failing test.

  ```typescript
  // test/hooks/useStoreSections.test.ts
  import { renderHook, act } from '@testing-library/react';
  import { describe, it, expect, vi, beforeEach } from 'vitest';
  import { useStoreSections } from '../../src/hooks/useStoreSections';

  // Mock apiRequest to return controlled data
  vi.mock('../../src/utils/apiUtils', () => ({
      apiRequest: vi.fn(),
  }));

  import { apiRequest } from '../../src/utils/apiUtils';
  const mockApiRequest = vi.mocked(apiRequest);

  const unsortedSections = [
      { name: 'Produce' },
      { name: 'Unassigned' },
      { name: 'Dairy' },
      { name: 'Meat' },
  ];

  const sortedNames = ['Dairy', 'Meat', 'Produce', 'Unassigned'];

  describe('useStoreSections', () => {
      beforeEach(() => {
          vi.clearAllMocks();
      });

      it('returns sections sorted alphabetically with Unassigned last after fetch', async () => {
          mockApiRequest.mockResolvedValueOnce({ success: true, data: unsortedSections });

          const { result } = renderHook(() => useStoreSections());
          await act(async () => {});

          expect(result.current.storeSectionDefs.map(d => d.name)).toEqual(sortedNames);
      });

      it('returns sections sorted after a successful create', async () => {
          // initial fetch
          mockApiRequest.mockResolvedValueOnce({ success: true, data: [] });
          // POST /api/store-sections
          mockApiRequest.mockResolvedValueOnce({ success: true, data: { name: 'Bakery' } });
          // re-fetch after create
          mockApiRequest.mockResolvedValueOnce({
              success: true,
              data: [{ name: 'Produce' }, { name: 'Bakery' }, { name: 'Unassigned' }],
          });

          const { result } = renderHook(() => useStoreSections());
          await act(async () => {});

          await act(async () => {
              await result.current.saveSection({ name: 'Bakery' }, true);
          });

          expect(result.current.storeSectionDefs.map(d => d.name)).toEqual([
              'Bakery', 'Produce', 'Unassigned',
          ]);
      });
  });
  ```

- [ ] **Step 2.2:** Run the test to verify it fails.

  Run: `cd prompt-pantry-app && npx vitest run test/hooks/useStoreSections.test.ts`

  Expected: FAIL — sections are returned in raw fetch order, not sorted.

- [ ] **Step 2.3:** Apply `sortSectionDefs` in `useStoreSections`.

  Read `prompt-pantry-app/src/hooks/useStoreSections.ts`. Find every `setStoreSections(...)` call
  (there should be one inside `fetchStoreSections`). Change it to:

  ```typescript
  setStoreSections(sortSectionDefs(result.data ?? []));
  ```

  Add the import at the top of the file:

  ```typescript
  import { sortSectionDefs } from '../utils/storeSectionUtils';
  ```

- [ ] **Step 2.4:** Run the test to verify it passes.

  Run: `cd prompt-pantry-app && npx vitest run test/hooks/useStoreSections.test.ts`

  Expected: Both tests PASS.

- [ ] **Step 2.5:** Run the full test suite to check for regressions.

  Run: `cd prompt-pantry-app && npm test`

  Expected: All tests pass (or pre-existing failures only — no new failures introduced).

- [ ] **Step 2.6:** Commit.

  ```bash
  git add prompt-pantry-app/src/hooks/useStoreSections.ts \
          prompt-pantry-app/test/hooks/useStoreSections.test.ts
  git commit -m "Sort store sections after fetch and mutations"
  ```

---

## Task 3: Create `NewSectionForm` component

**Files:**

- Create: `prompt-pantry-app/src/components/ingredients/NewSectionForm.tsx`
- Create: `prompt-pantry-app/test/components/ingredients/NewSectionForm.test.tsx`

### Background

Extract the add-section inline editor from `ManageSectionsModal`. The form renders emoji + name inputs,
handles client-side duplicate detection, owns its own `isSaving` state, and makes no API calls itself —
the parent passes an `onSave` callback.

- [ ] **Step 3.1:** Write the failing tests.

  First, create the directory:
  ```bash
  mkdir -p prompt-pantry-app/test/components/ingredients
  ```

  ```typescript
  // test/components/ingredients/NewSectionForm.test.tsx
  import { render, screen, fireEvent, waitFor } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import { NewSectionForm } from '../../../src/components/ingredients/NewSectionForm';

  describe('NewSectionForm', () => {
      it('renders emoji input and name input', () => {
          render(
              <NewSectionForm
                  existingSections={[]}
                  onSave={vi.fn()}
                  onCancel={vi.fn()}
              />
          );
          expect(screen.getByPlaceholderText(/emoji/i)).toBeInTheDocument();
          expect(screen.getByPlaceholderText(/section name/i)).toBeInTheDocument();
      });

      it('calls onCancel when cancel button is clicked', () => {
          const onCancel = vi.fn();
          render(
              <NewSectionForm existingSections={[]} onSave={vi.fn()} onCancel={onCancel} />
          );
          fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
          expect(onCancel).toHaveBeenCalledOnce();
      });

      it('shows validation error and does not call onSave when name is empty', async () => {
          const onSave = vi.fn();
          render(
              <NewSectionForm existingSections={[]} onSave={onSave} onCancel={vi.fn()} />
          );
          fireEvent.click(screen.getByRole('button', { name: /add/i }));
          expect(onSave).not.toHaveBeenCalled();
          expect(screen.getByText(/name is required/i)).toBeInTheDocument();
      });

      it('shows duplicate error and does not call onSave when name matches existing section', async () => {
          const onSave = vi.fn();
          render(
              <NewSectionForm
                  existingSections={['Produce']}
                  onSave={onSave}
                  onCancel={vi.fn()}
              />
          );
          fireEvent.change(screen.getByPlaceholderText(/section name/i), {
              target: { value: 'produce' },
          });
          fireEvent.click(screen.getByRole('button', { name: /add/i }));
          expect(onSave).not.toHaveBeenCalled();
          expect(screen.getByText(/already exists/i)).toBeInTheDocument();
      });

      it('calls onSave with name and emoji on confirm', async () => {
          const onSave = vi.fn().mockResolvedValue({ success: true });
          render(
              <NewSectionForm existingSections={[]} onSave={onSave} onCancel={vi.fn()} />
          );
          fireEvent.change(screen.getByPlaceholderText(/emoji/i), {
              target: { value: '🥦' },
          });
          fireEvent.change(screen.getByPlaceholderText(/section name/i), {
              target: { value: 'Produce' },
          });
          fireEvent.click(screen.getByRole('button', { name: /add/i }));
          await waitFor(() => expect(onSave).toHaveBeenCalledWith('Produce', '🥦'));
      });

      it('disables confirm button while onSave is in flight', async () => {
          let resolve: (v: { success: boolean }) => void;
          const onSave = vi.fn().mockReturnValue(new Promise(r => { resolve = r; }));
          render(
              <NewSectionForm existingSections={[]} onSave={onSave} onCancel={vi.fn()} />
          );
          fireEvent.change(screen.getByPlaceholderText(/section name/i), {
              target: { value: 'Bulk' },
          });
          fireEvent.click(screen.getByRole('button', { name: /add/i }));
          await waitFor(() => expect(screen.getByRole('button', { name: /add/i })).toBeDisabled());
          resolve!({ success: true });
      });

      it('shows inline error when onSave returns failure', async () => {
          const onSave = vi.fn().mockResolvedValue({ success: false, error: 'Server rejected it' });
          render(
              <NewSectionForm existingSections={[]} onSave={onSave} onCancel={vi.fn()} />
          );
          fireEvent.change(screen.getByPlaceholderText(/section name/i), {
              target: { value: 'Produce' },
          });
          fireEvent.click(screen.getByRole('button', { name: /add/i }));
          await waitFor(() =>
              expect(screen.getByText(/server rejected it/i)).toBeInTheDocument()
          );
      });

      it('triggers confirm when Enter is pressed in the name input', async () => {
          const onSave = vi.fn().mockResolvedValue({ success: true });
          render(
              <NewSectionForm existingSections={[]} onSave={onSave} onCancel={vi.fn()} />
          );
          fireEvent.change(screen.getByPlaceholderText(/section name/i), {
              target: { value: 'Produce' },
          });
          fireEvent.keyDown(screen.getByPlaceholderText(/section name/i), { key: 'Enter' });
          await waitFor(() => expect(onSave).toHaveBeenCalledWith('Produce', ''));
      });
  });
  ```

- [ ] **Step 3.2:** Run the tests to verify they fail.

  Run: `cd prompt-pantry-app && npx vitest run test/components/ingredients/NewSectionForm.test.tsx`

  Expected: FAIL — module not found.

- [ ] **Step 3.3:** Implement `NewSectionForm`.

  Reference `ManageSectionsModal.tsx` lines ~138–175 (the `handleAddSection` path + its inline inputs)
  for the exact UI pattern to replicate.

  ```typescript
  // src/components/ingredients/NewSectionForm.tsx
  import { useState } from 'react';
  import { Check, X } from 'lucide-react';

  export interface NewSectionFormProps {
      existingSections: string[];
      onSave: (name: string, emoji?: string) => Promise<{ success: boolean; error?: string }>;
      onCancel: () => void;
  }

  export function NewSectionForm({ existingSections, onSave, onCancel }: NewSectionFormProps) {
      const [name, setName] = useState('');
      const [emoji, setEmoji] = useState('');
      const [error, setError] = useState<string | null>(null);
      const [isSaving, setIsSaving] = useState(false);

      const handleConfirm = async () => {
          const trimmedName = name.trim();
          if (!trimmedName) {
              setError('Name is required');
              return;
          }
          if (existingSections.some(s => s.toLowerCase() === trimmedName.toLowerCase())) {
              setError(`"${trimmedName}" already exists`);
              return;
          }
          setError(null);
          setIsSaving(true);
          const result = await onSave(trimmedName, emoji.trim());
          setIsSaving(false);
          if (!result.success) {
              setError(result.error ?? 'Failed to save section');
          }
      };

      const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
          if (e.key === 'Enter') {
              e.preventDefault();
              handleConfirm();
          }
      };

      return (
          <div className="flex items-center gap-2 mt-2">
              <input
                  type="text"
                  value={emoji}
                  onChange={e => setEmoji(e.target.value)}
                  placeholder="Emoji"
                  className="w-16 px-2 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                             bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                             focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm text-center"
                  maxLength={4}
              />
              <div className="flex-1">
                  <input
                      type="text"
                      value={name}
                      onChange={e => setName(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Section name"
                      autoFocus
                      className="w-full px-3 py-1.5 border border-gray-300 dark:border-gray-600 rounded-lg
                                 bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                                 focus:ring-2 focus:ring-indigo-500 focus:border-transparent text-sm"
                  />
                  {error && (
                      <p className="mt-1 text-xs text-red-600 dark:text-red-400">{error}</p>
                  )}
              </div>
              <button
                  type="button"
                  onClick={handleConfirm}
                  disabled={isSaving}
                  className="p-1.5 text-green-600 hover:text-green-700 dark:text-green-400
                             dark:hover:text-green-300 transition-colors disabled:opacity-50"
                  aria-label="Add"
              >
                  <Check className="h-4 w-4" />
              </button>
              <button
                  type="button"
                  onClick={onCancel}
                  className="p-1.5 text-gray-400 hover:text-red-500 transition-colors"
                  aria-label="Cancel"
              >
                  <X className="h-4 w-4" />
              </button>
          </div>
      );
  }
  ```

- [ ] **Step 3.4:** Run the tests to verify they pass.

  Run: `cd prompt-pantry-app && npx vitest run test/components/ingredients/NewSectionForm.test.tsx`

  Expected: All 8 tests PASS.

- [ ] **Step 3.5:** Commit.

  ```bash
  git add prompt-pantry-app/src/components/ingredients/NewSectionForm.tsx \
          prompt-pantry-app/test/components/ingredients/NewSectionForm.test.tsx
  git commit -m "Add NewSectionForm shared component"
  ```

---

## Task 4: Update `ManageSectionsModal` to use `NewSectionForm`

**Files:**

- Modify: `prompt-pantry-app/src/components/ingredients/ManageSectionsModal.tsx`

### Background

`ManageSectionsModal` has a single `isSaving` state that gates add, edit, and delete operations.
Replace the inline add-section editor with `<NewSectionForm>` and give each operation (add, edit,
delete) its own `isSaving` local state so they cannot block each other.

- [ ] **Step 4.1:** Read `ManageSectionsModal.tsx` in full before editing.

- [ ] **Step 4.2:** Make the changes.

  **a. Replace shared `isSaving` state with per-operation states.**

  Remove:
  ```typescript
  const [isSaving, setIsSaving] = useState(false);
  ```

  Add:
  ```typescript
  const [isAddSaving, setIsAddSaving] = useState(false);  // owned by NewSectionForm internally
  const [isEditSaving, setIsEditSaving] = useState(false);
  const [isDeleteSaving, setIsDeleteSaving] = useState(false);
  ```

  Note: `isAddSaving` doesn't need to be used directly — `NewSectionForm` owns its own saving state.
  You can omit `isAddSaving` entirely and just use `isEditSaving` and `isDeleteSaving`.

  **b. Replace the inline add-section inputs with `<NewSectionForm>`.**

  Remove the inline `isAdding` inputs block (the emoji input + name input + check/X buttons in the
  "add" conditional). Replace with:

  ```tsx
  {isAdding && (
      <NewSectionForm
          existingSections={sections.map(s => s.name)}
          onSave={async (name, emoji) => {
              const result = await onSave({ name, emoji }, true);
              if (result.success) setIsAdding(false);
              return result;
          }}
          onCancel={() => setIsAdding(false)}
      />
  )}
  ```

  **c. Add per-operation `isSaving` to the edit and delete paths.**

  For the edit save handler (currently uses `setIsSaving`): switch to `setIsEditSaving`.
  For the delete handler: switch to `setIsDeleteSaving`.
  Update all references to the old shared `isSaving` in the JSX (button `disabled` props,
  spinner conditions) to use the per-operation variant.

  **d. Add the import for `NewSectionForm`.**

  ```typescript
  import { NewSectionForm } from './NewSectionForm';
  ```

- [ ] **Step 4.3:** Run the full test suite.

  Run: `cd prompt-pantry-app && npm test`

  Expected: All tests pass. Fix any failures before continuing.

- [ ] **Step 4.4:** Commit.

  ```bash
  git add prompt-pantry-app/src/components/ingredients/ManageSectionsModal.tsx
  git commit -m "Use NewSectionForm in ManageSectionsModal; split isSaving"
  ```

---

## Task 5: Remove `isNewSection` / `newSectionName` from `ingredientFormTypes`

**Files:**

- Modify: `prompt-pantry-app/src/components/ingredients/ingredientFormTypes.ts`

### Background

These two fields are used by the old inline-creation path in `NameAndSectionFields` and the
`handleSave`/`selectSection` functions in `Ingredients.tsx`. They will be removed in this task
and the downstream callers cleaned up in Tasks 6–8.

- [ ] **Step 5.1:** Read `ingredientFormTypes.ts` in full.

- [ ] **Step 5.2:** Remove the two fields from `EditFormData` and from `DEFAULT_FORM_DATA`.

  In `EditFormData`:
  - Remove `isNewSection: boolean;`
  - Remove `newSectionName: string;`

  In `DEFAULT_FORM_DATA`:
  - Remove `isNewSection: false,`
  - Remove `newSectionName: '',`

- [ ] **Step 5.3:** Run the TypeScript compiler to find all call sites that now fail.

  Run: `cd prompt-pantry-app && npx tsc --noEmit 2>&1 | head -50`

  Expected: Errors in `IngredientEditForm.tsx`, `NameAndSectionFields.tsx`, `Ingredients.tsx`.
  These are intentional — they will be fixed in Tasks 6–8.

- [ ] **Step 5.4:** Commit just the types change.

  ```bash
  git add prompt-pantry-app/src/components/ingredients/ingredientFormTypes.ts
  git commit -m "Remove isNewSection, newSectionName from EditFormData"
  ```

---

## Task 6: Thread `saveSection` through `IngredientEditForm`

**Files:**

- Modify: `prompt-pantry-app/src/components/ingredients/IngredientEditForm.tsx`

### Background

`IngredientEditForm` needs a new `saveSection` prop so it can pass it down to `NameAndSectionFields`.
The prop type mirrors `useStoreSections.saveSection` but the component only cares about the
`(name, emoji) => Promise<{success, error?}>` shape (bridged by a lambda in `NameAndSectionFields`).
Pass the full `saveSection` from `useStoreSections` — the adapter lambda lives in `NameAndSectionFields`.

- [ ] **Step 6.1:** Read `IngredientEditForm.tsx` in full.

- [ ] **Step 6.2:** Add `saveSection` to `IngredientEditFormProps` and pass it to `NameAndSectionFields`.

  In `IngredientEditFormProps`, add:
  ```typescript
  saveSection: (section: { name: string; emoji?: string }, isNew: boolean) => Promise<{ success: boolean; error?: string }>;
  ```

  In the destructured parameters, add `saveSection`.

  In the `<NameAndSectionFields>` JSX call, add:
  ```tsx
  saveSection={saveSection}
  ```

  Remove the now-broken props that referenced `isNewSection` / `newSectionName`:
  - `isNewSection={formData.isNewSection}` → remove
  - `newSectionName={formData.newSectionName}` → remove
  - `onNewSectionNameChange={...}` → remove

- [ ] **Step 6.3:** Run `npx tsc --noEmit` to confirm the type errors are now limited to
  `NameAndSectionFields.tsx` and `Ingredients.tsx`.

- [ ] **Step 6.4:** Commit.

  ```bash
  git add prompt-pantry-app/src/components/ingredients/IngredientEditForm.tsx
  git commit -m "Add saveSection prop to IngredientEditForm"
  ```

---

## Task 7: Update `NameAndSectionFields` to use `NewSectionForm`

**Files:**

- Modify: `prompt-pantry-app/src/components/ingredients/NameAndSectionFields.tsx`
- Create: `prompt-pantry-app/test/components/ingredients/NameAndSectionFields.test.tsx`

### Background

Currently `NameAndSectionFields` renders a plain text input when `isNewSection` is true. Replace
this with `<NewSectionForm>`. Remove the old `isNewSection`, `newSectionName`, and
`onNewSectionNameChange` props. Add a `saveSection` prop and derive the `isNewSection` display
mode with local state.

- [ ] **Step 7.1:** Write the failing tests for the new behavior.

  ```typescript
  // test/components/ingredients/NameAndSectionFields.test.tsx
  import { render, screen, fireEvent, waitFor } from '@testing-library/react';
  import { describe, it, expect, vi } from 'vitest';
  import { NameAndSectionFields } from '../../../src/components/ingredients/NameAndSectionFields';

  const defaultProps = {
      name: '',
      onNameChange: vi.fn(),
      storeSection: '',
      onSelectSection: vi.fn(),
      storeSections: ['Dairy', 'Meat', 'Produce'],
      saveSection: vi.fn(),
      nameAutoFocus: false,
  };

  describe('NameAndSectionFields', () => {
      it('renders the section dropdown with existing options', () => {
          render(<NameAndSectionFields {...defaultProps} />);
          const select = screen.getByRole('combobox');
          expect(select).toBeInTheDocument();
          // "Add new section…" option should be present
          expect(screen.getByRole('option', { name: /add new section/i })).toBeInTheDocument();
      });

      it('shows NewSectionForm when "Add new section…" is selected', () => {
          render(<NameAndSectionFields {...defaultProps} />);
          fireEvent.change(screen.getByRole('combobox'), { target: { value: '__new__' } });
          expect(screen.getByPlaceholderText(/section name/i)).toBeInTheDocument();
      });

      it('restores dropdown and calls onSelectSection on successful NewSectionForm submit', async () => {
          const saveSection = vi.fn().mockResolvedValue({ success: true });
          const onSelectSection = vi.fn();
          render(
              <NameAndSectionFields
                  {...defaultProps}
                  saveSection={saveSection}
                  onSelectSection={onSelectSection}
              />
          );
          fireEvent.change(screen.getByRole('combobox'), { target: { value: '__new__' } });
          fireEvent.change(screen.getByPlaceholderText(/section name/i), {
              target: { value: 'Bakery' },
          });
          fireEvent.click(screen.getByRole('button', { name: /add/i }));
          await waitFor(() => expect(saveSection).toHaveBeenCalled());
          await waitFor(() => expect(onSelectSection).toHaveBeenCalledWith('Bakery'));
          // dropdown should be visible again (NewSectionForm unmounted)
          expect(screen.queryByPlaceholderText(/section name/i)).not.toBeInTheDocument();
      });

      it('keeps NewSectionForm open on failed submit', async () => {
          const saveSection = vi.fn().mockResolvedValue({ success: false, error: 'Duplicate' });
          render(
              <NameAndSectionFields
                  {...defaultProps}
                  saveSection={saveSection}
              />
          );
          fireEvent.change(screen.getByRole('combobox'), { target: { value: '__new__' } });
          fireEvent.change(screen.getByPlaceholderText(/section name/i), {
              target: { value: 'Produce' },
          });
          fireEvent.click(screen.getByRole('button', { name: /add/i }));
          await waitFor(() => expect(screen.getByText(/duplicate/i)).toBeInTheDocument());
          // NewSectionForm still open
          expect(screen.getByPlaceholderText(/section name/i)).toBeInTheDocument();
      });

      it('restores dropdown on cancel', () => {
          render(<NameAndSectionFields {...defaultProps} />);
          fireEvent.change(screen.getByRole('combobox'), { target: { value: '__new__' } });
          fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
          expect(screen.queryByPlaceholderText(/section name/i)).not.toBeInTheDocument();
          expect(screen.getByRole('combobox')).toBeInTheDocument();
      });
  });
  ```

- [ ] **Step 7.2:** Run the tests to verify they fail.

  Run: `cd prompt-pantry-app && npx vitest run test/components/ingredients/NameAndSectionFields.test.tsx`

  Expected: FAIL — old prop shape still in place.

- [ ] **Step 7.3:** Rewrite `NameAndSectionFields`.

  Read the current file in full first. Then:

  **Remove** props: `isNewSection`, `newSectionName`, `onNewSectionNameChange`.

  **Add** prop: `saveSection: (section: { name: string; emoji?: string }, isNew: boolean) => Promise<{ success: boolean; error?: string }>`.

  **Add** local state: `const [showNewForm, setShowNewForm] = useState(false);`.

  **In the `onSelectSection` handler call site** (where the dropdown calls back): when `value === '__new__'`,
  set `showNewForm(true)` instead of propagating to `onSelectSection`.

  **Replace** the `isNewSection` conditional block with:

  ```tsx
  {showNewForm ? (
      <NewSectionForm
          existingSections={storeSections}
          onSave={async (name, emoji) => {
              const result = await saveSection({ name, emoji }, true);
              if (result.success) {
                  setShowNewForm(false);
                  onSelectSection(name);
              }
              return result;
          }}
          onCancel={() => setShowNewForm(false)}
      />
  ) : (
      <select
          value={storeSection}
          onChange={e => {
              if (e.target.value === '__new__') {
                  setShowNewForm(true);
              } else {
                  onSelectSection(e.target.value);
              }
          }}
          className="..."
      >
          {/* existing options + "Add new section…" */}
      </select>
  )}
  ```

  Add import:
  ```typescript
  import { NewSectionForm } from './NewSectionForm';
  ```

- [ ] **Step 7.4:** Run the tests to verify they pass.

  Run: `cd prompt-pantry-app && npx vitest run test/components/ingredients/NameAndSectionFields.test.tsx`

  Expected: All 5 tests PASS.

- [ ] **Step 7.5:** Run the full test suite.

  Run: `cd prompt-pantry-app && npm test`

  Expected: All tests pass. Fix any test that previously relied on the old `isNewSection` prop
  shape by updating its usage to match the new API.

- [ ] **Step 7.6:** Commit.

  ```bash
  git add prompt-pantry-app/src/components/ingredients/NameAndSectionFields.tsx \
          prompt-pantry-app/test/components/ingredients/NameAndSectionFields.test.tsx
  git commit -m "Use NewSectionForm in NameAndSectionFields inline flow"
  ```

---

## Task 8: Update `Ingredients.tsx`

**Files:**

- Modify: `prompt-pantry-app/src/components/Ingredients.tsx`

This task touches four things: (a) pass `saveSection` down to `IngredientEditForm`, (b) remove the
deferred section creation from `handleSave`, (c) fix `handleBulkApplyNewSection` to call
`onSaveSection` before bulk-applying, and (d) sort the `storeSections` memo.

- [ ] **Step 8.1:** Read `Ingredients.tsx` in full before editing.

- [ ] **Step 8.2:** Pass `onSaveSection` to `IngredientEditForm` as `saveSection`.

  In `ingredientEditFormProps`, add:
  ```typescript
  saveSection: onSaveSection,
  ```

  `onSaveSection` is already received by `Ingredients` from its parent. Its signature is
  `(section: Partial<StoreSectionDefinition> & { name: string }, isNew: boolean) => Promise<SaveSectionResult>`,
  which is compatible with the new `saveSection` prop type on `IngredientEditForm`.

- [ ] **Step 8.3:** Remove the deferred section-creation block from `handleSave`.

  In `handleSave`, find the block that reads `formData.isNewSection` / `formData.newSectionName`
  (around lines 381–382) and remove it. The `storeSectionInput` line should now simply be:

  ```typescript
  const storeSection = normalizeStoreSection(formData.storeSection);
  ```

  Also remove `isNewSection: false, newSectionName: ''` from the `startEditing` call (Task 5
  already removed them from the type; fix the object literal if it still references them).

- [ ] **Step 8.4:** Remove the now-dead `selectSection` function and its stale state.

  `selectSection` set `isNewSection` / `newSectionName` on `formData`. Since those fields are
  gone, `selectSection` now only needs to handle the `__new__` case (which `NameAndSectionFields`
  now handles internally) and the normal case. Simplify it to:

  ```typescript
  const selectSection = (section: string) => {
      setFormData(prev => ({ ...prev, storeSection: section }));
  };
  ```

  (The `__new__` branch is no longer reached from `IngredientEditForm` — `NameAndSectionFields`
  intercepts it before propagating.)

  Also remove `bulkSectionNewName`, `setBulkSectionNewName` state if they are only used by the
  old bulk path (see Step 8.5).

- [ ] **Step 8.5:** Fix `handleBulkApplyNewSection` to call `onSaveSection` before bulk-applying.

  Current code (lines ~331–338):
  ```typescript
  const handleBulkApplyNewSection = () => {
      const normalized = normalizeStoreSection(bulkSectionNewName);
      if (normalized) {
          handleBulkSetStoreSection(normalized);
          setBulkSectionSelectValue('');
          setBulkSectionNewName('');
      }
  };
  ```

  Replace with:
  ```typescript
  const handleBulkApplyNewSection = async () => {
      const normalized = normalizeStoreSection(bulkSectionNewName);
      if (!normalized) return;
      const result = await onSaveSection({ name: normalized }, true);
      if (!result.success) {
          // surface error — for now set a form error or rely on the existing error surface
          console.error('Failed to create section:', result.error);
          return;
      }
      await handleBulkSetStoreSection(normalized);
      setBulkSectionSelectValue('');
      setBulkSectionNewName('');
  };
  ```

  Note: The call site for `handleBulkApplyNewSection` in the JSX must await it or handle the
  returned Promise. Check that the button's `onClick` is `() => void handleBulkApplyNewSection()`
  or `onClick={handleBulkApplyNewSection}` (the latter is fine since `onClick` ignores the
  returned Promise).

- [ ] **Step 8.6:** Apply sort to the `storeSections` memo.

  Current (line ~136):
  ```typescript
  const storeSections = useMemo(() => storeSectionDefs.map(s => s.name), [storeSectionDefs]);
  ```

  Replace with:
  ```typescript
  import { sortSectionsWithUnassignedLast } from '../utils/storeSectionUtils';

  const storeSections = useMemo(
      () => sortSectionsWithUnassignedLast(storeSectionDefs.map(s => s.name)),
      [storeSectionDefs]
  );
  ```

  (`storeSectionDefs` is already sorted by `useStoreSections`, but this memo filters the
  toolbar filter dropdown — applying the sort here is belt-and-suspenders and matches the design.)

- [ ] **Step 8.7:** Run the full test suite.

  Run: `cd prompt-pantry-app && npm test`

  Expected: All tests pass. If any existing test asserts the old `isNewSection` / `newSectionName`
  field shapes or checks `selectSection` behavior with `__new__`, update those tests to match the
  new API.

- [ ] **Step 8.8:** Commit.

  ```bash
  git add prompt-pantry-app/src/components/Ingredients.tsx
  git commit -m "Wire saveSection, fix bulk path, remove deferred creation"
  ```

---

## Task 9: Final regression pass

- [ ] **Step 9.1:** Run the full test suite one more time from a clean state.

  Run: `cd prompt-pantry-app && npm test`

  Expected: All tests pass.

- [ ] **Step 9.2:** Run the TypeScript compiler to confirm zero type errors.

  Run: `cd prompt-pantry-app && npx tsc --noEmit`

  Expected: No errors.

- [ ] **Step 9.3:** Run ESLint.

  Run: `cd prompt-pantry-app && npm run lint`

  Expected: Zero warnings above the pre-existing threshold (`max-warnings: 50`). Fix any new
  `console.log` violations introduced in Step 8.5 — use `console.error` (already used there).

- [ ] **Step 9.4:** Smoke-test manually (optional but recommended):

  1. Start the dev server: `npm run dev`
  2. Open the Ingredients panel and create a new ingredient.
  3. In the store section dropdown, select "Add new section…".
  4. Verify the emoji + name editor appears (not a plain text box).
  5. Enter an emoji and name, confirm — verify the new section appears selected.
  6. Open Manage Sections — verify the new section is listed there.
  7. Verify sections are alphabetically sorted with Unassigned last in both the dropdown and
     the Manage Sections modal.
  8. Select multiple ingredients and try the bulk "New section…" flow — verify the section
     is created and persisted.
