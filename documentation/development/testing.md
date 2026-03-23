# Testing

Running tests, coverage reports, and test architecture overview.

## Running Tests

All commands run from `prompt-pantry-app/`:

```bash
npm test                          # run full suite once and exit
npm run test-interactive          # watch mode (re-runs on file changes)
npm run test:coverage             # run with coverage report (68% branch threshold)
```

Run a single test file:

```bash
npx vitest run test/mealPlanUtils.test.ts
```

## Test Output

Coverage reports are generated in `prompt-pantry-app/coverage/`.

## Test Architecture

See [architecture/testing.md](../architecture/testing.md) for the full test strategy, including test structure,
isolation patterns (server factory + temp data directories), and coverage targets.
