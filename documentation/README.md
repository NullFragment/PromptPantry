# Documentation

Full documentation for PromptPantry, organized by concern.

---

## Architecture

System context, component design, and data-layer patterns.

| Document                                               | Description                                         |
|--------------------------------------------------------|-----------------------------------------------------|
| [Overview](architecture/overview.md)                   | Tech stack and key architectural decisions          |
| [System Architecture](architecture/system.md)          | System diagram, component hierarchy, server modules |
| [Authentication & Authorization](architecture/auth.md) | JWT auth, user tiers, RBAC middleware               |
| [Server Architecture](architecture/server.md)          | Factory pattern, data access, middleware, routes    |
| [API Reference](architecture/api.md)                   | All REST endpoints with auth requirements           |
| [Hooks](architecture/hooks.md)                         | Custom React hooks and their responsibilities       |
| [Data Flow](architecture/data-flow.md)                 | Sequence diagrams for key application flows         |
| [Persistence](architecture/persistence.md)             | JSON file storage and sync model                    |
| [Design System](architecture/design-system.md)         | Design tokens, CSS layers, Tailwind config          |
| [File Structure](architecture/file-structure.md)       | On-disk layout and naming patterns                  |
| [Performance & Security](architecture/perf-security.md)| Optimizations and security practices               |
| [Testing](architecture/testing.md)                     | Test strategy, structure, and coverage              |

---

## Components

Detailed documentation for each component area.

| Document                                          | Description                                               |
|---------------------------------------------------|-----------------------------------------------------------|
| [Main Application](components/app.md)             | Root component, auth flow, context, view routing          |
| [Navigation](components/navigation.md)            | Top nav, view switching, theme toggle                     |
| [Recipe Management](components/recipes.md)        | RecipeView, RecipeModal, RecipePicker, VideoEmbed         |
| [Planning Views](components/planning.md)          | Calendar, WeeklyPlanner, ShoppingList                     |
| [Ingredient Management](components/ingredients.md)| Ingredient CRUD, aliases, merging                         |
| [Participant Management](components/participants.md)| Participant profiles and progress tracking              |
| [Admin Panel](components/admin.md)                | Settings, user management                                 |
| [UI Helpers](components/ui-helpers.md)            | DatePicker, ConfirmationDialog                            |
| [Shared Utilities](components/utils.md)           | apiRequest, recipeUtils, mealPlanUtils, unit conversions  |
| [Component Testing](components/testing.md)        | Component test strategy                                   |

---

## Development

Setup, contributing guidelines, testing, and project roadmap.

| Document                                    | Description                                      |
|---------------------------------------------|--------------------------------------------------|
| [Setup](development/setup.md)               | Prerequisites, installation, running, deployment |
| [Contributing](development/contributing.md) | PR process, code style, version bumping          |
| [Testing](development/testing.md)           | Running tests, coverage, CI                      |
| [Roadmap](development/roadmap.md)           | Future goals and planned features                |

---

## Agentic Context

Agent-facing documentation for AI-assisted development continuity.

| Document                                                               | Description                                     |
|------------------------------------------------------------------------|-------------------------------------------------|
| [Project Context](agentic-context/PROJECT_CONTEXT.md)                  | Implementation status, decisions, domain model  |
| [Implementation Plans](agentic-context/implementation-plans/README.md) | Phased implementation plans                     |
