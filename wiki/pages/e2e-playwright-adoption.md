---
title: Why Playwright for E2E tests
type: decision
sources: [S034, S035]
updated: 2026-11-22
---

# Why Playwright for E2E tests

The review UI is driven by JavaScript that the Minitest suite cannot exercise, so browser-level tests were added (S035). Runtime setup is in [E2E isolated environment](./e2e-isolated-environment.md); how to run and extend the tests is in [Run the E2E tests](./run-e2e-tests.md).

## Decision
- A self-contained Node sub-project under `test/e2e/` with its own `package.json` and `package-lock.json`; `@playwright/test` is a devDependency pinned to an exact version (S034).
- Tests are plain JavaScript (CommonJS), Chromium only, installed with `npx playwright install --with-deps chromium` (S034).
- `AGENTS.md` and the ADR record it: the new Node/Playwright toolchain was judged architecturally significant, so it is ADR 0001 (`docs/adr/0001-adopt-playwright-for-e2e-tests.md`) and listed in `docs/adr/README.md` (S034).
- Tooling is not installed silently: `run.sh` checks for `git`, `node` and `test/e2e/node_modules` and fails with a message, in line with the project's "no easy fallbacks" rule. A missing browser is left to Playwright's own error with install instructions (S034).
- CI integration is out of scope for now (S035).

## Why it fits
- Keeping everything in `test/e2e/` keeps Node files out of the plugin root (S034).
- The existing runners only pick up `*test.rb`, so `.js` specs and `seed.rb` are not collected (S034).

## Alternatives rejected
- **Redmine system tests (Capybara + Selenium):** the request was for Playwright, and system tests use the core test DB and fixtures, which conflicts with the "create a dedicated DB and delete it" requirement (S034).
- **TypeScript:** needs `tsconfig` and more setup; for a small suite the typing benefit is low, so KISS wins (S034).
- **HTML reporter:** not needed (YAGNI); the `list` reporter is used (S034).

## Consequences
- Contributors need Node.js plus a one-time `npm ci` and browser install (S034, S035).
- No gems are added and the plugin's production Ruby code is unchanged, so coverage is unaffected (S035).
