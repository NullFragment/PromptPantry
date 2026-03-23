# Testing

Testing strategy, tooling, structure, and how to run and extend tests.

## Tooling

- **Vitest** as the test runner
- **Testing Library** (`@testing-library/react`, `@testing-library/jest-dom`) for component tests
- **jsdom** environment for UI tests, **node** environment for server tests

## Vitest Workspace

The project uses a Vitest workspace (`vitest.workspace.ts`) to split tests into two projects:

| Project  | Environment | Includes             | Setup            |
|----------|-------------|----------------------|------------------|
| **UI**   | jsdom       | All tests except `test/server/**` | `test/setup.ts` |
| **Server** | node      | `test/server/**` only | None             |

This ensures component tests run in a browser-like environment while server/API tests run in Node.js.

## Test Structure

```
test/
├── setup.ts                  # localStorage mock, fetch mock for /api/me
├── testHelpers.ts            # mockFetchResponse, mockFetchError helpers
├── components/               # Component rendering and interaction tests
│   ├── App.test.tsx
│   ├── App.confirmation.test.tsx
│   ├── AdminPanel.test.tsx
│   ├── Calendar.test.tsx
│   ├── ConfirmationDialog.test.tsx
│   ├── Ingredients.test.tsx
│   ├── Login.test.tsx
│   ├── Navigation.test.tsx
│   ├── Participants.test.tsx
│   ├── RecipeModal.test.tsx
│   ├── RecipePicker.test.tsx
│   ├── RecipeView.test.tsx
│   ├── ShoppingList.test.tsx
│   └── WeeklyPlanner.test.tsx
├── hooks/                    # Custom hook unit tests
│   ├── useIngredients.test.ts
│   ├── useMealPlan.test.ts
│   ├── useParticipants.test.ts
│   ├── useRecipeFilters.test.ts
│   ├── useRecipes.test.ts
│   └── useUIState.test.ts
├── utils/                    # Utility function tests
│   ├── containerUtils.test.ts
│   ├── ingredientFormUtils.test.ts
│   ├── mealPlanUtils.test.ts
│   ├── recipeUtils.test.ts
│   └── unitConversions.test.ts
├── schemas/                  # JSON Schema validation tests
│   └── ingredient.schema.test.ts
├── styles/                   # Design token tests
└── server/                   # API endpoint tests (node environment)
    ├── testDataIsolation.ts  # createTestEnvironment, writeTestFile, readTestFile
    ├── ingredientsApi.test.ts
    ├── mealPlanApi.test.ts
    ├── recipesApi.test.ts
    ├── registrationFlow.test.ts
    ├── tierAssignment.test.ts
    ├── userCleanup.test.ts
    └── userManagement.test.ts
```

## Server Test Isolation

Server tests use `createTestEnvironment()` from `testDataIsolation.ts` to:

1. Create a temporary data directory per test suite
2. Build a fresh Express app via `serverFactory` pointed at that directory
3. Provide helpers (`writeTestFile`, `readTestFile`, `deleteTestFile`) for fixture setup
4. Clean up the temp directory after tests complete

This ensures complete isolation between test suites -- no shared mutable state.

## Test Helpers

`testHelpers.ts` provides mock fetch utilities used by hook and component tests:

- `mockFetchResponse(data, status)` -- mock a successful fetch with JSON body
- `mockFetchError(error, status)` -- mock a failed fetch with error message

Both return `Response`-like objects with `json()` and `text()` methods, compatible with the `apiRequest` utility.

## Test Categories

| Category       | What is tested                                      |
|----------------|-----------------------------------------------------|
| Hooks          | Data fetching, state updates, error handling         |
| Components     | Rendering, user interactions, state changes          |
| Utils          | Pure function behavior, edge cases                   |
| Schemas        | AJV validation of valid and invalid payloads         |
| Server API     | Endpoint behavior, auth, validation, data persistence|

## Coverage

- Target: **68% branch coverage** (configured in `vite.config.ts`)
- Provider: v8
- Output formats: text, json, html
- Reports generated in `prompt-pantry-app/coverage/`

## Running Tests

```bash
cd prompt-pantry-app
npm test                  # Run all tests once
npm run test-interactive  # Watch mode
npm run test:coverage     # With coverage report
```
