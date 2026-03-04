# PromptPantry: The Hallucination Kitchen 

A "comprehensive" meal planning application built with React, TypeScript, and Tailwind CSS. This project helps users
manage recipes, plan meals on a calendar, track nutritional intake for multiple participants, and generate shopping
lists.

The entire application was vibe-coded using a mixture of Cursor, JetBrains Junie, and (regrettably) somtimes GitHub 
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
├── docs/                    # Documentation
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

Start both the development server and backend API:

```bash
npm run dev
```

This runs:

- Vite dev server on `http://localhost:5173`
- Express API server on `http://localhost:3001`

### Running Tests

Execute the test suite (runs once and exits):

```bash
npm test
```

Interactive mode (watches for changes):

```bash
npm run test-interactive
```

With coverage report:

```bash
npm run test:coverage
```

### IDE Run Configurations

The project includes pre-configured run configurations for **VS Code** and **WebStorm/IntelliJ**:

- **Dev**: Starts both frontend and backend for development.
- **Tests**: Runs the full test suite once.
- **Interactive Tests**: Runs tests in watch mode.
- **Production Build**: Builds the frontend for production.
- **Production Run**: Starts the backend server to serve the production build.
- **Docker Build**: Builds the container image using Docker Compose (via terminal).
- **Docker Run**: Runs the application in Docker using Docker Compose (via terminal).

### Linting

Run ESLint:

```bash
npm run lint
```

### Building for Production

To build the frontend for production:

```bash
cd prompt-pantry-app
npm run build
```

### Running in Production

#### Environment Variables

| Variable         | Description                                                              | Default        |
|------------------|--------------------------------------------------------------------------|----------------|
| `JWT_SECRET`     | Secret key for signing JWT tokens (**required in production**)           | (required)     |
| `PORT`           | Port for the server to listen on                                         | `3001`         |
| `SECURE_COOKIES` | Set to `true` to require HTTPS for cookies (use when behind HTTPS proxy) | `false`        |
| `CORS_ORIGINS`   | Comma-separated allowed origins (only needed for cross-origin frontend)  | (unset)        |
| `DEPLOYED`       | Defense-in-depth flag that prevents test auth bypass (set automatically by docker-compose) | (unset) |

#### Using Node.js directly

1. Build the frontend (see above).
2. Start the server from the `prompt-pantry-app` directory:

```bash
cd prompt-pantry-app
npm start
```

The server will serve the static files from `dist/` and handle API requests.

#### Using Docker

You can use Docker to build and run the entire application in a container.

1. Build and start the container using Docker Compose:

```bash
docker compose up -d --build
```

2. Access the application at `http://localhost:3001` (or whatever `PORT` you set).

Persistent data is stored on the host at `/srv/prompt-pantry` via a bind mount.

#### Deploying with Portainer (GitHub + Traefik)

This is the recommended deployment method. The compose files are pre-configured with Traefik labels for
automatic HTTPS routing.

##### Prerequisites

1. **Traefik** running as a reverse proxy on your Docker host
2. **External Docker network** named `proxy`. Create it if it does not exist:

```bash
docker network create proxy
```

3. **Host directory for persistent data**. The compose file mounts `/srv/prompt-pantry` on the host to `/app/data` in the container. Create it and set ownership so the container can write (e.g. UID 1000):

```bash
sudo mkdir -p /srv/prompt-pantry
sudo chown 1000:1000 /srv/prompt-pantry
```

4. **DNS** A record pointing your chosen hostname to your server's IP address
5. **Portainer** installed and connected to the Docker host

##### Deploy from Git repository (build from source)

Portainer clones the repo and builds the image locally. Use this if you need to deploy a fork or custom branch.

1. In Portainer, go to **Stacks** and click **Add stack**.
2. Select **Git Repository** as the build method.
3. Fill in the repository settings:
   - **Repository URL**: your GitHub repo URL
   - **Reference**: branch or tag to deploy (e.g. `mainline`)
   - **Compose path**: `docker-compose.yml`
4. Under **Environment variables**, add the variables listed below.
5. Click **Deploy the stack**.

Portainer will clone the repo, build the Docker image from the Dockerfile, and start the service using the compose
file. To update, click **Pull and redeploy** in the stack view.

##### Environment Variables

The compose file uses a fixed `proxy` network and `/srv/prompt-pantry` for data; only the following are configurable via environment.

**Required** -- the stack will not start without these:

| Variable       | Description                        | Example                          |
|----------------|------------------------------------|----------------------------------|
| `JWT_SECRET`   | Secret key for signing JWT tokens  | (generate a strong random string)|
| `TRAEFIK_HOST` | Public hostname for the application| `meals.yourdomain.com`           |

**Optional** -- the compose file provides sensible defaults:

| Variable         | Description                    | Default    |
|------------------|--------------------------------|------------|
| `PORT`           | Server listen port (host and container) | `3001`     |
| `SECURE_COOKIES` | HTTPS-only cookies             | `true`     |
| `CORS_ORIGINS`   | Comma-separated allowed origins| (unset)    |

The compose file also sets `DEPLOYED=true` and `NODE_ENV=production` automatically. `DEPLOYED` is a defense-in-depth
flag that prevents the test authentication bypass from activating in a deployed environment.

When Traefik is present on the `proxy` network, the service is exposed via `TRAEFIK_HOST` with automatic
HTTPS. HTTP requests are redirected to HTTPS.

##### Without Traefik

If you are not using Traefik, you will need to modify the compose file to remove or adjust the Traefik labels and
network configuration. Set `SECURE_COOKIES=false` if you are not terminating TLS, and access the app directly on the
configured port.

## API Endpoints

See [docs/architecture/API.md](./docs/architecture/API.md) for the full endpoint list and auth requirements.

Common endpoints (all data endpoints require authentication):

| Method | Endpoint                      | Auth Required |
|--------|-------------------------------|---------------|
| POST   | `/api/login`                  | None          |
| POST   | `/api/register`               | None          |
| GET    | `/api/me`                     | Authenticated |
| GET    | `/api/recipes`                | Authenticated |
| POST   | `/api/recipes`                | Editor        |
| PUT    | `/api/recipes/:name`          | Editor        |
| DELETE | `/api/recipes/:name`          | Editor        |
| GET    | `/api/ingredients`            | Authenticated |
| POST   | `/api/ingredients`            | Editor        |
| GET    | `/api/participants`           | Authenticated |
| PUT    | `/api/participants`           | Editor        |
| GET    | `/api/meal-plan`              | Authenticated |
| PUT    | `/api/meal-plan`              | Editor        |
| GET    | `/api/multi-weekly-cook-plan` | Authenticated |
| PUT    | `/api/multi-weekly-cook-plan` | Editor        |
| GET    | `/api/users`                  | Admin         |
| PUT    | `/api/settings`               | Admin         |

## Data Persistence

- Backend reads/writes to JSON files in `data/` (`recipes.json`, `participants.json`, `mealPlan.json`,
  `multiWeeklyCookPlan.json`, `ingredients.json`, `users.json`, `settings.json`)
- All data is validated against JSON Schemas in `schemas/`
- Writes use an atomic pattern (write to `.tmp` then rename) for data integrity
- Frontend uses localStorage as a backup; if the server store is empty but local data exists, the app seeds the server
  with the local copy for meal plans and cook plans

## Design System

The application uses a centralized design token system:

- **`src/styles/designTokens.ts`**: Colors, typography, buttons, cards
- **`src/index.css`**: Tailwind component layers
- **`tailwind.config.js`**: Custom theme configuration

## Documentation

- [Architecture Documentation](./docs/ARCHITECTURE.md) - System design and data flow
    - [Authentication & Authorization](./docs/architecture/AUTH.md)
    - [Server Architecture](./docs/architecture/SERVER.md)
    - [API Reference](./docs/architecture/API.md)
    - [Hooks](./docs/architecture/HOOKS.md)
    - [Data Flow](./docs/architecture/DATA_FLOW.md)
    - [Persistence](./docs/architecture/PERSISTENCE.md)
- [Component Documentation](./docs/COMPONENTS.md) - Detailed component reference
    - [Main Application](./docs/components/APP.md)
    - [Navigation](./docs/components/NAVIGATION.md)
    - [Recipe Management](./docs/components/RECIPES.md)
    - [Planning Views](./docs/components/PLANNING.md)
    - [Ingredient Management](./docs/components/INGREDIENTS.md)
    - [Participant Management](./docs/components/PARTICIPANTS.md)
    - [Admin Panel](./docs/components/ADMIN.md)
    - [UI Helpers](./docs/components/UI_HELPERS.md)
    - [Shared Utilities](./docs/components/UTILS.md)
    - [Testing](./docs/components/TESTING.md)

## Testing

The project maintains comprehensive test coverage:

- **Unit Tests**: Custom hooks and utility functions
- **Component Tests**: UI rendering and interactions
- **API Tests**: Backend endpoint behavior

Coverage reports are generated in `prompt-pantry-app/coverage/`.

## Scripts

| Script                      | Description                            |
|-----------------------------|----------------------------------------|
| `npm run dev`               | Start development server with API      |
| `npm run build`             | Build for production                   |
| `npm run preview`           | Preview production build               |
| `npm test`                  | Run tests once and exit                |
| `npm run test-interactive`  | Run tests in watch mode                |
| `npm run test:coverage`     | Run tests with coverage report         |
| `npm run lint`              | Run ESLint                             |
| `npm run server`            | Start API server only                  |

## Future Goals

### Multi-Tenant Account Groups

Separate linked accounts into distinct groups, each with their own meal plan datasets, recipes,
and ingredient libraries. This would allow the application to support multiple households or user
groups without data interference between them.

### Recipe Auto-Import from URL

Scrape and auto-populate a recipe from a URL. Given a link to a recipe page, the app would extract
the title, ingredients, instructions, and nutritional information, mapping them into the application's
data model for quick import with minimal manual editing.

### Comprehensive Ingredient Library

Build a wide-ranging collection of common and standard ingredients, including:

- **Standard container sizes** (e.g. 14 oz cans, 32 oz cartons, common bag weights)
- **Portion-to-measurement conversions** (e.g. cloves of garlic to tsp minced, count of chicken breasts
  to weight, ears of corn to cups of kernels)
- **Pre-defined store sections** for accurate shopping list organization

This would reduce the manual effort needed when adding new recipes and improve shopping list accuracy
out of the box.

### Grocery Shopping Integration

Integrate with grocery shopping platforms to streamline the path from planned meals to purchased
ingredients:

- **Kroger API** — Kroger offers a public developer API (`developer.kroger.com`) with access to their
  product catalog, cart management, and store-level pricing. This is the most promising integration
  target, as it provides free developer access and covers a large footprint of grocery stores
  (Kroger, Ralphs, Fred Meyer, Harris Teeter, etc.).
- **Amazon Fresh** — Currently does not offer a public API for consumer shopping list integration.
  Would require monitoring for future API availability.
- **Walmart** — No official public grocery API for cart management; third-party scraping solutions
  exist but are fragile and against TOS.
- **Instacart** — Requires a commercial legal agreement, making it impractical for an open-source
  project.

## Contributing

Contributions are welcome! This project has been built with the assistance of [Cursor](https://cursor.com),
[JetBrains Junie](https://www.jetbrains.com/junie/), and — regrettably —
[GitHub Copilot](https://github.com/features/copilot). AI-assisted contributions are fine, but please
review and understand any generated code before submitting.

### Getting Started

1. Fork the repository and create a feature branch from `main`.
2. Install dependencies: `cd prompt-pantry-app && npm install`
   This also configures the git hooks automatically (via the `prepare` script).
3. Make your changes, following the existing code style and patterns.

### Version Bumping

A `pre-push` git hook automatically increments the patch version (e.g. `v0.1.6` to `v0.1.7`) in
`Navigation.tsx` and amends the commit before pushing. This is configured automatically when you
run `npm install`. Major and minor versions are bumped manually when appropriate.

### Before Submitting

- **Tests**: Ensure all tests pass (`npm test`) and add tests for new functionality.
- **Coverage**: Check test coverage hasn't regressed (`npm run test:coverage`).
- **Linting**: Run `npm run lint` and fix any issues.
- **Documentation**: Update relevant docs for significant changes — architecture docs live in `docs/`.
- **Schema changes**: If you modify data structures, update the corresponding JSON Schemas in `schemas/`.
- **Commit messages**: Write clear, descriptive commit messages that explain the *why* behind changes.

### Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR.
- Include a description of what changed and why.
- Link related issues if applicable.
- Be responsive to review feedback.

## License

PromptPantry © 2026 by Kyle Salitrik is licensed under [CC BY-NC-SA 4.0][cc-by-nc-SA].

To view a copy of this license, visit https://creativecommons.org/licenses/by-nc-sa/4.0/

[![CC BY-NC-SA 4.0][cc-by-nc-sa-image]][cc-by-nc-sa]

[cc-by-nc-sa]: http://creativecommons.org/licenses/by-nc-sa/4.0/
[cc-by-nc-sa-image]: https://licensebuttons.net/l/by-nc-sa/4.0/88x31.png
[cc-by-nc-sa-shield]: https://img.shields.io/badge/License-CC%20BY--NC--SA%204.0-lightgrey.svg
