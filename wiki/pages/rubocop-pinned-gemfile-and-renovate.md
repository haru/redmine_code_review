---
title: Pin RuboCop with a dedicated Gemfile and Renovate
type: decision
sources: [S036, S037]
updated: 2026-11-22
---

# Pin RuboCop with a dedicated Gemfile and Renovate

How RuboCop runs in CI and why it is set up this way. Procedure: [Run RuboCop](./run-rubocop.md). Existing-offense cleanup: [RuboCop adoption and offense cleanup](./rubocop-adoption-cleanup.md).

## Decisions
- **CI job**: an independent `rubocop` job with no `needs`, added to the existing `build.yml` next to `build`. Sharing the file reuses triggers, `paths-ignore`, the `SLACK_WEBHOOK` env and Slack notification, and does not touch the test matrix time. A separate workflow file was rejected because `paths-ignore` and Slack settings would be maintained twice (S036).
- **Version pinning**: `tools/rubocop/Gemfile` + `tools/rubocop/Gemfile.lock` pin `rubocop`, `rubocop-rails`, `rubocop-performance` and `rubocop-factory_bot`. The root `Gemfile` cannot hold the pin because it is git-ignored (CI and `post-create.sh` copy `Gemfile_for_test` over it), and a dedicated Gemfile keeps Redmine/Rails dependency resolution out of it (S036, S037).
  - Rejected: `gem install rubocop -v X` in the workflow (duplicates local setup; Renovate does not detect gem versions in workflow files); tracking the root Gemfile (couples to Redmine core and breaks the `Gemfile_for_test` workflow) (S036).
- **Updates by Renovate**: a minimal root `renovate.json` (`config:recommended`, `baseBranchPatterns: ["develop"]`). Renovate's bundler manager finds a `Gemfile` at any depth by default. Its PRs run the normal `rubocop` job. Rejected: adding `directory: /tools/rubocop` to Dependabot, since the spec chose Renovate (S036).
- Dependabot (bundler `/`, github-actions) stays; `tools/rubocop` is outside its scope, so no duplicate PRs (S037).
- `AllCops: TargetRubyVersion: 3.1` in `.rubocop.yml`, the lowest supported Ruby, so autocorrect never emits syntax that breaks the Ruby 3.1 test job and results do not depend on the CI Ruby (4.0) (S036).
- CI runs in a `ruby:4.0` container; no Redmine or DB service is needed. `ruby/setup-ruby` with `bundler-cache` is the fallback only if the 5-minute target is missed (S036).
- The decision is recorded as ADR 0002 (`docs/adr/0002-pin-rubocop-with-dedicated-gemfile-and-renovate.md`) (S037).

## Gotcha: admin step
Renovate only works once the Renovate GitHub App is enabled on the repository; this is not doable from code (S036, S037).
