# PromptPantry: The Hallucination Kitchen

A "comprehensive" meal planning application built with React, TypeScript, and Tailwind CSS. This project helps users
manage recipes, plan meals on a calendar, track nutritional intake for multiple participants, and generate shopping
lists.

The entire application was vibe-coded using a mixture of Cursor, JetBrains Junie, and (regrettably) sometimes GitHub
Copilot when I burned my other credits and was desperate. I mostly built this in order to supplement a personal
training regimen without having to have yet another subscription for something like MyFitnessPal.

I do not recommend deploying this application in a public environment as zero code has been checked by a human. :)

[![CC BY-NC-SA 4.0][cc-by-nc-sa-shield]][cc-by-nc-sa]

## Features

- **Recipe Management**: Create, edit, and search recipes with detailed nutritional information, ratings, and favorites
- **Weekly Planner**: Plan meals for the week with batch cooking support and leftover tracking
- **Multi-Week Cook Plan**: Track batch cooking across weeks, including transferred leftovers and manual usage
- **Monthly Overview**: Calendar view of planned meals with daily nutritional totals and participant progress
- **Shopping List**: Automatically aggregated ingredients from the weekly plan with unit conversion
- **Ingredient Management**: Centralized ingredient definitions with aliases, store sections, container sizes, and unit conversions
- **Participant Tracking**: Manage multiple participants with custom nutritional goals and live progress
- **Recipe Filtering**: Advanced filtering by category, tag, rating, and cooking history
- **Authentication & Authorization**: JWT-based auth with role-based access control (Viewer / Editor / Admin)
- **Admin Panel**: User management, registration control, and application settings
- **Dark Mode**: Full dark mode support
- **Unit System**: Switch between metric, imperial, or both

## Project Structure

```
├── prompt-pantry-app/              # React frontend + Express backend
│   ├── src/
│   │   ├── components/      # React components
│   │   ├── contexts/        # React context providers
│   │   ├── hooks/           # Custom React hooks
│   │   ├── styles/          # Design tokens
│   │   └── utils/           # Helper functions
│   ├── server/              # Express route modules & data access
│   ├── serverFactory.js     # Express app factory
│   └── test/                # Vitest test suite
├── schemas/                 # JSON Schema definitions
├── data/                    # Data storage (JSON files)
├── documentation/           # Documentation
```

## Technology Stack

- **Frontend**: React 18, TypeScript, Tailwind CSS
- **Build Tool**: Vite 7
- **Backend**: Express.js 5
- **Validation**: AJV (JSON Schema)
- **Testing**: Vitest, Testing Library
- **Linting**: ESLint 9 (flat config)

## Getting Started

### Prerequisites

- Node.js (v18 or higher)
- npm

### Installation

1. Navigate to the `prompt-pantry-app` directory:

   ```bash
   cd prompt-pantry-app
   ```

2. Install dependencies:

   ```bash
   npm install
   ```

### Running the App

```bash
npm run dev
```

This starts the Vite dev server on `http://localhost:5173` and the Express API on `http://localhost:3001`.

### Running Tests

```bash
npm test                 # run once and exit
npm run test-interactive # watch mode
npm run test:coverage    # with coverage report
```

## Contributing

Contributions are welcome. AI-assisted contributions are fine — please review and understand any generated code before
submitting.

See [documentation/development/contributing.md](./documentation/development/contributing.md) for the full contributing
guide, including the PR process, version bumping, and the pre-push hook behavior.

## Documentation

See [documentation/](./documentation/) for full docs, including architecture, API reference, component details, setup
guides, and the project roadmap.

## License

PromptPantry © 2026 by Kyle Salitrik is licensed under [CC BY-NC-SA 4.0][cc-by-nc-sa].

To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg
