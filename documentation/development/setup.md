# Setup

Prerequisites, installation, running the app locally, and deployment options.

## Prerequisites

- Node.js v18 or higher
- npm

## Installation

1. Navigate to the `prompt-pantry-app` directory:

   ```bash
   cd prompt-pantry-app
   ```

2. Install dependencies (also installs git hooks via the `prepare` script):

   ```bash
   npm install
   ```

## Running Locally

Start both the Vite dev server and the Express API concurrently:

```bash
npm run dev
```

- Vite dev server: `http://localhost:5173`
- Express API: `http://localhost:3001`

To run only the API server:

```bash
npm run server
```

## Linting

```bash
npm run lint
```

ESLint is configured with `max-warnings: 50`. The linter bans `console.log` — use `console.warn` or `console.error`.

## Building for Production

```bash
npm run build
```

Runs `tsc` then `vite build`. Output goes to `dist/`.

## IDE Run Configurations

The project includes pre-configured run configurations for **VS Code** and **WebStorm/IntelliJ**:

| Configuration        | Purpose                                                   |
|----------------------|-----------------------------------------------------------|
| Dev                  | Starts both frontend and backend for development          |
| Tests                | Runs the full test suite once                             |
| Interactive Tests    | Runs tests in watch mode                                  |
| Production Build     | Builds the frontend for production                        |
| Production Run       | Starts the backend server to serve the production build   |
| Docker Build         | Builds the container image using Docker Compose           |
| Docker Run           | Runs the application in Docker using Docker Compose       |

## Environment Variables

| Variable         | Notes                                                                           |
|------------------|---------------------------------------------------------------------------------|
| `JWT_SECRET`     | Required in production; app crashes without it                                  |
| `PORT`           | API port (default: 3001)                                                        |
| `DATA_DIR`       | Override data directory path                                                    |
| `DEPLOYED`       | Set `true` to disable test auth bypass                                          |
| `SECURE_COOKIES` | Set `true` for HTTPS-only cookies                                               |
| `CORS_ORIGINS`   | Comma-separated allowed origins                                                 |

## Deployment

### Using Node.js

1. Build the frontend:

   ```bash
   npm run build
   ```

2. Start the server from `prompt-pantry-app/`:

   ```bash
   npm start
   ```

The server serves static files from `dist/` and handles API requests.

### Using Docker

Build and start the container:

```bash
docker compose up -d --build
```

Access the app at `http://localhost:3001` (or the configured `PORT`). Persistent data is stored on the host at
`/srv/prompt-pantry` via a bind mount.

### Deploying with Portainer and Traefik

This is the recommended production deployment. The compose files are pre-configured with Traefik labels for automatic
HTTPS routing.

**Prerequisites:**

1. Traefik running as a reverse proxy on your Docker host.
2. External Docker network named `proxy`:

   ```bash
   docker network create proxy
   ```

3. Host directory for persistent data with correct ownership (UID 1000):

   ```bash
   sudo mkdir -p /srv/prompt-pantry
   sudo chown 1000:1000 /srv/prompt-pantry
   ```

4. DNS A record pointing your hostname to your server's IP.
5. Portainer installed and connected to the Docker host.

**Deploy steps:**

1. In Portainer, go to **Stacks** and click **Add stack**.
2. Select **Git Repository**.
3. Fill in the repo URL, reference (e.g. `mainline`), and compose path (`docker-compose.yml`).
4. Add the required environment variables (see below).
5. Click **Deploy the stack**.

To update: click **Pull and redeploy** in the stack view.

**Required environment variables:**

| Variable       | Description                        | Example                            |
|----------------|------------------------------------|------------------------------------|
| `JWT_SECRET`   | Secret key for signing JWT tokens  | (generate a strong random string)  |
| `TRAEFIK_HOST` | Public hostname for the application| `meals.yourdomain.com`             |

**Optional environment variables (compose provides defaults):**

| Variable         | Description                         | Default |
|------------------|-------------------------------------|---------|
| `PORT`           | Server listen port                  | `3001`  |
| `SECURE_COOKIES` | HTTPS-only cookies                  | `true`  |
| `CORS_ORIGINS`   | Comma-separated allowed origins     | (unset) |

The compose file automatically sets `DEPLOYED=true` and `NODE_ENV=production`. `DEPLOYED` disables the test auth
bypass as a defense-in-depth measure.

**Without Traefik:** Remove or adjust the Traefik labels and network configuration from the compose file. Set
`SECURE_COOKIES=false` if not terminating TLS.
