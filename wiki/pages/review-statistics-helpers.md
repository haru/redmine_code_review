---
title: Review statistics helpers
type: reference
sources: [S011, S013]
updated: 2026-11-21
---

# Review statistics helpers

`Change` (S011) and `Changeset` (S013) get count and percentage helpers for reviews and assignments, used by the UI.

## `Change` (S011)
`review_count`, `open_review_count`, `closed_review_count`, `open_reviews`, `closed_reviews`, `assignment_count`, `open_assignment_count`, `open_assignments(user_id = nil)`, `closed_assignment_count`. Reviews count only records with an `issue_id`. Open or closed comes from `is_closed?`.

## `Changeset` (S013)
- Review and assignment counts are sums over `filechanges`. Assignment counts also include the changeset's own assignments. `closed_*_count` is total minus open.
- `closed_*_pourcent` is closed ÷ total as a percentage (0 when there are none). `completed_*_pourcent` adds the `done_ratio` of the open items' issues to 100 per closed one, and divides by the total.
- Most results are memoized in instance variables. `assignment_count` is the exception.

## Gotchas (S013)
- `review_issues` returns the value of `filechanges.each` (the filechanges collection) on its first call, not the review list. Later calls return the memoized list, and a changeset without changes gets nil.
- Method names use the spelling `pourcent`.

Related: [Auto-assignment triggers](./auto-assignment-triggers.md), [Plugin overview](./plugin-overview.md).
