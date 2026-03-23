# Contributing

Guidelines for contributing to PromptPantry.

## Getting Started

1. Fork the repository and create a feature branch from `main`.
2. Install dependencies:

   ```bash
   cd prompt-pantry-app && npm install
   ```

   This also configures the git hooks automatically via the `prepare` script.

3. Make your changes, following the existing code style and patterns.

## Code Style

- `server/` is CommonJS (`.js`); `src/` is ESM TypeScript. Do not mix module systems.
- TypeScript is strict: `noUnusedLocals` and `noUnusedParameters` are enforced.
- ESLint bans `console.log` — use `console.warn` or `console.error`.
- Large features are split into subdirectories with barrel `index.ts` exports.

## Before Submitting

- **Tests**: Ensure all tests pass (`npm test`) and add tests for new functionality.
- **Coverage**: Check test coverage hasn't regressed (`npm run test:coverage`).
- **Linting**: Run `npm run lint` and fix any issues.
- **Documentation**: Update relevant docs for significant changes — architecture docs live in `documentation/`.
- **Schema changes**: If you modify data structures, update the corresponding JSON Schemas in `schemas/`.
- **Commit messages**: Write clear, descriptive commit messages that explain the *why* behind changes.

## Version Bumping

A `pre-push` git hook automatically increments the patch version (e.g. `v0.1.6` → `v0.1.7`) in `Navigation.tsx` and
amends the commit before pushing. This is installed when you run `npm install`. Major and minor versions are bumped
manually when appropriate.

## Pull Request Guidelines

- Keep PRs focused — one feature or fix per PR.
- Include a description of what changed and why.
- Link related issues if applicable.
- Be responsive to review feedback.

## AI-Assisted Contributions

AI-assisted contributions are welcome. Please review and understand any generated code before submitting — do not
submit code you cannot explain or have not verified.
