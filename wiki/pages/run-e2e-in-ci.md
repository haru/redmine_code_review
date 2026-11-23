---
title: Run the E2E tests in CI
type: howto
sources: [S048, S049, S050, S051]
updated: 2026-11-23
---

# Run the E2E tests in CI

The Playwright suite runs on every matrix row of the `build` job
(`.github/workflows/build.yml`), reusing the Redmine checkout that
`build-scripts/install.sh` prepared, so the tested Redmine version matches the row
automatically (S048). CI-only logic lives in one script, `build-scripts/e2e.sh`;
`test/e2e/run.sh` and `playwright.config.js` are unchanged, and the JSON reporter and
`--forbid-only` are passed as `run.sh` arguments (S048). Local usage is unchanged: [Run
the E2E tests](./run-e2e-tests.md).

## What e2e.sh does (S048, S050)
1. Sources `build-scripts/env.sh` and resolves `NAME_OF_PLUGIN` like `build.sh` does.
2. In the plugin copy's `test/e2e/`: `npm ci` (lockfile-exact) and
   `npx playwright install --with-deps chromium`. No browser cache — `--with-deps`' apt
   step makes it low-value (YAGNI).
3. Truncates `$PATH_TO_REDMINE/log/test.log` so the failure artifact holds only this run
   (this also discards the Minitest log of `Build` on that row).
4. Runs `./run.sh --forbid-only --retries=0 --reporter=list,json` with
   `PLAYWRIGHT_JSON_OUTPUT_FILE` at the checkout root; the step has a 20-minute timeout.

## Step order and conditions in build.yml (S050)
`Install` (`id: install`) → `Build` (Ruby tests) → codecov → `Setup Node` (setup-node@v4,
Node 24, npm cache keyed on `test/e2e/package-lock.json`) → `E2E` (`id: e2e`) → `E2E
Summary` → `Upload E2E artifacts` → `Clean` → Slack.
- codecov stays right after `Build`; only `Clean` moved, to after the E2E steps, because it
  deletes `testspace/`, which the artifact upload needs.
- `Setup Node` and `E2E` run when the install succeeded even if the Ruby tests failed
  (`!cancelled() && steps.install.outcome == 'success'`): a Ruby regression cannot hide a
  broken UI. The E2E DB stays the throwaway sqlite3 workspace — SQLite works on the
  mysql/postgres rows too, because the CI `database.yml` always lists all three adapters,
  so every row installs all DB gems (S048).
- The existing Slack step's `if: failure()` picks up E2E failures without changes (S048).

## Failing loudly (S050, S051)
- No retries (`--retries=0` is passed by `e2e.sh`, no `continue-on-error`); the plugin's
  `workers: 1`, single-DB suite is kept as-is.
- `--forbid-only` fails on `test.only`; "No tests found" makes Playwright exit non-zero;
  all-skipped runs can still exit 0, so `E2E Summary` runs
  `node build-scripts/e2e-summary.js e2e-results.json >> "$GITHUB_STEP_SUMMARY"`. The
  script (plain ESM Node, no `jq` needed) throws when the report is missing or malformed,
  a stat is not a number, or `expected + unexpected + flaky == 0`.
- It prints an Executed/Passed/Failed/Flaky/Skipped/Duration table in the same
  format as the `javascript` job's summary; because it is a plain script, the same logic
  runs locally against a sample report.

## Failure artifacts (S050)
When the `E2E` step itself fails, `actions/upload-artifact@v4` keeps
`e2e-ruby<ruby>-<redmine>-<db>` for 7 days (`if-no-files-found: error`), uploaded before
`Clean`. Rows that fail only in `Build` or in `E2E Summary` (no test executed) upload
nothing, and successful rows keep none. Paths inside the archive start at the CI workspace
root: `testspace/redmine/plugins/*/test/e2e/test-results/` (screenshots, `trace.zip`),
`testspace/redmine/log/test.log`, `testspace/redmine/tmp/e2e/` (the kept workspace,
sqlite file `db.sqlite3`) and `e2e-results.json`. How to read them: `test/e2e/README.md`.

Background: [Why Playwright for E2E tests](./e2e-playwright-adoption.md) (the "CI is out
of scope" stance was replaced by this page), [Run the E2E tests](./run-e2e-tests.md).
