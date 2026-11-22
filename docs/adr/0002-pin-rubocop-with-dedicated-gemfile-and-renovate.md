# 0002. Pin RuboCop with a dedicated Gemfile and update it with Renovate

- Status: Accepted
- Date: 2026-11-22

## Context

CI needs a RuboCop check that gives the same result locally and in CI, does not
depend on a Redmine checkout or a database, and does not turn red because a new
RuboCop release appeared. The root `Gemfile`/`Gemfile.lock` are git-ignored (the
devcontainer and CI copy `Gemfile_for_test` over them), so they cannot hold pins.
Running a bare `rubocop` inside a Redmine checkout inspects 0 files, because
Redmine's own `.rubocop.yml` excludes `plugins/` from the parent directory.

## Decision

- `tools/rubocop/Gemfile` and `Gemfile.lock` (tracked) pin `rubocop` and the
  `rubocop-rails`, `rubocop-performance` and `rubocop-factory_bot` extensions.
- `build-scripts/rubocop.sh` is the only entry point for CI and local runs. It
  selects that Gemfile, always passes `--ignore-parent-exclusion`, and fails when
  RuboCop finds 0 target files.
- `build.yml` gets an independent `rubocop` job (`ruby:4.0` container, no Redmine,
  no DB) that notifies Slack on failure like the `build` job.
- Renovate (`renovate.json`, base branch `develop`) opens the update PRs. Its bundler
  manager detects `tools/rubocop/Gemfile`, and the PR runs the `rubocop` job.
- The existing Dependabot configuration is kept. It only watches the root `/`, so it
  does not overlap with `tools/rubocop`.
- `TargetRubyVersion` is 3.1, the lowest supported Ruby, so autocorrect never emits
  newer syntax.

## Alternatives considered

- `gem install rubocop` in the workflow (as redmine_ai_helper does): unpinned, so the
  build can break without any code change, and CI and local runs can differ.
- Track the root `Gemfile`: couples the plugin to Redmine's dependencies and breaks
  the `Gemfile_for_test` copy workflow.
- Dependabot for `tools/rubocop`: the project chose Renovate for this.
- `.rubocop_todo.yml` to park existing offenses: hides violations; exceptions are
  recorded individually with a reason instead.

## Consequences

- The Renovate GitHub App must be enabled on the repository by an administrator.
- A RuboCop upgrade can add offenses; the Renovate PR then fails and shows them.
