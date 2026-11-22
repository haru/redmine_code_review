# 0001. Adopt Playwright for end-to-end tests

- Status: Accepted
- Date: 2026-11-22

## Context

The plugin's UI (review annotation on diffs, review list) is driven by JavaScript
that the existing Minitest suite cannot exercise. We need browser-level tests that
run in the devcontainer with one command and never touch the development database.

## Decision

Add a self-contained Node sub-project under `test/e2e/` using `@playwright/test`
(pinned exact version, Chromium only, plain JavaScript).

- `test/e2e/run.sh` is the single entry point. It builds an isolated workspace in
  `<redmine>/tmp/e2e/` (sqlite3 DB, throwaway Git repository, seed data), lets
  Playwright's `webServer` start Redmine in the `test` environment on port 4500, and
  removes the workspace after a successful run (it is kept after a failure so the DB,
  repository and seed can be inspected).
- No Redmine core files and no Gems are changed. Neither `redmine:plugins:test`
  (`test/{unit,functional,integration,system}/**/*_test.rb`) nor `test_runner.rb`
  (`test/**/*test.rb`) picks up the `*.spec.js` files.

## Alternatives considered

- Redmine system tests (Capybara + Selenium): tied to the core test DB and fixtures,
  which conflicts with the "dedicated throwaway DB" requirement.
- TypeScript tests: extra configuration for little benefit with a small suite.

## Consequences

- Contributors need Node.js and a one-time `npm ci` plus
  `npx playwright install --with-deps chromium`.
- E2E runs append to `log/test.log`, which is shared with the Minitest suite.
- CI integration is out of scope for now.
