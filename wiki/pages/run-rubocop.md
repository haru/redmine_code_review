---
title: Run RuboCop
type: howto
sources: [S036]
updated: 2026-11-22
---

# Run RuboCop

One entry point serves CI and local runs: `build-scripts/rubocop.sh`. Design background: [Pin RuboCop with a dedicated Gemfile and Renovate](./rubocop-pinned-gemfile-and-renovate.md).

## What the script does (S036)
1. Sets `BUNDLE_GEMFILE` to `tools/rubocop/Gemfile`, so the pinned lockfile is used and Redmine is not required.
2. Runs `bundle install`.
3. Counts files from `rubocop --list-target-files`; **0 targets is an error**, not success.
4. Runs `rubocop --ignore-parent-exclusion` with any arguments passed through (for example `-a`).

Failures name their cause (missing Bundler, 0 targets) instead of passing silently (S036).

## Gotchas
- **Never run bare `rubocop` inside a Redmine checkout.** Redmine's own `.rubocop.yml` `Exclude` applies from the parent directory and the run inspects 0 files. `--ignore-parent-exclusion` fixes this and is why the script exists (S036).
- `Style: Enabled: false` in `.rubocop.yml` does not turn Style off: later per-cop `Style/*` entries re-enable individual cops (S036).
- `db/**` is excluded; of 59 tracked Ruby files, 38 are inspected (S036).
- A Rake task was rejected as the entry point because it would need a Redmine checkout (S036).
