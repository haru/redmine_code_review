---
title: Auto-assignment triggers
type: component
sources: [S009, S011, S013]
updated: 2026-11-21
---

# Auto-assignment triggers

Two separate hooks can call `CodeReviewAssignment.create_with_changeset`. They behave differently (see [Auto-assignment system](./auto-assignment-system.md) for the factory and settings).

## 1. `Change#review_auto_assign` (S011)
`CodeReviewChangePatch` adds `after_save :review_auto_assign` to `Change`. On each saved change it returns early unless all of these hold:
1. No `CodeReviewAssignment` exists yet for the change's changeset.
2. The changeset has a repository, and the repository has a project.
3. `auto_assign.enabled?` is true.
4. `auto_assign.match_with_change?(self)` is true.

Only then does it create the assignment. So an assignment is made per **changeset**, at the first saved change that passes the filters (S011). This path does not read `filter_enabled`; see [Auto-assignment filters](./auto-assignment-filters.md) (S011).

## 2. `Changeset#scan_comment_for_issue_ids` (S013)
`ChangesetInstanceMethodsCodeReview` is **prepended** to `Changeset` and overrides `scan_comment_for_issue_ids`. It calls `super`, then:
- returns the `super` result unless the changeset has a repository project with the `code_review` module enabled, and `auto_assign.enabled?` is true (S013);
- `return unless auto_assign.match_with_changeset?(self)` — a bare `return`, which gives nil instead of the `super` result (S013);
- otherwise calls `create_with_changeset(self)` and returns the `super` result (S013).

This path does **not** check for an existing assignment for the changeset, unlike path 1 (S013, S011). I did not verify the order in which Redmine runs the two hooks.

### Consequences (S013 with S009)
- With `filter_enabled` off, `match_with_changeset?` is true, so path 2 always assigns.
- With `filter_enabled` on, `match_with_changeset?` never returns true (see [Auto-assignment filters](./auto-assignment-filters.md)), so path 2 never assigns, and the method returns nil to Redmine in place of the issue-id list.

## Other
The `Changeset` patch adds `has_many :code_review_assignments, dependent: :destroy` (S013). Statistics helpers are on [Review statistics helpers](./review-statistics-helpers.md).
