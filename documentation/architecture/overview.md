# Architecture Overview

PromptPantry is a full-stack web application for recipe management, meal planning, nutritional tracking, ingredient
management, and shopping list generation. It follows a modern React architecture with a Node.js/Express backend and
file-based JSON persistence.

## Technology Stack

| Layer          | Technology              | Purpose                                    |
|----------------|-------------------------|--------------------------------------------|
| Frontend       | React 18, TypeScript    | UI components and state management         |
| Styling        | Tailwind CSS, PostCSS   | Utility-first CSS with design tokens       |
| Build Tool     | Vite 7.x               | Fast development and production builds     |
| Backend        | Express.js 5.x         | REST API server with modular routes        |
| Authentication | JWT, bcrypt             | Token-based auth with password hashing     |
| Authorization  | Custom RBAC middleware  | Viewer / Editor / Admin tier system        |
| Validation     | AJV (JSON Schema)       | Request payload validation                 |
| Persistence    | JSON files              | File-based storage with atomic writes      |
| Testing        | Vitest, Testing Library | Unit, component, and API tests             |
| Linting        | ESLint 9 (flat config)  | Code quality enforcement                   |
| Deployment     | Docker, Docker Compose  | Containerized production deployment        |

## Key Architectural Decisions

- **File-based storage**: JSON files instead of a database, suited for single-user or small-team deployments
- **Server factory pattern**: Express app created via a factory function for test isolation
- **Local-first sync**: Meal plan data loads from localStorage instantly, then syncs with the server
- **Context-based state sharing**: `AppContext` provides user tier, edit permissions, and UI preferences to all components
- **Component decomposition**: Large components (WeeklyPlanner, RecipeModal) split into focused subdirectories
- **Hook extraction**: Complex logic (planner actions, drag-drop, alias management) extracted into custom hooks

See the per-area architecture docs for more detail:

- [System Architecture](system.md) -- Diagrams and component hierarchy
- [Authentication & Authorization](auth.md) -- JWT auth, tiers, middleware
- [Server Architecture](server.md) -- Factory, data access, routes
- [API Reference](api.md) -- All endpoints
- [Hooks](hooks.md) -- Custom hooks
- [Data Flow](data-flow.md) -- Sequence diagrams
- [Persistence](persistence.md) -- Storage details
- [File Structure](file-structure.md) -- Project layout
- [Performance & Security](perf-security.md) -- Optimizations and security
- [Testing](testing.md) -- Test strategy and coverage
