---
title: Why Vitest for JavaScript unit tests
type: decision
sources: [S038, S039]
updated: 2026-11-23
---

# Why Vitest for JavaScript unit tests

Feature 005 adds unit tests for `assets/javascripts/code_review.js` and a CI job that enforces coverage. How to run them: [Run the JavaScript unit tests](./run-javascript-unit-tests.md). The browser-level suite is separate: [Why Playwright](./e2e-playwright-adoption.md).

## Decisions
- **Runner**: Vitest with `@vitest/coverage-v8` and jsdom. Jest was rejected (more configuration, ESM flags). Playwright coverage was rejected because E2E is not in CI and is slower. A ratcheting threshold was rejected: 95% line coverage is enforced from the first run (S038).
- **Loading the script**: `code_review.js` is a classic script whose top-level `var`s and functions are globals that view scripts overwrite (`urlprefix`, `rev`, ...). An ESM `import()` would make them module-local. The test loader therefore runs the file with `vm.runInThisContext(source, { filename })`, leaving production code untouched; the filename makes v8 attribute coverage to the file. Rejected: appending `window.X = X` (breaks shared state), a namespace rewrite (too large, all ERB would change), `(0, eval)` (no filename, no coverage) (S038).
- **Path gotcha**: `new URL(..., import.meta.url)` is rewritten by Vite and breaks, so paths are resolved from `process.cwd()` (S038).
- **jQuery**: `jquery@3.7.1` and `jquery-ui@1.13.3` from npm, pinned exactly to the versions Redmine bundles, and excluded from Renovate updates so tests do not drift from production. Referencing Redmine's own files was rejected because the JS CI job does not check out Redmine; mocking jQuery was rejected because DOM and `dialog` behavior would go untested (S038).
- **Ajax**: tests spy on `$.fn.load` and check the target element, URL and params; `$.ajax` is never called (S038).
- **Separate Node project** at the plugin root, independent of `test/e2e/`; coverage goes to `coverage-js/`, apart from SimpleCov's `coverage/` (S038, S039).
- **No lint** for JavaScript (a clarification in the spec) (S039).

## View logic moved into code_review.js
Logic in the inline scripts of 14 templates (function definitions, event binding, `ready` loads, DOM manipulation) moved into `code_review.js`; value hand-off and ERB loops that export data stay in the views. Settings-page functions now take their URL as an argument (`add_assign_filter(url)`, `change_option(url, flag)`). New globals: `loadOnReady`, `bindReviewFormTrackerChange`, `moveAssignLinkAboveFileContent`. Values passed from ERB into JS string literals use `escape_javascript` in the moved call sites (S038, S039). Dead code was deleted: see [code_review.js internals](./review-javascript-internals.md).

## Known defects deliberately kept
`make_addreview_link`'s `alist == null` check never fires in jQuery, and `clickPencil` uses `eval`. Behavior was not changed; unit tests pin the current behavior (S038).

## CI
A `javascript` job in `build.yml`, with no Redmine or DB, fails on zero tests (Vitest's default) or coverage under 95%. Codecov uploads use the `javascript` flag, and the Ruby upload gets `flags: ruby` (S038).
