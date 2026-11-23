---
title: RuboCop adoption and offense cleanup
type: decision
sources: [S036, S037]
updated: 2026-11-22
---

# RuboCop adoption and offense cleanup

How the existing offenses were brought to zero before the CI job was enabled. Related: [Run RuboCop](./run-rubocop.md), [Pin RuboCop with a dedicated Gemfile and Renovate](./rubocop-pinned-gemfile-and-renovate.md).

## Measured baseline (S036)
With `--ignore-parent-exclusion`, 38 files had **1,623 offenses**, not the ~36 the spec assumed (the estimate came from runs where Redmine's parent config hid everything). Top cops: `Style/HashSyntax` 546, `Style/StringLiterals` 407, `Layout/SpaceInsideHashLiteralBraces` 300. 1,571 were autocorrectable; about 50 needed manual work (Metrics, `Lint/EmptyBlock`, `Lint/ReturnInVoidContext`, `Lint/SuppressedException`, `Lint/UnreachableCode`).

## Three-step approach, separate commits (S036, S037)
1. `-a` safe autocorrect, verify the test suite passes, commit.
2. Unsafe (`-A`) cops reviewed one cop at a time and applied only when behavior is unchanged: `FactoryBot/SyntaxMethods`, `Rails/StrongParametersExpect`, `Rails/ApplicationRecord`, `Rails/DynamicFindBy`, `Rails/Date`, `Rails/ActionControllerFlashBeforeRender`, `Lint/NonDeterministicRequireOrder`.
3. Manual fixes. `Lint/SuppressedException` is fixed by not swallowing errors (the project's no-fallback rule). Anything unresolvable gets a per-cop or per-file `Exclude` in `.rubocop.yml` with a reason comment.

Rejected: a `.rubocop_todo.yml` bulk deferral, because blanket disabling is forbidden (S036).

## Risk to watch
`lib/` monkey patches are also autocorrected; load order in `init.rb` and permissions must not change (S037).
