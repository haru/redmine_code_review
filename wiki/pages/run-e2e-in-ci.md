---
title: Run the E2E tests in CI
type: howto
sources: [S048, S049]
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

## What e2e.sh does (S048)
1. Sources `build-scripts/env.sh` and resolves `NAME_OF_PLUGIN` like `build.sh` does.
2. In the plugin copy's `test/e2e/`: `npm ci` (lockfile-exact) and
   `npx playwright install --with-deps chromium`. No browser cache — `--with-deps`' apt
   step makes it low-value (YAGNI) (S048).
3. Truncates `$PATH_TO_REDMINE/log/test.log` so the failure artifact holds only this run (S048).
4. Runs `./run.sh --forbid-only --reporter=list,json` with `PLAYWRIGHT_JSON_OUTPUT_FILE`
   at the checkout root; the step has a 20-minute timeout (S048).

## Step order and conditions in build.yml (S048)
`Install` (`id: install`) → `Build` (Ruby tests) → codecov → `Setup Node` (setup-node@v4,
Node 24, npm cache keyed on `test/e2e/package-lock.json`) → `E2E` (`id: e2e`) → `E2E
Summary` → `Upload E2E artifacts` → `Clean` → Slack.
- codecov runs **before** the E2E steps, so an E2E failure never skips the Ruby coverage
  upload (S048).
- `Setup Node` and `E2E` run when the install succeeded even if the Ruby tests failed
  (`!cancelled() && steps.install.outcome == 'success'`): a Ruby regression cannot hide a
  broken UI (S048). The E2E DB stays the throwaway sqlite3 workspace — SQLite works on the
  mysql/postgres rows too, because the CI `database.yml` always lists all three adapters,
  so every row installs all DB gems (S048).
- The existing Slack step's `if: failure()` picks up E2E failures without changes (S048).

## Failing loudly (S048)
- No retries (`retries` stays unset, no `continue-on-error`); the plugin's
  `workers: 1`, single-DB suite is kept as-is.
- `--forbid-only` fails on `test.only`; "No tests found" makes Playwright exit non-zero;
  all-skipped runs can still exit 0, so `E2E Summary` fails when
  `expected + unexpected + flaky == 0` or the result file is missing.
- The summary is parsed with `node -p` — `ruby:*` images ship no `jq` — and writes a
  Passed/Failed/Flaky/Skipped/Duration table to `$GITHUB_STEP_SUMMARY`, in the same
  format as the `javascript` job's summary (S048, S049).

## Failure artifacts (S048)
On failure only, `actions/upload-artifact@v4` keeps `e2e-ruby<ruby>-<redmine>-<db>` for
7 days (`if-no-files-found: error`), uploaded before `Clean` removes `testspace/`:
`test/e2e/test-results/` (screenshots, `trace.zip`), `log/test.log`, the kept `tmp/e2e/`
workspace, and `e2e-results.json`. Successful rows keep no artifacts. How to read them:
`test/e2e/README.md`.

Background: [Why Playwright for E2E tests](./e2e-playwright-adoption.md) (the "CI is out
of scope" stance was replaced by this page), [Run the E2E tests](./run-e2e-tests.md).
