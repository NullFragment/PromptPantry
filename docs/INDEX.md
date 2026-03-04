# Documentation Index

Documentation is organized into two main areas:

- **Architecture** (system, API, auth, data flow): `docs/architecture/`
- **Components** (per-component docs): `docs/components/`

## Quick Links

- Architecture docs index: [docs/ARCHITECTURE.md](ARCHITECTURE.md)
- Component docs index: [docs/COMPONENTS.md](COMPONENTS.md)

## Architecture

- [Overview](architecture/ARCH_OVERVIEW.md) -- Tech stack and high-level summary
- [System Architecture](architecture/SYSTEM_ARCHITECTURE.md) -- System diagram and component hierarchy
- [Authentication & Authorization](architecture/AUTH.md) -- JWT auth, user tiers, RBAC
- [Server Architecture](architecture/SERVER.md) -- Factory pattern, data access, middleware, routes
- [API Reference](architecture/API.md) -- All REST endpoints with auth requirements
- [Hooks](architecture/HOOKS.md) -- Custom React hooks and their responsibilities
- [Data Flow](architecture/DATA_FLOW.md) -- Sequence diagrams for key flows
- [Persistence](architecture/PERSISTENCE.md) -- JSON file storage and sync model
- [Design System](architecture/DESIGN_SYSTEM.md) -- Tokens, CSS layers, Tailwind
- [File Structure](architecture/FILE_STRUCTURE.md) -- On-disk layout and patterns
- [Performance & Security](architecture/PERF_SECURITY.md) -- Optimizations and security practices
- [Testing](architecture/TESTING.md) -- Test strategy, structure, and coverage

## Components

- [Main Application](components/APP.md) -- Root component, auth, context, routing
- [Navigation](components/NAVIGATION.md) -- Top nav, view switching, theme
- [Recipe Management](components/RECIPES.md) -- RecipeView, RecipeModal, RecipePicker, VideoEmbed
- [Planning Views](components/PLANNING.md) -- Calendar, WeeklyPlanner, ShoppingList
- [Ingredient Management](components/INGREDIENTS.md) -- Ingredient CRUD, aliases, merging
- [Participant Management](components/PARTICIPANTS.md) -- Participant profiles and progress
- [Admin Panel](components/ADMIN.md) -- Settings, user management
- [UI Helpers](components/UI_HELPERS.md) -- DatePicker, ConfirmationDialog
- [Shared Utilities](components/UTILS.md) -- apiRequest, recipeUtils, mealPlanUtils, unitConversions, etc.
- [Testing](components/TESTING.md) -- Component test strategy
