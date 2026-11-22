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
cd plugins/redmine_code_review/test/e2e && npm test              # same as run.sh
```

Arguments are passed through to `npx playwright test`. The exit code is Playwright's
(0 = all passed). A full run takes well under a minute.

## How isolation works

`run.sh`:

1. Checks `git`, `node`, `node_modules`, and that `127.0.0.1:4500` is free.
2. Recreates `<redmine>/tmp/e2e/` and builds a Git repository (two commits), a
   sqlite3 DB (`db.sqlite3_test`), default Redmine data and the seed data
   (`support/seed.rb`, which writes `tmp/e2e/seed.json`).
3. Runs `npx playwright test`; Playwright's `webServer` starts Redmine on port 4500
   with its PID file in `tmp/e2e/` and stops it afterwards.
4. Deletes `tmp/e2e/` on exit (success, failure or Ctrl+C).

The only places written to are `tmp/e2e/` (removed on exit), `test/e2e/test-results/`
(failure artifacts) and `log/test.log` (appended by Rails).

## When a test fails

Screenshots and `trace.zip` of failed tests are kept in `test/e2e/test-results/`
(overwritten on the next run). Open a trace with:

```bash
npx playwright show-trace test-results/<test-dir>/trace.zip
```

## Adding a test

1. Create `tests/<name>.spec.js`; it is picked up automatically.
2. Reuse `support/helpers.js`: `login(page)`, `loadSeed()` (project, repository,
   revision, path, user from `seed.json`) and `createReview(page, subject)`.
3. Use web-first assertions (`await expect(locator)...`); do not add fixed sleeps.
4. Tests must not depend on each other; create the data you need inside the test.

```js
const { test, expect } = require('@playwright/test');
const { loadSeed, login } = require('../support/helpers');

test('shows the review list', async ({ page }) => {
  const seed = loadSeed();
  await login(page);
  await page.goto(`/projects/${seed.project}/code_review/index`);
  await expect(page.locator('#content')).toBeVisible();
});
```

## Troubleshooting

- `port 4500 is already in use`: stop whatever listens on 4500 and retry.
- `node_modules not found`: run `npm ci` in `test/e2e`.
- `Executable doesn't exist` from Playwright: run
  `npx playwright install --with-deps chromium`.
