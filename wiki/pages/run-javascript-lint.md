---
title: Run the JavaScript lint
type: howto
sources: [S040, S041, S042]
updated: 2026-11-23
---

# Run the JavaScript lint

Rationale: [Why ESLint](./eslint-javascript-static-analysis.md). Run from the plugin root, after `npm ci` (S040, S041).

## Commands
- `npm run lint`: `eslint --max-warnings 0 assets/javascripts test/javascript`. CI runs the same command (S040).
- `npm run lint:fix`: applies only mechanical fixes (braces, comment formatting). Missing JSDoc must be written by hand (S040, S042).

## Fixing violations
- A new top-level function needs JSDoc, and a nested variable must use `let`/`const`, not `var` (S040, S042).
- Name intentionally unused arguments with a leading `_` (S040).
- Do not raise a size or complexity limit; refactor instead (S042).
- Exceptions are individual, with a reason in the config. Blanket disables, `ignores` and TODO files are not allowed (S041).

## Related
- Unit tests: [Run the JavaScript unit tests](./run-javascript-unit-tests.md).
- Ruby side: [Run RuboCop](./run-rubocop.md).
