# File Structure & Design Patterns

On-disk organization and key architectural patterns.

## File Structure

```
prompt-pantry-app/
├── src/
│   ├── App.tsx                        # Root component, auth, view routing
│   ├── main.tsx                       # Entry point
│   ├── types.ts                       # TypeScript interfaces
│   ├── index.css                      # Tailwind layers, global styles
│   ├── components/
│   │   ├── AdminPanel.tsx             # Admin settings and user management
│   │   ├── Calendar.tsx               # Monthly calendar view
│   │   ├── ConfirmationDialog.tsx     # Reusable confirmation modal
│   │   ├── DatePicker.tsx             # Calendar date picker
│   │   ├── Ingredients.tsx            # Ingredient management view
│   │   ├── Navigation.tsx             # Top nav, theme toggle, view switching
│   │   ├── ParticipantProgress.tsx    # Macro progress bars
│   │   ├── Participants.tsx           # Participant CRUD
│   │   ├── RecipeModal.tsx            # Barrel export for RecipeModal/
│   │   ├── RecipeModal/               # Recipe view/edit modal (directory)
│   │   │   ├── index.tsx              # Modal shell, header, mode switching
│   │   │   ├── RecipeEditForm.tsx     # Full edit form with autocomplete
│   │   │   ├── RecipeViewMode.tsx     # Read-only recipe display
│   │   │   └── RecipeJsonEditor.tsx   # Raw JSON editor (advanced mode)
│   │   ├── RecipePicker.tsx           # Recipe selection for plans
│   │   ├── RecipeView.tsx             # Recipe list (grid/table views)
│   │   ├── ShoppingList.tsx           # Aggregated shopping list
│   │   ├── VideoEmbed.tsx             # YouTube/Vimeo/direct video embed
│   │   ├── WeeklyPlanner.tsx          # Weekly planner (main component)
│   │   └── WeeklyPlanner/             # Planner subcomponents
│   │       ├── DayColumn.tsx          # Single day column
│   │       ├── LeftoverPromptModal.tsx # Leftover transfer dialog
│   │       ├── MealSlotCard.tsx       # Single meal in a slot
│   │       ├── PlannerHeader.tsx      # Week header, participant selector
│   │       ├── QuickAddRecipeModal.tsx # Quick add recipe to slot
│   │       ├── WeeklyRecipeCard.tsx   # Recipe card in sidebar
│   │       ├── WeeklyRecipesSidebar.tsx # Weekly recipes sidebar
│   │       └── hooks/
│   │           ├── useLeftoverPrompt.ts    # Leftover detection
│   │           └── usePlannerDragDrop.ts   # Drag-and-drop handlers
│   ├── contexts/
│   │   └── AppContext.tsx             # App-wide context (tier, units, theme)
│   ├── hooks/
│   │   ├── useAliasManagement.ts      # Alias editing/delete/merge dialogs
│   │   ├── useAppContext.ts           # AppContext consumer hook
│   │   ├── useConfirmation.ts         # Confirmation dialog state
│   │   ├── useIngredients.ts          # Ingredient CRUD + alias operations
│   │   ├── useMealPlan.ts            # Meal plan + cook plan sync
│   │   ├── useParticipants.ts        # Participant CRUD
│   │   ├── useRecipeFilters.ts       # Search, filter, sort
│   │   ├── useRecipes.ts             # Recipe CRUD
│   │   └── useUIState.ts             # View, theme, settings sync
│   ├── styles/
│   │   └── designTokens.ts           # Centralized design tokens
│   └── utils/
│       ├── apiRequest.ts             # Typed fetch wrapper (apiRequest, apiJson)
│       ├── containerUtils.ts         # Container size calculations
│       ├── ingredientFormUtils.ts    # Alias validation, payload building
│       ├── mealPlanUtils.ts          # Meal calculations, UUID, cook counts
│       ├── recipeUtils.ts            # Ingredient/measurement utilities
│       ├── storeSectionUtils.ts      # Store section normalization
│       └── unitConversions.ts        # Volume/weight/portion conversions
├── server/
│   ├── authRoutes.js                 # Registration, login, logout, /me
│   ├── dataAccess.js                 # JSON file read/write, validation
│   ├── ingredientHelpers.js          # Usage checks, conflict detection, recipe updates
│   ├── ingredientRoutes.js           # Ingredient CRUD + alias + merge endpoints
│   ├── mealPlanRoutes.js             # Meal plan + cook plan + participants
│   ├── middleware.js                 # JWT auth, tier-based authorization
│   ├── recipeRoutes.js               # Recipe CRUD endpoints
│   ├── settingsRoutes.js             # Settings read/write endpoints
│   └── userRoutes.js                 # User CRUD (admin only)
├── test/
│   ├── setup.ts                      # Test setup (localStorage mock, fetch mock)
│   ├── testHelpers.ts                # Mock fetch helpers
│   ├── components/                   # Component tests
│   ├── hooks/                        # Hook tests
│   ├── utils/                        # Utility tests
│   ├── styles/                       # Design token tests
│   ├── schemas/                      # Schema validation tests
│   └── server/                       # API endpoint tests
│       └── testDataIsolation.ts      # createTestEnvironment helper
├── serverFactory.js                  # Express app factory
├── eslint.config.js                  # ESLint 9 flat config
├── vite.config.ts                    # Vite + Vitest config
├── vitest.workspace.ts               # Vitest workspace (UI + server projects)
├── tailwind.config.js                # Tailwind theme
├── tsconfig.json                     # TypeScript config
└── tsconfig.node.json                # TypeScript config for Vite
```

## Key Patterns

| Pattern                | Description                                                                                  |
|------------------------|----------------------------------------------------------------------------------------------|
| Server factory         | `serverFactory.js` creates Express apps with a configurable data directory for test isolation |
| Context object         | Route modules receive `{ dataAccess, middleware, validators }` via a shared `ctx` parameter  |
| Atomic writes          | Data files are written to `.tmp` then renamed to prevent corruption                          |
| Local-first sync       | `useMealPlan` writes to localStorage immediately, then debounces API sync                    |
| Component decomposition| Large components (WeeklyPlanner, RecipeModal) split into subdirectories with focused modules  |
| Hook extraction        | Complex logic extracted into custom hooks (planner hooks, alias management)                  |
| Context provider       | `AppContext` provides shared state (`userTier`, `canEdit`, `unitSystem`, etc.) to all components |
