# Authentication & Authorization

JWT-based authentication with role-based access control (RBAC) using three user tiers.

## User Tiers

| Tier     | Capabilities                                                     |
|----------|------------------------------------------------------------------|
| Viewer   | Read all data (recipes, ingredients, meal plans, participants)   |
| Editor   | Read + write recipes, ingredients, meal plans, participants      |
| Admin    | Full access including user management, settings, and invalid recipe access |

## Registration

Handled by `POST /api/register` in `authRoutes.js`.

- The first user to register automatically becomes an **Admin**
- Subsequent users are assigned the **Viewer** tier
- Registration can be disabled by an Admin via `PUT /api/settings/registration`
- When registration is disabled, only Admins can create new accounts through the Admin Panel

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
    subgraph RegistrationFlow["Registration Flow"]
        Register["POST /api/register"]:::blue --> HasUsers{"Any users exist?"}:::amber
        HasUsers -->|No| Admin["Create as Admin"]:::green
        HasUsers -->|Yes| Viewer["Create as Viewer"]:::slate
        Admin --> Hash["Hash password with bcrypt"]:::teal
        Viewer --> Hash
        Hash --> Save["Save to users.json"]:::green
    end

    classDef blue fill:#4A90D9,stroke:#3570B0
    classDef amber fill:#C8A040,stroke:#A88020
    classDef green fill:#4EA882,stroke:#308862
    classDef slate fill:#808898,stroke:#606878
    classDef teal fill:#48A8A0,stroke:#288888

    style RegistrationFlow fill:#88888814,stroke:#888888

    linkStyle 0 stroke:#4A90D9
    linkStyle 1 stroke:#C8A040
    linkStyle 2 stroke:#C8A040
    linkStyle 3 stroke:#4EA882
    linkStyle 4 stroke:#808898
    linkStyle 5 stroke:#48A8A0
```

## Login

Handled by `POST /api/login` in `authRoutes.js`.

1. Look up user by username in `users.json`
2. Verify password with `bcrypt.compare()`
3. Sign a JWT containing `{ username }` with `JWT_SECRET` (7-day expiry)
4. Set the JWT as an httpOnly cookie (`token`)

Cookie options:
- `httpOnly: true` (not accessible via JavaScript)
- `sameSite: 'strict'`
- `secure`: set when `SECURE_COOKIES=true` (for HTTPS deployments)
- `maxAge`: 7 days

## Session Check

On app mount, the frontend calls `GET /api/me`:

- If a valid JWT cookie is present, returns `{ username, tier }`
- If no/invalid JWT, returns 401 and the app shows the Login screen

## Logout

`POST /api/logout` clears the `token` cookie.

## Middleware

Defined in `server/middleware.js`:

| Middleware              | Purpose                                                |
|-------------------------|--------------------------------------------------------|
| `authenticate`          | Verify JWT from `req.cookies.token`, load user, set `req.user` |
| `requireTier(tiers[])`  | Check that `req.user.tier` is in the allowed tiers list |
| `requireEditor`         | Shorthand for `requireTier(['Editor', 'Admin'])`       |
| `requireAdmin`          | Shorthand for `requireTier(['Admin'])`                 |

### authenticate Middleware

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
    subgraph AuthMiddleware["authenticate Middleware"]
        Request[Incoming Request]:::blue --> Cookie{"Has token cookie?"}:::amber
        Cookie -->|No| Unauth["401 Unauthorized"]:::red
        Cookie -->|Yes| Verify{"jwt.verify(token, secret)"}:::amber
        Verify -->|Invalid| Unauth
        Verify -->|Valid| LoadUser["Load user from users.json"]:::teal
        LoadUser --> Found{"User exists?"}:::amber
        Found -->|No| Unauth
        Found -->|Yes| SetReq["Set req.user = { username, isAdmin, tier }"]:::green
        SetReq --> Next[Next middleware]:::blue
    end

    classDef blue fill:#4A90D9,stroke:#3570B0
    classDef amber fill:#C8A040,stroke:#A88020
    classDef green fill:#4EA882,stroke:#308862
    classDef red fill:#C86060,stroke:#A84040
    classDef teal fill:#48A8A0,stroke:#288888

    style AuthMiddleware fill:#88888814,stroke:#888888

    linkStyle 0 stroke:#4A90D9
    linkStyle 1 stroke:#C8A040
    linkStyle 2 stroke:#C8A040
    linkStyle 3 stroke:#C8A040
    linkStyle 4 stroke:#C8A040
    linkStyle 5 stroke:#48A8A0
    linkStyle 6 stroke:#C8A040
    linkStyle 7 stroke:#C8A040
    linkStyle 8 stroke:#4EA882
```

### Test Mode Bypass

When `DEPLOYED` env var is not set (i.e., in development/test), the `authenticate` middleware bypasses JWT verification
and sets `req.user` to a `testuser` Admin. This allows tests and development to proceed without authentication.

## Rate Limiting

Auth endpoints (`/api/register`, `/api/login`) are protected by `express-rate-limit`:

- Window: 15 minutes
- Max requests: 20 per window
- Skipped in test environment (`NODE_ENV === 'test'`)

## User Management

Admin users can manage accounts via the Admin Panel:

| Action      | Endpoint                      | Rules                              |
|-------------|-------------------------------|------------------------------------|
| List users  | `GET /api/users`              | Passwords excluded from response   |
| Create user | `POST /api/users`             | Admin sets username, password, tier|
| Change tier | `PUT /api/users/:username`    | Cannot demote the only Admin       |
| Delete user | `DELETE /api/users/:username`  | Cannot delete self or only Admin  |

## Startup Cleanup

`purgeInvalidUsers()` runs on server startup to remove any user records with invalid tiers or missing required fields.
