---
title: E2E isolated environment
type: decision
sources: [S034, S035]
updated: 2026-11-22
---

# E2E isolated environment

How the E2E tests get a Redmine that never touches the development database. This is the design as planned (S034, S035); the later implementation changed some details, see the note at the end. Why Playwright: [Why Playwright for E2E tests](./e2e-playwright-adoption.md).

## Rails environment (S034)
- Redmine runs with `RAILS_ENV=test`, `DB=sqlite3` and `DB_NAME=<redmine root>/tmp/e2e/db.sqlite3`. `config/database.yml` reads these, and its test environment appends `_test`, so the real file is `db.sqlite3_test`. The DB is built from `db:migrate` plus `redmine:plugins:migrate`; `SCHEMA` points into the workspace so the local `db/schema.rb` is not loaded or rewritten. No Redmine core file is changed. `config/database.yml` must honor `DB_NAME` (`build-scripts/database.yml` does for sqlite3 too).
- The test environment sends no real mail, runs jobs inline, serves assets dynamically and already has a `secret_key_base`.
- Rejected: development (writes `log/development.log`, reloads code, slower and less stable); production (needs precompiled assets in `public/assets`, changing core directories); a dedicated `e2e` environment (needs a new file under core `config/environments/`).
- Known side effect: appends to `log/test.log`, shared with the other tests; accepted because nothing is deleted from it (S034, S035).

## Server (S034)
- Started with `bin/rails server -e test -p 4500 -b 127.0.0.1 -P <root>/tmp/e2e/server.pid`.
- The default PID file `tmp/pids/server.pid` would clash with a running development server and could delete its PID file, so the PID file lives in the E2E workspace. Binding to 127.0.0.1 keeps it off the network.
- Rejected: starting Puma directly (departs from the normal Redmine startup).

## Orchestration (S034)
- One entry script, `test/e2e/run.sh`: check that port 4500 is free, register an EXIT `trap`, recreate `tmp/e2e/`, build the Git repo, create and migrate the DB, seed, then run `npx playwright test`.
- Playwright's `webServer` starts, waits for and stops the server, with `reuseExistingServer: false` so a busy port is refused.
- Cleanup is done by the shell `trap`, not by Playwright's globalTeardown, whose behavior on interruption is less certain. Preparation lives outside Playwright so migration failures are not mixed into test failures.
- Rejected: everything in globalSetup/globalTeardown (weaker cleanup guarantee, extra Node-to-Rails layer); a Rake task (must live where core's Rakefile loads it, double bookkeeping).

## Test repository (S034)
A normal (non-bare) repo in `tmp/e2e/repo` with two commits (`src/hello.rb` added, then changed), committed with `git -c user.name=… -c user.email=…` so no global config is needed. It is registered as `Repository::Git` with `url = <repo>/.git` and loaded by `fetch_changesets`. The second commit's diff is a diff of a known revision, which reaches the pencil-icon path (see [When and how the review UI loads](./review-ui-activation.md)).

## Failure artifacts (S034)
`outputDir: 'test-results'`, screenshot and trace only on failure, `reporter: 'list'`. Playwright empties `outputDir` at the start of a run, giving "failures only, overwritten next run" without custom code; it is outside `tmp/e2e/`, so cleanup does not remove it.

> Note: the implementation later diverged from this plan in details (for example, the workspace is kept after a failed run). Re-ingest `test/e2e/README.md` to refresh this page.
