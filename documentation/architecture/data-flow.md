# Data Flow

Core data flows in the application: authentication, recipe management, ingredient management, meal planning, and
shopping list generation.

## Authentication Flow

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
    participant User
    participant App
    participant API
    participant Middleware

    User->>App: Open application
    App->>API: GET /api/me
    API->>Middleware: Verify JWT cookie
    alt Valid JWT
        Middleware-->>API: User found
        API-->>App: { username, tier }
        App->>App: Set user state, render app
    else No/invalid JWT
        Middleware-->>API: 401
        API-->>App: Unauthorized
        App->>App: Render Login screen
    end

    User->>App: Submit login form
    App->>API: POST /api/login
    API->>API: Verify bcrypt password
    API-->>App: Set httpOnly JWT cookie (7d)
    App->>API: GET /api/me
    API-->>App: { username, tier }
    App->>App: Fetch recipes, participants, ingredients, settings
```

## Registration Flow

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
    participant User
    participant App
    participant API

    User->>App: Open registration
    App->>API: GET /api/registration-status
    API-->>App: { registrationEnabled }

    alt Registration enabled
        User->>App: Submit registration
        App->>API: POST /api/register
        Note over API: First user → Admin tier<br/>Subsequent → Viewer tier
        API->>API: Hash password with bcrypt
        API->>API: Save user to users.json
        API-->>App: Success
    else Registration disabled
        App->>User: Show disabled message
    end
```

## Recipe Management Flow

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
    participant User
    participant RecipeView
    participant RecipeModal
    participant useRecipes
    participant API
    participant JSON

    User->>RecipeView: Click recipe
    RecipeView->>RecipeModal: Open modal
    User->>RecipeModal: Edit and save
    RecipeModal->>useRecipes: saveRecipe(recipe)
    useRecipes->>API: PUT /api/recipes/:name
    API->>API: Validate against recipe schema
    API->>JSON: Write to recipes.json
    API-->>useRecipes: Success
    useRecipes->>API: GET /api/recipes
    API-->>useRecipes: Updated list
    useRecipes-->>RecipeView: Re-render

    Note over RecipeModal: On rename, App also calls<br/>useMealPlan.updateMealPlanForRecipe<br/>to update all plan references
```

## Ingredient Management Flow

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
    participant User
    participant Ingredients
    participant useIngredients
    participant API
    participant JSON

    User->>Ingredients: Create / edit ingredient
    Ingredients->>useIngredients: saveIngredient(data)
    useIngredients->>API: POST or PUT /api/ingredients/:id
    API->>API: Check name/alias conflicts
    API->>API: Validate against ingredient schema
    API->>JSON: Write to ingredients.json
    API-->>useIngredients: Success
    useIngredients->>API: GET /api/ingredients
    API-->>useIngredients: Updated list
```

### Ingredient Merge Flow

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
    participant User
    participant Ingredients
    participant API

    User->>Ingredients: Select multiple ingredients
    User->>Ingredients: Click merge, pick target
    Ingredients->>API: POST /api/ingredients/merge
    Note over API: Moves aliases from source<br/>to target, updates all recipe<br/>ingredientId references,<br/>deletes source ingredients
    API-->>Ingredients: Success
    Ingredients->>Ingredients: Refresh list
```

## Meal Planning Flow

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
    participant User
    participant WeeklyPlanner
    participant useMealPlan
    participant localStorage
    participant API

    User->>WeeklyPlanner: Add recipe to day/slot
    WeeklyPlanner->>useMealPlan: setMealPlan(updated)
    useMealPlan->>localStorage: Write immediately
    useMealPlan->>API: Debounced PUT /api/meal-plan

    User->>WeeklyPlanner: Add recipe to weekly sidebar
    WeeklyPlanner->>useMealPlan: setMultiWeeklyCookPlan(updated)
    useMealPlan->>localStorage: Write immediately
    useMealPlan->>API: Debounced PUT /api/multi-weekly-cook-plan
```

### Leftover Handling Flow

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
    participant User
    participant WeeklyPlanner
    participant useLeftoverPrompt
    participant useMealPlan

    User->>WeeklyPlanner: Navigate to new week
    WeeklyPlanner->>useLeftoverPrompt: Check previous week
    useLeftoverPrompt-->>WeeklyPlanner: Leftovers found

    alt Transfer
        User->>WeeklyPlanner: Transfer leftovers
        WeeklyPlanner->>useMealPlan: Add to current week with transferredFromDate/Id
    else Consume (zero out)
        User->>WeeklyPlanner: Mark as consumed
        WeeklyPlanner->>useMealPlan: Set manualUsed to full amount
    else Ignore
        User->>WeeklyPlanner: Ignore
        WeeklyPlanner->>useMealPlan: Record in promptedRecipes
    end
```

## Settings Sync Flow

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
    participant AdminPanel
    participant useUIState
    participant API
    participant localStorage

    Note over useUIState: On mount, fetches settings<br/>from API and merges with<br/>localStorage preferences

    AdminPanel->>useUIState: setAdvancedMode / setMacroLimits / toggleRegistration
    useUIState->>API: PUT /api/settings
    API-->>useUIState: Updated settings
    useUIState->>localStorage: Persist local prefs (darkMode, unitSystem)
```

## Shopping List Aggregation Flow

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
    subgraph ShoppingListAggregation["Shopping List Aggregation Flow"]
        CookPlan["Multi-Week Cook Plan<br/>(recipes + multipliers)"]:::blue --> Lookup["Look up recipe ingredients"]:::purple
        Lookup --> Scale["Scale by multiplier"]:::purple
        Scale --> Aggregate["Aggregate by ingredient name<br/>(normalize + combine quantities)"]:::teal
        Aggregate --> Resolve["Resolve ingredient definitions<br/>(store section, conversions)"]:::teal
        Resolve --> Convert["Convert units based on<br/>user preference (metric/imperial/both)"]:::teal
        Convert --> Group["Group by store section"]:::amber
        Group --> Container["Calculate container<br/>recommendations"]:::amber
        Container --> Display["Render shopping list<br/>with collapsible sections"]:::green
    end

    classDef blue fill:#4A90D9,stroke:#3570B0
    classDef purple fill:#7B68EE,stroke:#5B48CE
    classDef teal fill:#48A8A0,stroke:#288888
    classDef amber fill:#C8A040,stroke:#A88020
    classDef green fill:#4EA882,stroke:#308862

    style ShoppingListAggregation fill:#88888814,stroke:#888888

    linkStyle 0 stroke:#4A90D9
    linkStyle 1 stroke:#7B68EE
    linkStyle 2 stroke:#7B68EE
    linkStyle 3 stroke:#48A8A0
    linkStyle 4 stroke:#48A8A0
    linkStyle 5 stroke:#48A8A0
    linkStyle 6 stroke:#C8A040
    linkStyle 7 stroke:#C8A040
```
