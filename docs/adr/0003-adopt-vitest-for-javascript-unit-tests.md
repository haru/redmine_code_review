# 0003. Adopt Vitest for JavaScript unit tests

- Status: Accepted
- Date: 2026-11-22

## Context

The review UI logic lives in `assets/javascripts/code_review.js` as a classic
script that exposes top-level functions and mutable globals (`urlprefix`, `rev`,
`review_counts`, `code_reviews_map`, ...). Views overwrite these globals with ERB
values and call the functions. Nothing tested this file except the Playwright E2E
suite, so regressions in pure logic (URL building, list rendering, form state)
were caught late, and line coverage was 0%. CI needed an independent, fast job
that does not boot Redmine or a database, with a coverage gate that CI and local
runs measure identically.

## Decision

Add a Node project at the plugin root (separate from `test/e2e/`) using
**Vitest + jsdom + `@vitest/coverage-v8`**:

- `vitest.config.js` runs in the jsdom environment with
  `include: test/javascript/**/*.test.js`; v8 coverage measures only
  `assets/javascripts/**/*.js`, reports to `coverage-js/` (kept apart from
  SimpleCov's `coverage/`), and fails below `thresholds.lines: 95`
  (`perFile: false`).
- Tests load the classic script with
  `vm.runInThisContext(source, { filename })` (`test/javascript/support/load_classic_script.js`)
  after loading jQuery and jQuery UI in page order. Top-level declarations become
  globals exactly like a `<script>` tag, so views and tests share the same state
  model and the production file needs no test-only changes (no `window.X` exports). The `filename` keeps v8 coverage
  attributed to `code_review.js`. Paths resolve via
  `path.resolve(process.cwd(), ...)` — `new URL(..., import.meta.url)` breaks
  because Vite rewrites it as an asset reference.
- `jquery@3.7.1` and `jquery-ui@1.13.3` are pinned to the exact versions bundled
  with the Redmine this plugin targets, and Renovate is configured to never update
  them (`packageRules` in `renovate.json`); the CI job has no Redmine checkout, so
  the bundle is not reachable from there.
- Server communication is never performed in tests: `$.fn.load` is spied on and the
  calls are asserted on element, URL and parameters.
- `.github/workflows/build.yml` gains a `javascript` job (checkout, setup-node 24
  with npm cache, `npm ci`, `npm run test:coverage`, step-summary of counts and the
  four coverage metrics via `jq`, Codecov upload under `flags: javascript`) that
  runs in parallel with `rubocop`/`build` and fails on any test failure, 0 tests,
  or coverage below 95%.

## Alternatives considered

- **Jest**: needs extra flags for ESM support and more configuration than Vitest.
- **Loading `code_review.js` as an ES module**: top-level declarations would become
  module-local; every function and every state variable would need `window.X = X`
  exports or a namespace rewrite — a change to production code that exists only to
  make tests possible.
- **Playwright coverage from the E2E suite**: E2E is deliberately outside CI
  (ADR 0001) and slower; unit feedback should come in seconds, not minutes.
- **Ratcheting coverage thresholds** (start low, raise over time): rejected; 95%
  was already reachable at introduction because dead Prototype.js code was removed
  and view logic was extracted before enabling the gate.

## Consequences

- `npm test` / `npm run test:coverage` are the entry points; CI and local runs read
  the same `vitest.config.js`, so the pass/fail criteria cannot drift.
- `code_review.js` must stay a classic script; converting it to an ES module is a
  breaking change for this loader and for the views' global-based contract.
- jQuery/jQuery UI versions are frozen by policy; upgrading them means testing
  against a bundle the target Redmine does not ship.
- The `javascript` job publishes to Codecov under the `javascript` flag, while the
  Ruby job is now tagged `flags: ruby`, keeping the two languages separately
  tracked.
