# Design System

Centralized design tokens and style layers used by the project.

## Token Architecture

```mermaid
graph LR
    subgraph DesignTokens["Design Tokens - designTokens.ts"]
        Colors["colors<br/>Primary, Status"]
        MealTypes["mealTypeStyles<br/>Breakfast, Lunch, etc."]
        Buttons["buttonStyles<br/>Primary, Secondary, Danger"]
        Cards["cardStyles<br/>Base, Padded, Interactive"]
        Typography["typographyStyles<br/>Headings, Labels"]
        Status["statusStyles<br/>Success, Warning, Error"]
        Macros["macroColors<br/>Calories, Protein, etc."]
    end
    
    subgraph CSSLayer["CSS Layer - index.css"]
        BaseLayer["@layer base<br/>app-shell, page-shell"]
        ComponentLayer["@layer components<br/>btn-*, nav-*, card-*"]
    end
    
    subgraph Tailwind
        Config[tailwind.config.js]
        Utilities[Utility Classes]
    end
    
    Colors --> Components[React Components]
    MealTypes --> Components
    Buttons --> Components
    BaseLayer --> Components
    ComponentLayer --> Components
    Utilities --> Components
```

## Style Categories

| Category   | Source                        | Usage                      |
|------------|-------------------------------|----------------------------|
| Layout     | `index.css` @layer base       | `app-shell`, `page-shell`  |
| Components | `index.css` @layer components | `btn-*`, `nav-*`, `card-*` |
| Colors     | `designTokens.ts`             | Meal types, status, macros |
| Buttons    | `designTokens.ts`             | `getButtonClasses()`       |
| Typography | `designTokens.ts`             | `typographyStyles.*`       |

Notes:

- Keep `designTokens.ts` stable and avoid ad-hoc color/style overrides in components.
- When adding new utilities, prefer extending Tailwind via `tailwind.config.js`.
