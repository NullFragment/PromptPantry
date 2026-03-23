# Navigation

Top-level navigation bar for view switching, theme controls, and logout.

## Navigation (`src/components/Navigation.tsx`)

Responsive top navigation bar.

### Props

| Prop           | Type       | Description              |
|----------------|------------|--------------------------|
| `view`         | `string`   | Current active view      |
| `setView`      | `function` | View change handler      |
| `setDarkMode`  | `function` | Dark mode toggle handler |
| `setUnitSystem`| `function` | Unit system change handler |
| `onLogout`     | `function` | Logout handler           |

### Context Usage

Navigation reads shared state from `useAppContext()` rather than receiving it as props:

| Context Value | Usage                                              |
|---------------|----------------------------------------------------|
| `darkMode`    | Controls dark/light mode toggle state              |
| `unitSystem`  | Controls metric/imperial/both selector state       |
| `userTier`    | Controls visibility of Admin link                  |

### Features

- View switching buttons with active state styling
- Dark/Light mode toggle
- Unit system selector (Metric / Imperial / Both)
- Admin link (only visible when `userTier === 'Admin'`)
- Logout button
- Responsive layout

### View Tabs

| Tab            | View Key       | Visible To  |
|----------------|----------------|-------------|
| Recipes        | `recipes`      | All users   |
| Calendar       | `calendar`     | All users   |
| Weekly         | `weekly`       | All users   |
| Shopping       | `shopping`     | All users   |
| Ingredients    | `ingredients`  | All users   |
| Participants   | `participants` | All users   |
| Admin          | `admin`        | Admin only  |
