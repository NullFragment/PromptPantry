# Hooks Architecture

Custom hooks used by the application, their responsibilities, persistence model, and key methods.

## Hook Dependency Diagram

```mermaid
---
config:
  theme: base
  flowchart:
    curve: linear
  themeVariables:
    lineColor: "#c8a0b0"
    primaryBorderColor: "#c8a0b0"
    edgeLabelBackground: "#808080"
    textColor: "#777777"
    titleColor: "#777777"
---
flowchart LR
    subgraph HookDependencies["Hook Dependencies"]
        subgraph dataHooks["Data Hooks"]
            useRecipes["useRecipes<br/>Recipe CRUD"]:::blue
            useParticipants["useParticipants<br/>Participant data"]:::blue
            useMealPlan["useMealPlan<br/>Meal scheduling"]:::blue
            useIngredients["useIngredients<br/>Ingredient CRUD + aliases"]:::blue
        end

        subgraph uiHooks["UI Hooks"]
            useUIState["useUIState<br/>View, theme, settings"]:::purple
            useRecipeFilters["useRecipeFilters<br/>Search/sort/filter"]:::purple
            useConfirmation["useConfirmation<br/>Confirmation dialogs"]:::purple
        end

        subgraph contextHooks["Context Hooks"]
            useAppContext["useAppContext<br/>Shared app state"]:::teal
        end

        subgraph componentHooks["Component-Level Hooks"]
            useAliasManagement["useAliasManagement<br/>Alias editing dialogs"]:::teal
        end

        subgraph storage["Storage"]
            API[Backend API]:::green
            LSt[Local Storage]:::slate
        end

        useRecipes --> API
        useParticipants --> API
        useMealPlan --> API
        useMealPlan --> LSt
        useIngredients --> API
        useUIState --> API
        useUIState --> LSt
    end

    classDef blue fill:#4A90D9,stroke:#3570B0
    classDef purple fill:#7B68EE,stroke:#5B48CE
    classDef teal fill:#48A8A0,stroke:#288888
    classDef green fill:#4EA882,stroke:#308862
    classDef slate fill:#808898,stroke:#606878

    style HookDependencies fill:#88888814,stroke:#888888
    style dataHooks fill:#4A90D914,stroke:#4A90D9
    style uiHooks fill:#7B68EE14,stroke:#7B68EE
    style contextHooks fill:#48A8A014,stroke:#48A8A0
    style componentHooks fill:#48A8A014,stroke:#48A8A0
    style storage fill:#4EA88214,stroke:#4EA882

    linkStyle 0 stroke:#4A90D9
    linkStyle 1 stroke:#4A90D9
    linkStyle 2 stroke:#4A90D9
    linkStyle 3 stroke:#4A90D9
    linkStyle 4 stroke:#4A90D9
    linkStyle 5 stroke:#7B68EE
    linkStyle 6 stroke:#7B68EE
```

## App-Level Hooks

| Hook               | Responsibility                                | Persistence        | Key Methods                                                                                      |
|---------------------|-----------------------------------------------|--------------------|-------------------------------------------------------------------------------------------------|
| `useRecipes`       | Recipe CRUD                                    | API                | `fetchRecipes`, `saveRecipe`, `deleteRecipe`                                                    |
| `useParticipants`  | Participant management                         | API                | `fetchParticipants`, `saveParticipants`                                                         |
| `useMealPlan`      | Meal scheduling, batch cooking, leftover sync  | API + localStorage | `setMealPlan`, `setMultiWeeklyCookPlan`, `updateMealPlanForRecipe`, `promptedRecipes`           |
| `useIngredients`   | Ingredient CRUD, merging, alias ops            | API                | `fetchIngredients`, `saveIngredient`, `deleteIngredient`, `mergeIngredients`, `checkUsage`, `checkAliasUsage`, `updateAlias`, `deleteAlias`, `mergeAlias` |
| `useUIState`       | View, theme, units, settings sync              | API + localStorage | `setView`, `setDarkMode`, `setUnitSystem`, `setAdvancedMode`, `fetchSettings`, `toggleRegistration`, `setMacroLimits` |
| `useRecipeFilters` | Search, filter, sort recipes                   | In-memory          | `toggleTag`, `toggleCategory`, `toggleRating`, `handleSort`, `clearFilters`, `setShowOnlyFavorites`, `setShowOnlyNeverCooked` |
| `useConfirmation`  | Confirmation dialog state                      | In-memory          | `show`, `dismiss`, `handleCancel`                                                               |

## Context Hook

| Hook             | Responsibility                        | Source            |
|------------------|---------------------------------------|-------------------|
| `useAppContext`  | Access shared app state from `AppContext` | `React.useContext` |

`AppContext` provides: `userTier`, `canEdit`, `unitSystem`, `advancedMode`, `darkMode`.

## Component-Level Hooks

| Hook                  | Used By       | Responsibility                          | Key Methods                                                                     |
|-----------------------|---------------|-----------------------------------------|---------------------------------------------------------------------------------|
| `useAliasManagement`  | Ingredients   | Alias editing, deletion, and merge UI   | `startEditAlias`, `saveEditAlias`, `handleDeleteAliasClick`, `confirmAliasDeleteWithReplacement`, `openAliasMerge`, `confirmAliasMerge` |

## WeeklyPlanner Hooks

These hooks decompose the WeeklyPlanner logic into focused concerns:

| Hook                      | Responsibility                                    | Key Returns                                              |
|---------------------------|---------------------------------------------------|----------------------------------------------------------|
| `usePlannerWeek`          | Compute week boundaries and day list              | `weekStart`, `weekEnd`, `weekDays`, `weekStartStr`       |
| `usePlannerConfirmation`  | Confirmation dialog state for planner actions      | Planner-scoped confirmation state                        |
| `useWeeklyRecipeCards`    | Compute recipe card data for the sidebar           | `WeeklyRecipeCardData[]`                                 |
| `useSlotMinHeights`       | Track min heights for meal slots across days       | Slot height map, `plannerContainerRef`                   |
| `useLeftoverPrompt`       | Detect leftovers from previous week                | `leftovers`, `onTransfer`, `onZeroOut`, `onIgnore`       |
| `useWeeklyPlanActions`    | Add/remove recipes, update multipliers, clear week | `addRecipe`, `removeRecipe`, `updateMultiplier`, `clear` |
| `usePlannerDragDrop`      | Drag-and-drop handlers and quick-add state         | `onDragStart`, `onDragOver`, `onDrop`, `quickAddSlot`    |

## useMealPlan Sync Model

```mermaid
---
config:
  theme: base
  themeVariables:
    lineColor: "#c8a0b0"
    primaryBorderColor: "#c8a0b0"
    edgeLabelBackground: "#808080"
    textColor: "#777777"
    titleColor: "#777777"
    signalColor: "#777777"
    signalTextColor: "#777777"
    actorBkg: "#808080"
    actorBorder: "#777777"
    sequenceNumberColor: "#4a2040"
---
sequenceDiagram
    autonumber
    participant Component
    participant useMealPlan
    participant localStorage
    participant API

    Component->>useMealPlan: setMealPlan(data)
    useMealPlan->>localStorage: Write immediately
    useMealPlan->>API: Debounced PUT /api/meal-plan
    API-->>useMealPlan: Success

    Note over useMealPlan: On mount, hydrates from<br/>localStorage first, then<br/>fetches from API. Seeds<br/>server if server is empty<br/>but localStorage has data.
```
