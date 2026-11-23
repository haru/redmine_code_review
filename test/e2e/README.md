# E2E tests (Playwright)

Browser tests for the plugin's review UI. They run against a throwaway Redmine
(`test` environment, port 4500) with its own sqlite3 database, so your development
database is never touched.

## Prerequisites

Run once in the devcontainer:

```bash
cd plugins/redmine_code_review/test/e2e
npm ci
npx playwright install --with-deps chromium
```

`git` and `node` must be on `PATH`.

## Running

```bash
plugins/redmine_code_review/test/e2e/run.sh                      # all tests
plugins/redmine_code_review/test/e2e/run.sh tests/review.spec.js # one file
cd plugins/redmine_code_review/test/e2e && npm test              # all tests
cd plugins/redmine_code_review/test/e2e && npm test -- tests/review.spec.js
```

The script can be started from any directory, but it needs bash: use `./run.sh` or
`bash run.sh`, not `sh run.sh`.

Arguments are passed through to `npx playwright test` and are resolved relative to
`test/e2e`. The exit code is Playwright's (0 = all passed). The tests only work when
started through `run.sh`, which exports the workspace path, port and Rails environment
(`E2E_REDMINE_ROOT`, `E2E_WORK_DIR`, `E2E_PORT`, `RAILS_ENV`, `DB`, `DB_NAME`,
`REDMINE_LANG`) that `playwright.config.js`, `support/helpers.js` and `support/seed.rb`
read; running `npx playwright test` directly raises a clear error.

## How isolation works

`run.sh`:

1. Checks `git`, `node`, `node_modules`, and that `127.0.0.1:4500` is free.
2. Recreates `<redmine>/tmp/e2e/` and builds a Git repository (two commits), a
   sqlite3 DB (`db.sqlite3_test`: the test environment's `config/database.yml` appends
   `_test`) built from the core and plugin migrations alone (`SCHEMA` points into the workspace, so a local `db/schema.rb` is neither loaded nor overwritten), default Redmine data and the seed data (`support/seed.rb`, which writes
   `tmp/e2e/seed.json`). The seed refuses to run if the connected DB is not under
   `tmp/e2e/`, and fails if git did not produce the two expected changesets.
3. Runs `npx playwright test`; Playwright's `webServer` starts Redmine on port 4500
   with its PID file in `tmp/e2e/` and stops it afterwards.
4. Deletes `tmp/e2e/` when the run succeeds. After a failed run (including Ctrl+C) it
   is kept for inspection (DB, repository, seed) and recreated by the next run.

A run writes only to `tmp/e2e/`, `test/e2e/test-results/` (cleared on every run) and
`log/test.log` (appended by Rails), besides the one-time Playwright browser install in
`~/.cache/ms-playwright`.

## When a test fails

Screenshots and `trace.zip` of failed tests are kept in `test/e2e/test-results/`
(cleared on the next run). Open a trace with:

```bash
npx playwright show-trace test-results/<test-dir>/trace.zip
```

Server-side exceptions behind a failing request are logged to `log/test.log` (shared
with the Minitest suite), not to the Playwright output. If the failure happens while
preparing the DB or seed (before Playwright starts), the console output and the kept
`tmp/e2e/` are the places to look.

## Adding a test

1. Create `tests/<name>.spec.js`; it is picked up automatically.
2. Import `test` and `expect` from `../support/fixtures`, never from `@playwright/test`:
   the fixture fails any test during which a page throws an uncaught JavaScript
   exception (`console.error` output is ignored).
3. Reuse `support/helpers.js`: `seed` (projects, repositories, revision, path, patch
   attachment, `user`, view-only `viewer` and non-member `outsider` accounts from
   `seed.json`), `login(page, who)`, `openReviewForm(page, diffUrl)`, `applyReview(page)`,
   `createReview(page, subject, diffUrl)`, `openReview(page, id)`, the
   `fileDiffUrl()` / `changesetDiffUrl()` / `attachmentUrl()` / `reviewShowUrl(id)`
   URL helpers, and, for settings and auto-assign scenarios, `commitFile()`,
   `fetchChangesets()` and `resetCodeReviewSettings()`. Settings scenarios run on the
   separate `e2e-settings` project and reset its settings first, so the main project's
   settings never change.
4. Use web-first assertions (`await expect(locator)...`); do not add fixed sleeps.
5. Tests share one database that is not reset between tests, so they must not depend
   on each other or on reviews left by other tests: create the data you need inside the
   test and assert on the ids it returns.

```js
const { test, expect } = require('../support/fixtures');
const { seed, login } = require('../support/helpers');

test('shows the review list', async ({ page }) => {
  await login(page);
  await page.goto(`/projects/${seed.project}/code_review/index`);
  await expect(page.locator('#code_review_list')).toBeVisible();
});
```

## Operation coverage and known failures

[`docs/e2e-operation-coverage.md`](../../docs/e2e-operation-coverage.md) lists the 39
user-facing operations (the permission-mapped actions of `init.rb` and the on-screen
operations) and the scenarios that verify each. Update it when you add a scenario or an
action.

If a scenario exposes a plugin bug that cannot be fixed locally, file a GitHub Issue and
mark the scenario `test.fail(true, '<Issue URL>: <reason>')`. Do not loosen the assertion
and do not use `skip`/`fixme`: `test.fail` makes the suite fail as soon as the bug is
fixed, which is the cue to remove the marker. The row in the coverage table then reads
`known failure` with the same Issue URL. A bug that a small local change fixes is fixed
test-first instead (a failing Minitest in `test/functional/`, then the change).

## Troubleshooting

- `port 4500 is already in use`: stop whatever listens on 4500 (a server from an
  interrupted run may still be running; try `lsof -i :4500`) and retry.
- `node_modules not found`: run `npm ci` in `test/e2e`.
- `Executable doesn't exist` from Playwright: run
  `npx playwright install --with-deps chromium`.
