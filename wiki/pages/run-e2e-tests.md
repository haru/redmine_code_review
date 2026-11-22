---
title: Run the E2E tests
type: howto
sources: [S034, S035]
updated: 2026-11-22
---

# Run the E2E tests

Planned usage and seed data of the Playwright suite (S035). Design background: [E2E isolated environment](./e2e-isolated-environment.md), [Why Playwright for E2E tests](./e2e-playwright-adoption.md).

## Run
- One command: `test/e2e/run.sh`; `npm test` in `test/e2e` maps to it (S035).
- Planned scope: a smoke test (login, My page), review creation from a diff screen, and the registered review appearing in the review list (S035). Budget: preparation, run and cleanup within 5 minutes (S035).
- Writes are limited to `tmp/e2e/`, `test/e2e/test-results/` and appends to `log/test.log`; core directories (`config/`, `db/`, `tmp/pids/`, `public/`) are not changed (S035).
- Failures raise explicitly: missing tools or a busy port stop the run (S034).

## Seed data (S034)
1. `REDMINE_LANG=en bin/rake redmine:load_default_data` loads trackers, statuses, roles and priorities.
2. `bin/rails runner` on `support/seed.rb` creates the user, project, membership, the Git repository (with its changesets) and a `CodeReviewProjectSetting`. The setting row is required: the review UI does not show without it (see [When and how the review UI loads](./review-ui-activation.md)).
3. Values such as the revision hash are written to `tmp/e2e/seed.json`, so tests open the diff directly instead of clicking through pages.
- A dedicated member user is used instead of an admin so permission checks are exercised; the language is fixed to `en` for stable selectors and texts (S034).
- Rejected: seeding through the UI (slow, brittle) and reusing the plugin's YAML fixtures (tied to unit-test IDs, not linked to a real Git repository) (S034).

## Driving the review UI (S035)
1. Open `/projects/e2e-project/repository/e2e/diff/src/hello.rb?rev=<sha>`.
2. Click the pencil icon `img[id^="add_revew_img_"]` (the "revew" spelling is in the plugin code; see [code_review.js internals](./review-javascript-internals.md)).
3. In the dialog form `#review_form`, fill `#review_subject` and click Apply.
4. Assert that a review icon appears on the diff line.
- Use Playwright's auto-waiting and web-first assertions only; no fixed sleeps, to avoid flakiness (S035).
- Each spec creates its own data, so results do not depend on test order (S035).
