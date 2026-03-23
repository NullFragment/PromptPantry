# Performance & Security

Performance optimizations and security practices implemented in the project.

## Security

### Authentication

- **JWT tokens** stored in httpOnly cookies with a 7-day expiry
- **bcrypt** password hashing for all user credentials
- Cookie options: `httpOnly`, `sameSite: 'strict'`, optional `secure` flag via `SECURE_COOKIES` env var
- Session check via `GET /api/me` on app mount

### Authorization (RBAC)

Three user tiers enforce access control at the middleware level:

| Tier     | Permissions                                    |
|----------|------------------------------------------------|
| Viewer   | Read all data                                  |
| Editor   | Read + write recipes, ingredients, plans, participants |
| Admin    | Full access including user management and settings    |

Middleware chain: `authenticate` (JWT verification) -> `requireTier(['Editor', 'Admin'])` or `requireAdmin`.

### Rate Limiting

- Auth endpoints (`/api/register`, `/api/login`) are rate-limited to 20 requests per 15-minute window
- Rate limiting is disabled in the test environment

### CORS

- **Production**: Allowed origins set via `CORS_ORIGINS` or `CORS_ORIGIN` environment variable (comma-separated)
- **Development**: Allows `localhost` origins automatically
- Credentials are included in CORS responses to support cookie-based auth

### Input Validation

- All write endpoints validate payloads against JSON Schema (AJV) before any persistence
- Validation errors return 400 with field-level details
- Full AJV error output (including schema paths) is only exposed to Admin users; other tiers get simplified messages
- Ingredient name and alias conflicts are checked server-side before save

### Data Integrity

- Atomic file writes: data is written to a `.tmp` file first, then renamed to the target path
- Recipes and ingredients are sorted by name before save to maintain deterministic output
- Users are filtered to valid tiers on read (invalid tier entries are silently dropped)
- `purgeInvalidUsers()` runs on server startup to clean malformed user records

## Performance

### Frontend

- **useMemo**: Expensive calculations (filtered recipes, meal totals, aggregated ingredients) are memoized
- **useCallback**: Event handlers passed to child components are wrapped to prevent unnecessary re-renders
- **Debounced sync**: Meal plan and cook plan writes to the API are debounced; localStorage writes are immediate
- **Local-first**: Meal plan data loads from localStorage instantly, then syncs with the server in the background

### Backend

- **JSON file storage**: Simple and fast for the expected data sizes (single-user to small-team use)
- **Schema caching**: AJV validators are compiled once at startup and reused for all requests
- **Static file serving**: Production mode serves the Vite build output directly from Express
