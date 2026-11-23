---
title: Why ESLint for JavaScript static analysis
type: decision
sources: [S039, S040, S041, S042]
updated: 2026-11-23
---

# Why ESLint for JavaScript static analysis

Feature 006 adds static analysis for the plugin's JavaScript and an independent CI job. How to run it: [Run the JavaScript lint](./run-javascript-lint.md). It builds on the Node project from [Why Vitest](./vitest-javascript-unit-tests.md).

## Decisions
- **Tool**: ESLint 10 (flat config) with `@eslint/js`, `eslint-plugin-jsdoc` 65 and `globals`, added to the existing plugin-root Node project. Biome and oxlint were rejected (no JSDoc-requirement rules as complete as ESLint's); JSHint and StandardJS were rejected (maintenance, flexibility) (S040).
- **Scope**: `npm run lint` passes exactly `assets/javascripts` and `test/javascript` to eslint, so `test/e2e/` is never scanned. `eslint .` was rejected because it would silently scan the e2e specs. ESLint fails when a pattern matches no files, which satisfies the "zero targets must fail" requirement with no extra code (S040).
- **Everything is an error**: the presets ship no `warn` rules, and `--max-warnings 0` catches any a future preset adds. The plan proposed promoting preset rules with `Object.entries`; the implementation instead uses the jsdoc `flat/recommended-error` preset (S040, S042).
- **JSDoc is required** on every function and constructor; the jsdoc fixers are disabled (`enableFixer: false`) so no empty stubs are generated (S040, S042).
- **Top-level `var` stays**: the ERB views assign those globals by bare name and the Vitest loader re-runs the script per test, so a top-level `let`/`const` would throw "Identifier has already been declared". `no-var` is replaced by a `no-restricted-syntax` selector that bans only nested `var`, with the reason recorded in the config. Per-line disables and a file-wide disable were rejected (S040, S042).
- **No `camelcase` rule**: 70 snake_case globals are referenced by name from the views, and renaming them would change the views (YAGNI) (S040).
- **Globals**: browser globals plus read-only `jQuery` and `$`. For the ESM tests, the plugin's top-level names are collected by parsing `code_review.js` at config load (an exception if none are found), never hand-listed (S040, S042).
- **Ratchet limits** (`max-lines`, `max-lines-per-function`, `complexity`, `max-depth`, `max-params`) start from measured maxima and may only be lowered. The research measured max-lines 360 and function length 60; the config now has 351 and 49 for assets (270 max-lines for tests) (S040, S042).
- **Baseline**: 98 violations, all in `code_review.js` (25 JSDoc, 56 nested `var`, 5 unused args, 5 `curly`, 7 `eqeqeq`); fixed without changing behavior. Unused arguments are renamed with a leading `_` (S040, S041).

Feature 005's "no lint" scope statement (S039) is superseded by this decision (S040); see [Why Vitest](./vitest-javascript-unit-tests.md).

## CI
A `lint-javascript` job in `build.yml` with no `needs`, no Redmine and no DB: checkout, Node 24, `npm ci`, `npm run lint`, Slack notification on failure. It is separate from the `javascript` unit-test job so each result is visible on its own. Renovate updates the lint packages by default; `renovate.json` is unchanged (S040).

## ADR
Recorded as `docs/adr/0004-adopt-eslint-for-javascript-static-analysis.md`; raising a ratchet limit needs a new ADR (S040, S042).
