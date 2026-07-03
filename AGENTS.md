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

# alternative: SimpleCov-instrumented runner (from the plugin directory; auto-copies fixtures, chdir's, requires every *test.rb)
ruby plugins/redmine_code_review/test/test_runner.rb
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

## Project conventions

- Write all git commit messages and code comments in English.
- Follow Ruby/Rails conventions already used in the file you're editing (the codebase mixes older Redmine-plugin idioms with newer Rails style — match the surrounding code rather than introducing a new pattern).
- Keep designs KISS / DRY / YAGNI: the simplest thing that works, no duplicated logic, no speculative abstractions for hypothetical future needs.
- Practice TDD: write the failing test first, then the implementation.
- Maintain C0 (statement) test coverage of at least 90%. Check `coverage/` (SimpleCov) after running the suite before considering work done.
- No easy fallbacks: don't swallow or silently default around errors (rescuing broadly, `rescue nil`, silent empty-array/false returns). Let unexpected conditions raise and be handled explicitly; only validate at true system boundaries.

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
