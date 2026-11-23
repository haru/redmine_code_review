---
title: Run the JavaScript unit tests
type: howto
sources: [S038, S039, S040, S047]
updated: 2026-11-23
---

# Run the JavaScript unit tests

Rationale: [Why Vitest for JavaScript unit tests](./vitest-javascript-unit-tests.md).

## Commands (S038, S039)
From the plugin root (not the Redmine root): `npm ci`, then `npm test` or `npm run test:coverage`. The coverage run fails below 95% lines and writes `coverage-js/`, which is git-ignored along with `node_modules/`. CI runs `npm ci` and the coverage script on Node 24, then summarizes counts and coverage in the step summary. `engines.node` is `>= 22`.

## Layout (S039)
`vitest.config.js` and `package.json` sit at the plugin root. Tests live in `test/javascript/*.test.js`, which Minitest ignores since it only picks up `*_test.rb`. They are split by screen and by mechanism: `repository_view`, `diff_view`, `review_form`, `popup_actions`, `settings`, plus `crload`, `initialize`, `actions`, `dialog_open_close` and `dialog_drag_resize` (S047). `test/javascript/support/` holds the loader `load_classic_script.js` (with its own test) and `diff_fixture.js`, which builds the `diff-view` marker and file tables (S047).

## Writing tests (S038, S047)
- Reload the scripts in `beforeEach`; that resets the plugin's globals, and coverage still accumulates (S038).
- Stub `fetch` with `vi.stubGlobal('fetch', ...)` instead of letting requests run; there is no jQuery to spy on (S047). See [Why plain JavaScript instead of jQuery](./replace-jquery-with-plain-javascript.md).
- Render the server's markup into `document.body` and call `crInitialize(document)`, as a page load would (S047).

## Related
- Static analysis of the same files: [Run the JavaScript lint](./run-javascript-lint.md) (S040).
- RuboCop is unaffected: it excludes `node_modules/**/*` by default (S038); see [Run RuboCop](./run-rubocop.md).
- Browser-level checks: [Run the E2E tests](./run-e2e-tests.md).
