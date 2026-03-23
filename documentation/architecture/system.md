# System Architecture

High-level system diagram and application component hierarchy.

## System Diagram

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
flowchart TB
    subgraph SystemDiagram["System Diagram"]
        subgraph client["Client (Browser)"]
            React[React Application]:::blue
            LS["Local Storage<br/>mealPlan, cookPlan, darkMode, advancedMode"]:::slate
        end

        subgraph server["Server (Node.js / Express 5)"]
            Factory[serverFactory.js]:::purple
            Auth["Auth Middleware<br/>JWT + Tier RBAC"]:::amber
            RateLimit["Rate Limiter<br/>Auth endpoints"]:::amber
            AJV[AJV Validator]:::teal
            Routes["Route Modules<br/>auth, recipes, ingredients,<br/>mealPlan, settings, users"]:::purple
            DataAccess["Data Access Layer<br/>Atomic JSON read/write"]:::teal
            Helpers["Ingredient Helpers<br/>Usage, conflicts, merges"]:::teal
        end

        subgraph persistence["Persistence"]
            JSON["JSON Files<br/>recipes.json<br/>participants.json<br/>mealPlan.json<br/>multiWeeklyCookPlan.json<br/>ingredients.json<br/>users.json<br/>settings.json"]:::green
            Schemas["JSON Schemas<br/>recipe, participant, mealPlan,<br/>multiWeeklyCookPlan, ingredient, user"]:::green
        end

        React -->|"REST API (JWT cookie)"| Auth
        Auth --> RateLimit
        Auth --> Routes
        Routes --> AJV
        AJV -->|Load| Schemas
        Routes --> DataAccess
        Routes --> Helpers
        DataAccess -->|"Read/Write (.tmp → rename)"| JSON
        React -->|"Backup + Seed"| LS
        Factory --> Auth
        Factory --> Routes
        Factory --> DataAccess
    end

    classDef blue fill:#4A90D9,stroke:#3570B0
    classDef purple fill:#7B68EE,stroke:#5B48CE
    classDef teal fill:#48A8A0,stroke:#288888
    classDef amber fill:#C8A040,stroke:#A88020
    classDef green fill:#4EA882,stroke:#308862
    classDef slate fill:#808898,stroke:#606878

    style SystemDiagram fill:#88888814,stroke:#888888
    style client fill:#4A90D914,stroke:#4A90D9
    style server fill:#7B68EE14,stroke:#7B68EE
    style persistence fill:#4EA88214,stroke:#4EA882

    linkStyle 0 stroke:#4A90D9
    linkStyle 1 stroke:#C8A040
    linkStyle 2 stroke:#C8A040
    linkStyle 3 stroke:#7B68EE
    linkStyle 4 stroke:#48A8A0
    linkStyle 5 stroke:#7B68EE
    linkStyle 6 stroke:#7B68EE
    linkStyle 7 stroke:#48A8A0
    linkStyle 8 stroke:#4A90D9
    linkStyle 9 stroke:#7B68EE
    linkStyle 10 stroke:#7B68EE
    linkStyle 11 stroke:#7B68EE
```

## Component Hierarchy

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
flowchart TD
    subgraph ComponentHierarchy["Component Hierarchy"]
        App["App.tsx"]:::blue --> AuthCheck{"Authenticated?"}:::amber
        AuthCheck -->|No| Login[Login]:::red
        AuthCheck -->|Yes| AppProvider["AppProvider<br/>(userTier, canEdit, unitSystem,<br/>advancedMode, darkMode)"]:::blue

        AppProvider --> Nav[Navigation]:::slate
        AppProvider --> ViewRouter{"View Router"}:::amber

        ViewRouter --> RV[RecipeView]:::purple
        ViewRouter --> Cal[Calendar]:::purple
        ViewRouter --> WP[WeeklyPlanner]:::purple
        ViewRouter --> SL[ShoppingList]:::purple
        ViewRouter --> Ing[Ingredients]:::purple
        ViewRouter --> Part[Participants]:::purple
        ViewRouter --> Admin["AdminPanel<br/>(Admin only)"]:::purple

        App --> RM["RecipeModal (global)"]:::teal
        App --> CD["ConfirmationDialog (global)"]:::teal

        RM --> RMView[RecipeViewMode]:::teal
        RM --> RMEdit[RecipeEditForm]:::teal
        RM --> RMJson[RecipeJsonEditor]:::teal
        RMView --> VideoEmbed[VideoEmbed]:::slate

        WP --> PH[PlannerHeader]:::slate
        WP --> Sidebar[WeeklyRecipesSidebar]:::slate
        WP --> DC[DayColumn]:::slate
        WP --> QAM[QuickAddRecipeModal]:::teal
        WP --> LPM[LeftoverPromptModal]:::teal
        WP --> RP[RecipePicker]:::teal
        DC --> MSC[MealSlotCard]:::slate
        DC --> PP1[ParticipantProgress]:::green
        Sidebar --> WRC[WeeklyRecipeCard]:::slate

        Cal --> PP2[ParticipantProgress]:::green

        Ing --> IngCard[IngredientCard]:::slate
        Ing --> IngEdit[IngredientEditForm]:::teal
        Ing --> IngMerge[IngredientMergeDialog]:::teal
        Ing --> IngDetail[IngredientDetailPopup]:::teal

        Admin --> MacroLimits[MacroLimitsSection]:::slate
        Admin --> CreateUser[CreateUserModal]:::teal
    end

    classDef blue fill:#4A90D9,stroke:#3570B0
    classDef purple fill:#7B68EE,stroke:#5B48CE
    classDef teal fill:#48A8A0,stroke:#288888
    classDef amber fill:#C8A040,stroke:#A88020
    classDef green fill:#4EA882,stroke:#308862
    classDef red fill:#C86060,stroke:#A84040
    classDef slate fill:#808898,stroke:#606878

    style ComponentHierarchy fill:#88888814,stroke:#888888

    linkStyle 0 stroke:#4A90D9
    linkStyle 1 stroke:#C8A040
    linkStyle 2 stroke:#C8A040
    linkStyle 3 stroke:#4A90D9
    linkStyle 4 stroke:#4A90D9
    linkStyle 5 stroke:#C8A040
    linkStyle 6 stroke:#C8A040
    linkStyle 7 stroke:#C8A040
    linkStyle 8 stroke:#C8A040
    linkStyle 9 stroke:#C8A040
    linkStyle 10 stroke:#C8A040
    linkStyle 11 stroke:#C8A040
    linkStyle 12 stroke:#4A90D9
    linkStyle 13 stroke:#4A90D9
    linkStyle 14 stroke:#48A8A0
    linkStyle 15 stroke:#48A8A0
    linkStyle 16 stroke:#48A8A0
    linkStyle 17 stroke:#48A8A0
    linkStyle 18 stroke:#7B68EE
    linkStyle 19 stroke:#7B68EE
    linkStyle 20 stroke:#7B68EE
    linkStyle 21 stroke:#7B68EE
    linkStyle 22 stroke:#7B68EE
    linkStyle 23 stroke:#7B68EE
    linkStyle 24 stroke:#808898
    linkStyle 25 stroke:#808898
    linkStyle 26 stroke:#4EA882
    linkStyle 27 stroke:#808898
    linkStyle 28 stroke:#4EA882
    linkStyle 29 stroke:#7B68EE
    linkStyle 30 stroke:#7B68EE
    linkStyle 31 stroke:#7B68EE
    linkStyle 32 stroke:#7B68EE
    linkStyle 33 stroke:#7B68EE
    linkStyle 34 stroke:#808898
    linkStyle 35 stroke:#808898
```

## Server Module Architecture

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
    subgraph ServerModules["Server Module Architecture"]
        SF[serverFactory.js]:::blue -->|creates| Ctx["ctx object<br/>{dataAccess, middleware, validators}"]:::teal
        Ctx --> AR[authRoutes]:::purple
        Ctx --> SR[settingsRoutes]:::purple
        Ctx --> IR[ingredientRoutes]:::purple
        Ctx --> RR[recipeRoutes]:::purple
        Ctx --> MPR[mealPlanRoutes]:::purple
        Ctx --> UR[userRoutes]:::purple
        IR --> IH[ingredientHelpers]:::green
    end

    classDef blue fill:#4A90D9,stroke:#3570B0
    classDef purple fill:#7B68EE,stroke:#5B48CE
    classDef teal fill:#48A8A0,stroke:#288888
    classDef green fill:#4EA882,stroke:#308862

    style ServerModules fill:#88888814,stroke:#888888

    linkStyle 0 stroke:#4A90D9
    linkStyle 1 stroke:#48A8A0
    linkStyle 2 stroke:#48A8A0
    linkStyle 3 stroke:#48A8A0
    linkStyle 4 stroke:#48A8A0
    linkStyle 5 stroke:#48A8A0
    linkStyle 6 stroke:#48A8A0
    linkStyle 7 stroke:#7B68EE
```
