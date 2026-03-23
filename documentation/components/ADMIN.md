# Admin Panel

Admin-only settings panel for application configuration and user management.

## AdminPanel (`src/components/AdminPanel.tsx`)

Accessible only to users with the Admin tier.

### Props

| Prop                  | Type       | Description                          |
|-----------------------|------------|--------------------------------------|
| `registrationEnabled` | `boolean`  | Current registration status          |
| `toggleRegistration`  | `function` | Toggle registration on/off           |
| `advancedMode`        | `boolean`  | Current advanced mode status         |
| `setAdvancedMode`     | `function` | Toggle advanced mode                 |
| `macroLimits`         | `object`   | Current macro limit configuration    |
| `setMacroLimits`      | `function` | Update macro limits                  |
| `fetchSettings`       | `function` | Refresh settings from server         |

### Sections

#### Registration Control

Toggle whether new users can register. When disabled, only admins can create accounts via the user management panel.

#### Advanced Mode

Toggle advanced mode, which enables features like the raw JSON recipe editor.

#### Macro Limits (`MacroLimitsSection`)

Configure the min/max bounds for participant macro percentages:

- Minimum and maximum values for protein, carbs, and fat percentages
- These limits are enforced in the Participants component when editing macro ratios
- Persisted to `settings.json` via `PUT /api/settings`

#### Recipe Data Audit (`RecipeAuditSection`)

Scans all recipes against the ingredient definition library to surface data quality issues. Triggered
on demand via a "Run Audit" button — calls `GET /api/recipes/audit`.

**Issue types detected:**

| Type                  | Description                                                        |
|-----------------------|--------------------------------------------------------------------|
| Unlinked              | Recipe ingredient has no `ingredientId` linking it to a definition |
| Broken Link           | `ingredientId` does not match any ingredient definition            |
| Missing Measurement   | No `quantity`/`measure`, `metric`, or `imperial` data present      |
| Schema Invalid        | Recipe fails JSON Schema validation                                |

**UI features:**

- Summary cards showing total recipes and per-type issue counts (highlighted when non-zero)
- Filter dropdown to narrow results by issue type
- Expandable recipe rows with color-coded issue badges
- Scrollable list (max height) for large datasets
- Success message when all recipes pass

#### User Management

Full CRUD for user accounts:

| Action        | API Call                      | Notes                            |
|---------------|-------------------------------|----------------------------------|
| List users    | `GET /api/users`              | Passwords excluded from response |
| Create user   | `POST /api/users`             | Via `CreateUserModal`            |
| Change tier   | `PUT /api/users/:username`    | Dropdown selector                |
| Delete user   | `DELETE /api/users/:username`  | With confirmation dialog        |

### Subcomponents

| Component            | Purpose                                          |
|----------------------|--------------------------------------------------|
| `MacroLimitsSection`   | Inline form for editing macro min/max limits   |
| `CreateUserModal`      | Modal form for creating a new user account     |
| `RecipeAuditSection`   | On-demand recipe data quality scanner          |
| `SummaryCard`          | Stat card used in audit summary display        |

### Business Rules

- Cannot delete the only Admin user
- Cannot demote the only Admin user (must have at least one Admin)
- Cannot delete your own account
- Tier options: Viewer, Editor, Admin

### State

| State            | Purpose                                |
|------------------|----------------------------------------|
| `users`          | List of all users (fetched from API)   |
| `loading`        | Loading state for user list            |
| `createModalOpen`| Controls CreateUserModal visibility    |
| `createError`    | Error message from user creation       |
| `actionError`    | Error message from tier change/delete  |
| `deleteConfirm`  | Username pending delete confirmation   |
