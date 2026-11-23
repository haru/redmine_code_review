---
title: Auto-assignment system
type: component
sources: [S001, S006, S009, S010, S011, S012, S013]
updated: 2026-11-21
---

# Auto-assignment system

Creates review-task issues when changesets are committed (S001).

## Flow
Two hooks, `Change#review_auto_assign` and `Changeset#scan_comment_for_issue_ids`, decide whether to act. They check that auto-assignment is enabled and apply the [filters](./auto-assignment-filters.md) (S011, S013; see [Auto-assignment triggers](./auto-assignment-triggers.md)).

They then call `CodeReviewAssignment.create_with_changeset(changeset)`. The factory itself checks neither the enabled flag nor the filters. It always builds the issue (templates, tracker, author, assignee from `select_assign_to`), saves it, and then saves the assignment with `issue_id` and `changeset_id` (S010; see [CodeReviewAssignment model](./code-review-assignment-model.md)). S001 puts the enabled and filter checks inside the factory, which is wrong (S010).

The `Change` and `Changeset` patches also add `has_many` associations and count helpers (see [Review statistics helpers](./review-statistics-helpers.md)).

## Settings (`AutoAssignSettings`)
`enabled`, `author_id`, `assignable_list` (user ids), `subject`, `description`, `filter_enabled`, `accept_for_default`, `filters` (S001). Stored as a YAML blob in the `auto_assign` column, not as separate columns (S006, S012). `auto_assign_settings` is an accessor that `before_save` writes back into that column (S006). See [Project settings](./project-settings.md).

## Settings object behavior (S009)
`AutoAssignSettings` lives in the module `CodeReviewAutoAssignSettings` (included into `CodeReviewProjectSetting`) and wraps a symbol-keyed hash. A blank string loads as `{enabled: false}`. `enabled?`, `filter_enabled?` and `accept_for_default` accept `true` or the string `'true'`. `assignable_list` and `author_id` are coerced to integers. `subject` and `description` are converted with `Redmine::CodesetUtil.to_utf8_by_setting`. `to_s` is `YAML.dump` of the hash.

## Assignee selection
`select_assign_to(project, committer)` removes the committer from `assignable_list`, picks a random remaining user, and retries without that user if they are not a project member. It returns nil when the list is empty (S001, S009). The random pick uses `rand`, membership is checked against `project.users`, and the retry after a non-member omits the committer because they were already removed (S009).

## Templates
`$REV` is replaced by the revision. `$COMMENTS` is replaced by the changeset comments, truncated to the first 61 characters in the subject. Only the first occurrence is replaced, since `sub` is used (S001, S010).

## YAML loading gotcha
Settings load with `YAML.unsafe_load` on Ruby >= 3.0 and `YAML.load` otherwise (S001, S009). `YAML.unsafe_load` can instantiate arbitrary Ruby objects, so the stored `auto_assign` text must be trusted (S009).

## Model
`CodeReviewAssignment` belongs to `issue`, plus optional `change`, `changeset`, `attachment` (S001).

Related: [Filters](./auto-assignment-filters.md), [Plugin overview](./plugin-overview.md), [Review ↔ Issue delegation](./code-review-issue-delegation.md).
