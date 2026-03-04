# Component Testing

Testing strategy and component-to-test mapping.

For the full testing architecture (tooling, workspace, coverage), see
[docs/architecture/TESTING.md](../architecture/TESTING.md).

## Component Test Matrix

| Component          | Test File                          | Key Scenarios                                              |
|--------------------|------------------------------------|------------------------------------------------------------|
| App                | `App.test.tsx`                     | View switching, search/sort, recipe modal, settings        |
| App (confirmations)| `App.confirmation.test.tsx`        | Delete recipe confirmation, cancel                         |
| AdminPanel         | `AdminPanel.test.tsx`              | Settings, user CRUD, tier updates, delete confirmation     |
| Calendar           | `Calendar.test.tsx`                | Month navigation, day selection, participant progress, drag-and-drop |
| ConfirmationDialog | `ConfirmationDialog.test.tsx`      | Render, onConfirm/onCancel, Escape key, danger variant    |
| Ingredients        | `Ingredients.test.tsx`             | List, filters, add/edit/delete, aliases, store sections    |
| Login              | `Login.test.tsx`                   | Registration toggle, registration disabled state           |
| Navigation         | `Navigation.test.tsx`              | View switching, dark mode, unit system                     |
| Participants       | `Participants.test.tsx`            | Add/edit/delete participants, calorie display              |
| RecipeModal        | `RecipeModal.test.tsx`             | View/edit modes, grouped recipes, save/delete, video embeds|
| RecipePicker       | `RecipePicker.test.tsx`            | Search, category/tag filters, quick add, suggestions       |
| RecipeView         | `RecipeView.test.tsx`              | Grid/table views, filters, search, sort, bulk delete       |
| ShoppingList       | `ShoppingList.test.tsx`            | Cook plan aggregation, multiplier, clipboard, store sections|
| WeeklyPlanner      | `WeeklyPlanner.test.tsx`           | Leftover prompt, transfer/consume, clear week, drag-and-drop|

## Common Test Patterns

- **Rendering**: Verify components render with expected content
- **User interactions**: Simulate clicks, typing, drag events via Testing Library
- **State changes**: Verify state updates propagate correctly through hooks
- **Edge cases**: Empty data, missing fields, boundary values
- **Error handling**: API failures, validation errors

## Running Component Tests

```bash
cd prompt-pantry-app
npm test                  # All tests once
npm run test-interactive  # Watch mode
npm run test:coverage     # With coverage
```
