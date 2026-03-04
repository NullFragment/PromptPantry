# UI Helpers

Small reusable UI components: date pickers and generic confirmation dialogs.

## DatePicker (`src/components/DatePicker.tsx`)

Custom calendar picker for date selection.

### Props

| Prop           | Type       | Default | Description       |
|----------------|------------|---------|-------------------|
| `selectedDate` | `Date`     |         | Current selection |
| `onChange`     | `function` |         | Selection handler |
| `onClose`      | `function` |         | Close handler     |

**Features:**

- Month navigation
- Today button
- Visual current day indicator
- Click outside to close
- Keyboard navigation (Escape)

---

## ConfirmationDialog (`src/components/ConfirmationDialog.tsx`)

Reusable confirmation/alert modal.

### Props

| Prop           | Type                 | Default   | Description                                            |
|----------------|----------------------|-----------|--------------------------------------------------------|
| `title`        | `string`             |           | Dialog title                                           |
| `message`      | `string`             |           | Dialog message                                         |
| `confirmLabel` | `string`             | `Confirm` | Confirm button text                                    |
| `cancelLabel`  | `string`             | `Cancel`  | Cancel button text (set `cancelLabel: 'none'` to hide) |
| `onConfirm`    | `function`           |           | Confirm handler                                        |
| `onCancel`     | `function`           |           | Cancel handler                                         |
| `variant`      | `'danger' \| 'info'` | `info`    | Visual style                                           |

**Features:**

- Two variants: danger (red) and info (blue)
- Customizable button labels
- Optional cancel button (hide with `cancelLabel: 'none'`)
- Click outside to cancel

**Notes:**

- The `cancelLabel: 'none'` behavior hides the cancel button and will not call `onCancel` unless the dialog is dismissed
  via click-outside or Escape. Documented here for clarity.

