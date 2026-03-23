# Recipe Management

Recipe listing, filtering, the recipe view/edit modal, and the recipe picker for adding to plans.

---

## Variant Recipes

Variant recipes let you define a **base recipe** once and create multiple **variants** that inherit its core content and add variant-specific ingredients or steps. For example, an "Overnight Oats" base can have variants like "Overnight Oats: Chocolate" or "Overnight Oats: Peanut Butter" that share the same base recipe and add flavor-specific ingredients.

### When to use variants

- You have several recipes that share the same base (ingredients and steps) and differ only by additions (e.g. flavors, toppings).
- You want changes to the base to automatically apply everywhere the variant is displayed.

### Data model

- A **variant** recipe stores:
  - `baseRecipeName`: name of the base recipe (required for variants).
  - `name`: must be `BaseName: VariantName` (e.g. `Overnight Oats: Chocolate`).
  - `ingredientAdditions`: extra ingredients for this variant.
  - `instructionAdditions`: extra instruction steps for this variant.
  - Optional overrides: `tags`, `notes`, `rating`, `isFavorite`, `videoLink`, etc.
- Base ingredients and instructions are **not** stored on the variant; they are loaded from the base recipe when the variant is displayed.

### Creating a variant

1. **From the recipe list (Add Recipe)**  
   Click the plus button to add a new recipe. In the form, use the **"Create as variant of"** dropdown and select a base recipe. The name field becomes `BaseName: ` with an editable variant name (e.g. `Chocolate`). Only non-variant recipes appear in the dropdown.

2. **From a base recipe**  
   Open a recipe that is **not** a variant. In the modal header, click the **"Create variant"** (plus) button. The modal switches to edit mode with that recipe as the base; enter the variant name after the colon.

### Naming convention

- Full name is always **`BaseName: VariantName`**.
- The part before the colon is fixed (from the base); the part after is editable.
- The variant name must not contain a colon.

### Display (view and edit)

- **View mode:** When you open a variant, the app merges the base recipe with the variant’s additions. Ingredients and instructions are shown in two groups:
  - **Base (BaseName)** — read-only, from the base recipe.
  - **Additions** — variant-only ingredients and steps.
- **Edit mode:** The same grouping is used: base group is read-only; only the **Additions** group can be edited (add/remove ingredients or steps). Categories, macros, prep/cook time, and servings are inherited from the base.

### Edge cases

- **Base deleted:** If the base recipe is removed, the variant becomes orphaned. The app still shows the variant but cannot merge base content; only stored additions are shown.
- **Base renamed:** Variants reference the base by name. Renaming the base breaks that link until references are updated; consider avoiding renaming bases that have variants, or updating variant data after a rename.
- **Circular reference:** A variant’s `baseRecipeName` must point to a non-variant recipe (a base). The UI only offers base recipes in the "Create as variant of" dropdown.

## RecipeView (`src/components/RecipeView.tsx`)

Displays the recipe library with search, filter, and sort capabilities.

### Props

| Prop                       | Type                              | Description                |
|----------------------------|-----------------------------------|----------------------------|
| `recipes`                  | `Recipe[]`                        | All recipes                |
| `sortedAndFilteredRecipes` | `Recipe[]`                        | Filtered/sorted recipes    |
| `viewMode`                 | `'grid' \| 'table'`              | Display mode               |
| `setViewMode`              | `function`                        | Change display mode        |
| `searchQuery`              | `string`                          | Search term                |
| `setSearchQuery`           | `function`                        | Update search              |
| `allTags`                  | `string[]`                        | Available tags             |
| `selectedTags`             | `string[]`                        | Active tag filters         |
| `toggleTag`                | `function`                        | Toggle tag filter          |
| `allCategories`            | `string[]`                        | Available categories       |
| `selectedCategories`       | `string[]`                        | Active category filters    |
| `toggleCategory`           | `function`                        | Toggle category filter     |
| `clearFilters`             | `function`                        | Reset all filters          |
| `sortConfig`               | `object`                          | Current sort settings      |
| `handleSort`               | `function`                        | Change sort                |
| `selectedRatings`          | `('up' \| 'down' \| 'neutral')[]`| Active rating filters      |
| `toggleRating`             | `function`                        | Toggle rating filter       |
| `showOnlyFavorites`        | `boolean`                         | Favorites filter           |
| `setShowOnlyFavorites`     | `function`                        | Set favorites filter       |
| `showOnlyNeverCooked`      | `boolean`                         | Never cooked filter        |
| `setShowOnlyNeverCooked`   | `function`                        | Set never cooked filter    |
| `setSelectedRecipe`        | `function`                        | Open recipe modal          |
| `onDeleteRecipes`          | `function`                        | Bulk delete handler        |
| `mealPlan`                 | `MealPlan`                        | For cook history           |
| `multiWeeklyCookPlan`      | `MultiWeeklyCookPlan`             | For cook history           |

### Features

- Grid view with recipe cards
- Table view with sortable columns
- Search by name, category, tag, ingredient
- Multi-select category and tag filtering
- Rating filtering (thumbs up / down / neutral)
- Favorites filtering
- Never cooked filtering
- Cooking frequency tracking display
- Multi-select for bulk deletion
- Invalid recipe warning (admin view)

### View Modes

```mermaid
stateDiagram-v2
    [*] --> grid
    grid --> table: Toggle
    table --> grid: Toggle
```

---

## RecipeModal (`src/components/RecipeModal/`)

Full-featured modal for viewing and editing recipes. Split into a directory with focused subcomponents.

### File Structure

| File                   | Purpose                                        |
|------------------------|------------------------------------------------|
| `index.tsx`            | Modal shell, header, view/edit mode switching  |
| `RecipeViewMode.tsx`   | Read-only recipe display                       |
| `RecipeEditForm.tsx`   | Full edit form with ingredient autocomplete    |
| `RecipeJsonEditor.tsx` | Raw JSON editor for advanced mode              |

### Props (index.tsx)

| Prop                     | Type                    | Description                     |
|--------------------------|-------------------------|---------------------------------|
| `recipe`                 | `Recipe`                | Recipe to display/edit (raw; variants resolved for view) |
| `recipes`                | `Recipe[]`              | All recipes (used to resolve variant → base merge in view) |
| `onClose`                | `function`              | Close handler                   |
| `onSave`                 | `function`              | Save handler                    |
| `onDelete`               | `function`              | Delete handler                  |
| `mealPlan`               | `MealPlan`              | For cook history display        |
| `multiWeeklyCookPlan`    | `MultiWeeklyCookPlan`   | For cook history display        |
| `highlightedIngredients` | `string[]`              | Ingredients to highlight        |
| `ingredientDefinitions`  | `IngredientDefinition[]`| For ingredient autocomplete     |

### Edit Modes

The modal supports two edit modes, toggled by a switch in the header:

- **Form mode** (`RecipeEditForm`): Structured form with fields for name, categories, prep/cook time, servings, macros,
  tags, ingredients (with autocomplete from `ingredientDefinitions`), and instructions. Supports grouped
  ingredients/instructions.
- **JSON mode** (`RecipeJsonEditor`): Raw JSON text editor for advanced users. Only available when `advancedMode` is
  enabled in settings.

### State Flow

```mermaid
stateDiagram-v2
    [*] --> Viewing
    Viewing --> Editing: Click Edit
    Editing --> FormMode: Default
    Editing --> JsonMode: Toggle to JSON
    FormMode --> JsonMode: Toggle
    JsonMode --> FormMode: Toggle
    Editing --> Viewing: Cancel
    Editing --> Saving: Save
    Saving --> [*]: Success
    Saving --> Editing: Error
    Viewing --> Deleting: Delete
    Deleting --> [*]: Confirm
    Deleting --> Viewing: Cancel
```

### RecipeViewMode Features

- Formatted ingredient display with unit conversion (metric / imperial / both)
- Ingredient highlighting (from shopping list cross-reference)
- Grouped or flat ingredient/instruction display
- Video player support via `VideoEmbed` (YouTube, Vimeo, direct URLs)
- Macro nutrient display
- Total cook count tracking
- Favorite toggle and rating display
- MFP ID display

### RecipeEditForm Features

- Name, categories (multi-select), prep/cook time, servings
- **Variant recipes:** "Create as variant of" dropdown when adding a new recipe; variant name shown as `BaseName: [editable]`. When editing a variant, base ingredients/instructions appear in a read-only group and only **Additions** are editable.
- Macro input (calories, protein, carbs, fat)
- Tag management with autocomplete from existing tags
- Ingredient editing with autocomplete from `ingredientDefinitions`
- Grouped ingredients/instructions support (add/remove/reorder groups)
- Metric and imperial measurement fields per ingredient

---

## RecipePicker (`src/components/RecipePicker.tsx`)

Modal for selecting recipes to add to the weekly meal plan.

### Props

| Prop                  | Type            | Description                |
|-----------------------|-----------------|----------------------------|
| `recipes`             | `Recipe[]`      | Available recipes          |
| `onSelect`            | `function`      | Selection handler          |
| `onClose`             | `function`      | Close handler              |
| `multiWeeklyCookPlan` | `object`        | Current week's plan        |
| `participants`        | `Participant[]` | For nutrition suggestions  |
| `weekStartStr`        | `string`        | Week identifier            |
| `allTags`             | `string[]`      | Available tags             |
| `mealPlan`            | `MealPlan`      | For usage tracking         |

### Features

- Two tabs: Search and Suggestions
- Category and tag filtering
- Recipe search by name
- Multiplier selection per recipe
- Batch add multiple recipes
- Quick add with single click
- Suggestions based on shared ingredients with current week and gaps in participant nutrition

---

## VideoEmbed (`src/components/VideoEmbed.tsx`)

Renders embedded video players for recipe video links.

### Props

| Prop | Type     | Description        |
|------|----------|--------------------|
| `url`| `string` | Video URL to embed |

### Supported Formats

| URL Pattern            | Player         |
|------------------------|----------------|
| `youtube.com/watch?v=` | YouTube iframe |
| `youtu.be/`            | YouTube iframe |
| `vimeo.com/`           | Vimeo iframe   |
| Other                  | HTML5 `<video>` |
