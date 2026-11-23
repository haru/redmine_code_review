# AGENTS.md

This file provides guidance to coding agents (Claude Code, and other AGENTS.md-compatible tools) when working with code in this repository.

## What this is

A Redmine plugin (`redmine_code_review`) that adds in-browser code review to the repository browser: reviewers annotate diffs/changesets/attachments, and each review is backed by a Redmine `Issue`. Requires Redmine >= 6.0 (see `init.rb`, which pins `requires_redmine`).

This directory (`plugins/redmine_code_review`) only works when mounted inside a full Redmine checkout at `plugins/redmine_code_review` — tests and rake tasks rely on that relative position (e.g. `test/test_runner.rb` requires `../../../test/test_helper`, i.e. the host Redmine's test helper).

## Commands

All commands below are run from the Redmine root (`/usr/local/redmine`), not from the plugin directory, unless noted.

```bash
# install/update gems (Gemfile_for_test adds simplecov-cobertura, factory_bot_rails, shoulda)
bundle install

# run plugin migrations (dev and test envs)
bundle exec rake redmine:plugins:migrate
bundle exec rake redmine:plugins:migrate RAILS_ENV=test

# run the full plugin test suite
bundle exec rake redmine:plugins:test NAME=redmine_code_review

# run a single test file
bundle exec rake redmine:plugins:test NAME=redmine_code_review TEST=plugins/redmine_code_review/test/unit/code_review_test.rb

# run the Playwright E2E tests in an isolated Redmine on port 4500 (first time: cd plugins/redmine_code_review/test/e2e && npm ci && npx playwright install --with-deps chromium)
plugins/redmine_code_review/test/e2e/run.sh                       # all specs; needs bash (not `sh`), works from any directory
plugins/redmine_code_review/test/e2e/run.sh tests/review.spec.js  # one spec (args go to `npx playwright test`)

# JavaScript unit tests (from the plugin directory; first time there: npm ci)
npm test                       # vitest run
npm run test:coverage          # vitest run --coverage; fails below 95% line coverage, writes coverage-js/
npm run lint                   # eslint --max-warnings 0 assets/javascripts test/javascript; CI runs the same
npm run lint:fix               # eslint --fix; applies only mechanical fixes (brace style, comment formatting)

# alternative: SimpleCov-instrumented runner (from the plugin directory; auto-copies fixtures, chdir's, requires every *test.rb)
ruby plugins/redmine_code_review/test/test_runner.rb
```

RuboCop runs through one script shared by CI and local runs. It works from any directory (needs bash) and uses the versions pinned in `tools/rubocop/Gemfile.lock` (Renovate updates them). Do not run a bare `rubocop`: inside Redmine it inspects 0 files.

```bash
plugins/redmine_code_review/build-scripts/rubocop.sh      # check; fails on any offense or 0 target files
plugins/redmine_code_review/build-scripts/rubocop.sh -a   # also apply safe autocorrections
```

The devcontainer (`.devcontainer/`) provisions MySQL and Postgres test databases and runs `post-create.sh`, which copies `Gemfile_for_test` over `Gemfile`, copies plugin fixtures into the host `test/fixtures`, and migrates both dev and test DBs for each adapter.

`build-scripts/` and `travis/` are CI-oriented helpers (clone a fresh Redmine, symlink/copy this plugin in, migrate, run tests with coverage) — not needed for local iteration inside this devcontainer, where Redmine is already checked out.

## Architecture

### Everything hangs off `Issue`, not a custom status model

`CodeReview` (`app/models/code_review.rb`) has no subject/status/author of its own — it `belongs_to :issue` and delegates almost every field to it (`subject`, `user`, `status_id`, `comment` all read/write through `issue`). `is_closed?` just calls `issue.closed?`. When touching review state, check the `issue` delegation first; there is no separate review status enum in active use (the `STATUS_OPEN`/`STATUS_CLOSED` constants are vestigial, real status comes from `IssueStatus`).

A `CodeReview` optionally links to a `Change` (repository diff line) *or* an `Attachment` (patch file review) — `path`, `revision`, `repository` all branch on which one is present.

### Redmine core is extended via monkey patches in `lib/`, loaded explicitly by `init.rb`

Patch load order in `init.rb` matters and is: `code_review_application_hooks` → `code_review_change_patch` → `code_review_changeset_patch` → `code_review_issue_patch` → `code_review_issue_hooks` → `code_review_projects_helper_patch` → `code_review_attachment_patch`.

- `code_review_change_patch.rb` — adds `has_many :code_reviews` / `:code_review_assignments` to `Change`, and hooks `after_save :review_auto_assign` to trigger auto-assignment on new changes.
- `code_review_changeset_patch.rb` — similar extensions on `Changeset`.
- `code_review_issue_patch.rb` / `code_review_issue_hooks.rb` — extend `Issue` and hook into issue views so review-linked issues render review UI.
- `code_review_projects_helper_patch.rb` — project listing integration.
- `code_review_attachment_patch.rb` — lets attachments be reviewed like diffs.
- `code_review_application_hooks.rb` — a `Redmine::Hook::ViewListener` injecting the plugin's JS/CSS into every page (`view_layouts_base_html_head`, `view_layouts_base_body_bottom`).

Because these are monkey patches on core Redmine classes, changes here can affect non-plugin Redmine behavior — check for overlap with other plugins patching the same classes (`Change`, `Changeset`, `Issue`, `Attachment`).

### Auto-assignment

`CodeReviewAssignment` + `lib/code_review_auto_assign_settings.rb` (`AutoAssignSettings` / `AssignmentFilter`) implement per-project rules for automatically assigning a reviewer to new changesets: `Change#review_auto_assign` (in `code_review_change_patch.rb`) fires on save, checks `CodeReviewProjectSetting#auto_assign_settings`, and if enabled and the changed paths match the configured `AssignmentFilter` regexes, calls `CodeReviewAssignment.create_with_changeset`. Settings are persisted as a YAML blob on the project setting (`AutoAssignSettings#to_s` / `.load`), not normalized columns — read `code_review_auto_assign_settings.rb` before changing the settings schema.

### Permissions and routes

`init.rb` registers the `:code_review` project module with six permissions (`view_code_review`, `add_code_review`, `edit_code_review`, `delete_code_review`, `assign_code_review`, `code_review_setting`), each mapped to specific controller actions. `config/routes.rb` wires `projects/:id/code_review/:action` and `projects/:id/code_review_settings/:action` directly to `code_review#*` / `code_review_settings#*` — new controller actions need a matching permission entry in `init.rb` to be reachable, not just a route.

### Migrations

`db/migrate/` mixes legacy numbered migrations (`0001_*.rb` … `0021_*.rb`) with newer Rails-timestamped ones (`20220312104356_*.rb`). New migrations should use the timestamped format.

### Tests

- `test/test_helper.rb` requires the host Redmine's `test/test_helper`, then defines FactoryBot factories (`code_review`, `code_review_assignment`, `changeset`, `change`, `attachment`, `repository`, `issue`, `code_review_project_setting`) used across unit/functional tests — check here before adding ad hoc fixtures.
- `test/exemplars/` + `test/code_review_object_daddy_helpers.rb` provide Object Daddy exemplars, an older fixture-generation style still used alongside FactoryBot.
- `test/fixtures/*.yml` get copied into the host Redmine's `test/fixtures/` (by `post-create.sh` or `test_runner.rb`) — they must not collide with core Redmine fixture IDs.

### JavaScript unit tests (`test/javascript/`, Vitest)

A Node project at the plugin root (its own `package.json`, separate from `test/e2e/`). Rationale: `docs/adr/0003-adopt-vitest-for-javascript-unit-tests.md`.

- `test/javascript/support/load_classic_script.js` loads `node_modules/jquery/dist/jquery.js`, then `node_modules/jquery-ui/dist/jquery-ui.js`, then `assets/javascripts/code_review.js` via `vm.runInThisContext` with a `filename`, so top-level declarations become globals exactly as in a browser and v8 coverage is attributed to the file. Paths resolve from `process.cwd()` (the plugin root), never via `import.meta.url` (Vite would rewrite it).
- `jquery@3.7.1` and `jquery-ui@1.13.3` are pinned exact (Redmine-bundled versions) and excluded from Renovate updates. The loader sets `$.fx.off = true`; tests spy on `$.fn.load` (`vi.spyOn($.fn, "load")`) instead of letting Ajax run, and re-load the scripts in `beforeEach` to reset global state.
- Coverage targets `assets/javascripts/**/*.js`, fails below 95% lines (`thresholds.lines`), and writes to `coverage-js/` (git-ignored, kept apart from SimpleCov's `coverage/`).
- Views keep only value hand-off and function calls in their `<script>` blocks — see `docs/inline-javascript-in-views.md` for what remains and why.

### JavaScript static analysis (`eslint.config.js`, ESLint 10)

Rationale: `docs/adr/0004-adopt-eslint-for-javascript-static-analysis.md`.

- `npm run lint` inspects exactly two blocks — `assets/javascripts/**/*.js` (classic scripts) and `test/javascript/**/*.js` (ESM tests) — and CI runs the same command in the independent `lint-javascript` job. Every rule is an error (the jsdoc preset is the all-error `flat/recommended-error`, plus `--max-warnings 0` so any `warn` fails).
- Top-level `var` in `code_review.js` is allowed on purpose (views assign those globals; the test harness re-runs the script per test); nested `var` is banned via `no-restricted-syntax` with `:not(Program) > VariableDeclaration[kind='var']`.
- Test-block globals for the plugin's names are auto-registered by parsing `assets/javascripts/code_review.js` with `espree` at config load (throws when nothing is found) — never hand-maintain a global list.
- Size/complexity limits (`max-lines`, `complexity`, ...) are ratchets measured from the current code: they may only be lowered; raising one requires a new ADR.
- `npm run lint:fix` applies only mechanical fixes; the jsdoc fixers that insert empty comment stubs are disabled (`enableFixer: false`), so write real JSDoc instead.

### E2E tests (`test/e2e/`, Playwright)

A separate Node sub-project; Minitest never picks up `*.spec.js`. Rationale: `docs/adr/0001-adopt-playwright-for-e2e-tests.md`; usage: `test/e2e/README.md`.

- `run.sh` is the only entry point and the single source of the workspace path, port and Rails env (`E2E_*`, `RAILS_ENV=test`, `DB`, `DB_NAME`). `playwright.config.js`, `support/helpers.js` and `support/seed.rb` read them, so `npx playwright test` run directly fails by design.
- It builds `<redmine>/tmp/e2e/` (throwaway git repo, sqlite DB `db.sqlite3_test`, seed data), lets Playwright's `webServer` boot Redmine on 4500, and deletes the workspace only after a successful run; after a failure it is kept for inspection.
- All specs share one DB that is never reset (`workers: 1`). Specs must create their own data and assert on the ids they get back (`createReview` returns `{ id }`), never on "any review icon".
- Gotchas in the plugin's UI that the helpers work around: the pencil id is spelled `add_revew_img_`; after `goto` wait for `networkidle` (the `update_diff_view` request redraws icons); after opening the dialog wait until `jQuery(':animated')` is empty, otherwise typed text is wiped and the server answers 200 with "Subject cannot be blank" (the form is re-rendered, so check the response body, not the status).
- Server-side exceptions go to `log/test.log` (shared with Minitest), not to Playwright's output.
- Specs import `test`/`expect` from `support/fixtures.js`, never from `@playwright/test`: an auto fixture fails any test whose page throws an uncaught JavaScript exception.
- The 39 covered operations and the scenario for each are tracked in `docs/e2e-operation-coverage.md`; update it with every new scenario or `init.rb` action. Settings/auto-assign scenarios run on the separate `e2e-settings` project and reset its settings first.

## Project conventions

- Write all git commit messages and code comments in English.
- Follow Ruby/Rails conventions already used in the file you're editing (the codebase mixes older Redmine-plugin idioms with newer Rails style — match the surrounding code rather than introducing a new pattern).
- Keep designs KISS / DRY / YAGNI: the simplest thing that works, no duplicated logic, no speculative abstractions for hypothetical future needs.
- Practice TDD: write the failing test first, then the implementation.
- `build-scripts/rubocop.sh` must report no offenses before work is considered done. Record unavoidable exceptions individually with a reason (inline `# rubocop:disable Cop -- reason` or a per-cop entry in `.rubocop.yml`); never add a `.rubocop_todo.yml` or blanket-disable a department.
- Maintain C0 (statement) test coverage of at least 95%. Check `coverage/` (SimpleCov) after running the suite before considering work done.
- No easy fallbacks: don't swallow or silently default around errors (rescuing broadly, `rescue nil`, silent empty-array/false returns). Let unexpected conditions raise and be handled explicitly; only validate at true system boundaries.

### Wiki and specs

- `wiki/` is an LLM-maintained knowledge base (spec-kit wiki extension): `wiki/INDEX.md` is the entry point, `wiki/pages/*.md` hold per-component pages (models, controller actions, permissions, auto-assignment, JS internals). Check it before re-deriving behavior from code. Update it only through the `speckit-wiki-*` skills (ingest/query/lint); rules are in `wiki/SCHEMA.md`.
- `specs/` is a separate nested repository (git-ignored here); documents under it must be written in Japanese (see `specs/AGENTS.md`).

### Docs and ADRs

- Reference material lives under `docs/` — check there for existing documentation before assuming behavior; filenames are the index, so look for a filename matching the topic. When adding a new doc, give it a clear, descriptive filename.
- Record architecturally significant decisions as ADRs under `docs/adr/` (one file per decision). The log is append-only: never edit or delete a past ADR's content — if a decision changes, add a new ADR that supersedes it and note that link in both files. Every ADR must be listed in `docs/adr/README.md`, which is the index. If it's unclear whether a decision is significant enough to warrant an ADR, ask the user rather than guessing.

### Branching (git-flow)

- `main` — production releases only.
- `develop` — integration branch; base and target for feature work.
- `feature/*` — new functionality, branched from and merged back into `develop`.
- `bugfix/*` — non-urgent fixes, branched from and merged back into `develop`.
- `release/*` — release stabilization, branched from `develop`, merged into both `main` and `develop`.
- `hotfix/*` — urgent production fixes, branched from `main`, merged into both `main` and `develop`.
