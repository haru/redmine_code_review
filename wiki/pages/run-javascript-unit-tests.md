---
title: Run the JavaScript unit tests
type: howto
sources: [S038, S039]
updated: 2026-11-23
---

# Run the JavaScript unit tests

Rationale: [Why Vitest for JavaScript unit tests](./vitest-javascript-unit-tests.md).

## Commands (S038, S039)
From the plugin root (not the Redmine root): `npm ci`, then `npm test` or `npm run test:coverage`. The coverage run fails below 95% lines and writes `coverage-js/`, which is git-ignored along with `node_modules/`. CI runs `npm ci` and the coverage script on Node 24, then summarizes counts and coverage in the step summary. `engines.node` is `>= 22`.

## Layout (S039)
`vitest.config.js` and `package.json` sit at the plugin root. Tests live in `test/javascript/*.test.js`, which Minitest ignores since it only picks up `*_test.rb`. They are split by screen: repository view, diff view, review form, settings. The loader is `test/javascript/support/load_classic_script.js`.

## Writing tests (S038)
- Reload the scripts in `beforeEach`; that resets globals such as `code_reviews_map`, and coverage still accumulates.
- Set `$.fx.off = true` so animations run synchronously.
- Spy on `$.fn.load` instead of letting Ajax run.

## Related
- RuboCop is unaffected: it excludes `node_modules/**/*` by default (S038); see [Run RuboCop](./run-rubocop.md).
- Browser-level checks: [Run the E2E tests](./run-e2e-tests.md).
