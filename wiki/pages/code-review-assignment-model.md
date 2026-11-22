---
title: CodeReviewAssignment model
type: component
sources: [S010, S011, S017]
updated: 2026-11-21
---

# CodeReviewAssignment model

A review task: it links a created `Issue` to a changeset, change or attachment (S010).

## Shape
- `belongs_to` `issue`, `change`, `changeset`, `attachment`. Only `issue_id` is validated as present (S010).
- `is_closed?` is `issue.closed?`. `path` is `file_path`. `diff_all` is true when the path is blank. `revision` is `rev` or else the changeset revision. `repository` comes from the change's changeset, else the changeset, and `repository_identifier` from the repository's `identifier_param` (S010).

## `create_with_changeset(changeset)`
1. Loads the project's setting through `find_or_create` and its `auto_assign_settings` (S010).
2. Builds the issue:
   - **Subject:** the settings `subject`, falling back to the `code_review_requrest` translation (the key's spelling is as in the code) if blank. It then replaces `$REV` with the revision, and `$COMMENTS` with the first **61** characters of the changeset comments, unless the comments are blank (S010).
   - **Tracker and project:** `assignment_tracker_id` and the changeset's project (S010).
   - **Author:** `User.find(auto_assign.author_id)`. **Assignee:** `select_assign_to(project, changeset.user)` (S010).
   - **Description:** the settings `description` with `$REV` and `$COMMENTS` replaced (S010).
3. `issue.save!`, then saves the assignment with `issue_id` and `changeset_id` only. `change_id` is never set by this path (S010).

## Gotchas (S010)
- The method never checks `enabled?` or the filters. It creates an issue every time it is called, so those checks must be done by the caller. `Change#review_auto_assign` does them (S011; see [Auto-assignment system](./auto-assignment-system.md)).
- `User.find(nil)` raises `RecordNotFound` when no `author_id` is configured.
- The templates use `String#sub` with a string replacement, so backslash sequences in changeset comments (such as `\1` or `\\`) are interpreted and can alter the text.
- No transaction wraps the two saves inside this method. If saving the assignment fails after the issue was saved, the issue remains.

Manual assignments are created by the issue hooks instead, and fill `file_path` and `action_type` (S017; see [Manual assignment flow](./manual-assignment-flow.md)).

Related: [Auto-assignment filters](./auto-assignment-filters.md), [Review ↔ Issue delegation](./code-review-issue-delegation.md), which reads these assignments through `open_assignment_issues`.
