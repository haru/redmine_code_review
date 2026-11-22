---
title: Database schema and migration history
type: reference
sources: [S006, S020]
updated: 2026-11-21
---

# Database schema and migration history

Derived from the 22 files in `db/migrate/` (S020): `0001`–`0021` use the old numbered style (all `Migration[4.2]`), and one timestamped migration, `20220312104356`, uses `Migration[5.2]` (S020). Every table below also has Rails' default `id`.

## `code_reviews` (final state)
`project_id`, `change_id`, `created_at`, `updated_at`, `line`, `updated_by_id`, `lock_version` (integer, default 0, not null), `status_changed_from`, `status_changed_to`, `issue_id`, `action_type` (string), `file_path`, `rev`, `rev_to`, `attachment_id`, `file_count` (default 0, not null), `diff_all` (boolean, no default), `repository_id` (**string**, added 2022) (S020).

There is no `user_id`, `comment`, `status` or `parent_id` column. They were created in `0001`, renamed to `old_*` in `0006`/`0007` when reviews were linked to issues, and removed in `0019`. No migration in the directory copies those values into the issues first (S020). This is the history behind the [delegation to Issue](./code-review-issue-delegation.md).

## `code_review_project_settings`
`project_id`, `tracker_id`, `created_at`, `updated_at`, `updated_by` (integer), `hide_code_review_tab` (boolean, default false), `auto_relation` (integer, **default 1**), `assignment_tracker_id`, `auto_assign` (text), `lock_version` (default 0, not null, used for optimistic locking), `tracker_in_review_dialog` (boolean, default false) (S020). With the constants in S006, the default `auto_relation` of 1 means "relates", so automatic relations are on for new rows (S006, S020). See [Project settings](./project-settings.md).

## `code_review_assignments`
`issue_id`, `change_id`, `attachment_id`, `file_path`, `rev`, `rev_to`, `action_type`, and `changeset_id` (added in `0016`) (S020). No timestamps, no `lock_version`, and no `repository_id` (S020).

## `code_review_user_settings`
Created in `0005` with `user_id` and `mail_notification` (default 0). No migration in the directory drops it (S020). Whether any code still uses it was not checked.

## Gotchas (S020)
- No migration adds an index, including on `issue_id`, `change_id`, `project_id` or `rev`, which the controller filters on ([Controller actions](./code-review-controller-actions.md)).
- `0010` backfills `action_type = 'diff'` by calling the current `CodeReview` model (`CodeReview.update_all`), so it depends on that class existing and loading at migration time.
- `0019`'s `down` re-adds the `old_*` columns empty, so the rollback cannot restore the data.
- New migrations should use the timestamped style, as `AGENTS.md` says; `20220312104356` is the only one so far (S020).
