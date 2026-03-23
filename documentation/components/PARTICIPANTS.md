# Participant Management

Participant profiles and per-person nutritional progress tracking.

## Participants (`src/components/Participants.tsx`)

Manage participant profiles and nutritional targets.

### Props

| Prop           | Type            | Description                               |
|----------------|-----------------|-------------------------------------------|
| `participants` | `Participant[]` | Current participant data                  |
| `onSave`       | `function`      | Save handler (calls `PUT /api/participants`) |
| `macroLimits`  | `object`        | Admin-configured limits for macro clamping|

### Features

- Add / remove participants
- Inline editing of participant details:
    - Name
    - Icon (emoji picker)
    - Maintenance calories
    - Calorie deficit percentage
    - Macro ratios (protein, carbs, fat)
- Live calculation of calorie and macro targets
- Macro percentage clamping based on `macroLimits` (admin-configurable min/max)
- Validation of macro percentages (must sum correctly)
- Emoji icon picker for participant avatars

### State

- `participants` -- local copy for editing (synced back on save)
- `editingIndices` -- tracks which participants are in edit mode
- `showIconPicker` -- controls emoji picker visibility per participant

---

## ParticipantProgress (`src/components/ParticipantProgress.tsx`)

Visual progress bars for participant nutritional intake. Used in both the Calendar and WeeklyPlanner views.

### Props

| Prop          | Type          | Description               |
|---------------|---------------|---------------------------|
| `participant` | `Participant` | Participant data          |
| `current`     | `Macros`      | Current intake for period |

### Features

- Progress bars for calories, protein, carbs, fat
- Color coding:
    - Green: Within 5% of target
    - Yellow: Within 10% of target
    - Red: More than 10% off target
- Percentage display relative to target
