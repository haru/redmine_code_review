# 0006. Run the E2E suite in CI inside the build job

- Status: Accepted
- Date: 2026-11-23

## Context

ADR 0001 deliberately left CI integration out of scope: `test/e2e/run.sh` was a
local, developer-invoked gate only. After feature 007 (the review UI rewritten as
plain JavaScript) the UI is driven by plugin code that Minitest and Vitest cannot
fully exercise, so a regression can ship while every existing CI job is green.
Each matrix row of the `build` job already prepares a full Redmine checkout
(`build-scripts/install.sh`: clone, `bundle install`, migrations), which is exactly
the prerequisite the E2E suite needs.

## Decision

Run the Playwright E2E suite on every matrix row of the existing `build` job
(`.github/workflows/build.yml`), reusing the Redmine that `install.sh` prepared:

- A single new script `build-scripts/e2e.sh` holds the CI-only difference. It
  sources `build-scripts/env.sh`, runs `npm ci` (lockfile-exact) and
  `npx playwright install --with-deps chromium` in the plugin copy's `test/e2e/`,
  truncates `$PATH_TO_REDMINE/log/test.log` so the artifact contains only this
  run, and calls `./run.sh --forbid-only --retries=0 --reporter=list,json` with
  `PLAYWRIGHT_JSON_OUTPUT_FILE` pointing at the checkout root.
- `test/e2e/run.sh` and `playwright.config.js` are unchanged; the JSON reporter,
  `--forbid-only` and `--retries=0` are passed as `run.sh` arguments (ADR 0001 keeps `run.sh` as
  the single entry point). No separate `e2e` job, no browser cache, no dedicated
  `database.yml` — the E2E DB stays the throwaway sqlite3 workspace `run.sh`
  builds.
- `Setup Node` and `E2E` run when the install succeeded, even if the Ruby tests
  failed (`!cancelled() && steps.install.outcome == 'success'`), so a Ruby
  regression cannot hide a broken UI. `E2E` has a 20-minute `timeout-minutes`.
  `Clean` now runs after the E2E steps (it deletes `testspace/`, which the
  artifact upload needs); codecov stays right after `Build`.
- No retries (`--retries=0` is passed by `e2e.sh`, no `continue-on-error`), and a
  run that executes nothing fails: `--forbid-only` rejects `test.only`, "No tests
  found" makes Playwright exit non-zero, and `build-scripts/e2e-summary.js` (the
  `E2E Summary` step) fails when `expected + unexpected + flaky == 0` or the
  result file is missing or malformed.
- `e2e-summary.js` parses `e2e-results.json` (Node is available; `ruby:*` images
  ship no `jq`) and prints an Executed/Passed/Failed/Flaky/Skipped/Duration table
  that the step appends to `$GITHUB_STEP_SUMMARY`. It is a plain script, so the
  pass/fail logic runs the same way locally against a sample report.
- When the `E2E` step itself fails, `actions/upload-artifact@v4` keeps
  `e2e-ruby<ruby>-<redmine>-<db>` for 7 days (`if-no-files-found: error`):
  the plugin's `test/e2e/test-results/` (screenshots, traces),
  `log/test.log`, the kept `tmp/e2e/` workspace and `e2e-results.json`, uploaded
  before `Clean` removes `testspace/`. Rows that fail only in `Build` or in
  `E2E Summary` (no test executed) upload nothing.

This supersedes the "CI integration is out of scope for now" consequence of
[ADR 0001](0001-adopt-playwright-for-e2e-tests.md): the suite now runs in CI inside the build job. Everything else in
ADR 0001 (Playwright, Chromium only, `run.sh` as the single entry point, the
isolated workspace) stays in force.

## Consequences

- A broken review UI fails CI on every matrix row, without reproducing the
  failure locally: the summary table and the failure artifacts (screenshots,
  `trace.zip`, `log/test.log`, `tmp/e2e/`) carry the diagnosis.
- The `build` job grows by the E2E runtime (locally measured at ~2 minutes
  including the browser install); the 20-minute step timeout bounds a hung run.
- Contributors get the browser installed by CI; locally nothing changes —
  `run.sh` remains the only local entry point.
- Playwright's `--with-deps` installs OS packages inside the matrix containers;
  an unsupported image (e.g. a future Debian base) surfaces as a visible install
  failure to fix explicitly.
