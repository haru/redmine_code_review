---
title: Auto-assignment filters
type: component
sources: [S001, S004, S009, S011, S012, S013]
updated: 2026-11-21
---

# Auto-assignment filters

`AssignmentFilter` has `expression` (a regex string), `accept` (true = assign, false = drop) and `order` (lower is evaluated first) (S001).

## Evaluation
`match_with_change?` sorts the filters by `order`, and the **first match wins**, returning its `accept`. If nothing matches, `accept_for_default` applies (S001, S009). A missing `order` counts as 0 (S009). Example: drop `.*test\.rb$` at order 1, accept `.*\.rb$` at order 2 (S001).

`match_with_change?` never reads `filter_enabled`. The `Change` trigger calls it, so configured filters apply whatever that flag says, and with no filters `accept_for_default` decides (S009, S011). Only `match_with_changeset?` reads the flag, and it returns `true` (accept everything) when filtering is off (S009). S001 says `accept_for_default` applies when the flag is off, which is wrong for both methods (S009).

> Gotcha: `match_with_changeset?` does `return if match_with_change?(change)`, a bare `return`, so with filtering enabled it returns nil (falsy) as soon as a change is accepted, and false otherwise. It can never return true in that mode (S009). The `Change` trigger does not call it (S011), but `Changeset#scan_comment_for_issue_ids` does, so the changeset trigger never assigns while filtering is on (S013; see [Auto-assignment triggers](./auto-assignment-triggers.md)).

## Matching
`match?(path)` returns false for a nil expression or path, and otherwise tests `Regexp.compile(expression)` (S001, S009). Nothing in this module rescues an invalid pattern, so `Regexp.compile` raises `RegexpError` when one is stored, and the check is only client-side in the UI (S009).

## UI
In the project settings form, filters are added, edited, deleted and reordered via AJAX (`cr_sort_filter`, `add_assign_filter`, `update_assign_filter`). Regex validity is checked client-side only, by `is_valid_expression` (S001).

## Reordering
The `sort` action in `CodeReviewSettingsController` sets `order` by `move_to`: `highest` = 0, `higher` = −15, `lower` = +15, `lowest` = 999999999 (S004, confirmed by S012). Unknown `move_to` values leave the order unchanged, and `higher` on order 0 gives -15 (S012). These actions only re-render the form; filters are saved by `update` (S012). See [Project settings](./project-settings.md).

Related: [CodeReviewAssignment model](./code-review-assignment-model.md), [Auto-assignment system](./auto-assignment-system.md), [Plugin overview](./plugin-overview.md).
