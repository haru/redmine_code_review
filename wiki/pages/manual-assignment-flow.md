---
title: Manual assignment flow
type: component
sources: [S005, S008, S010, S017, S028, S030, S033]
updated: 2026-11-21
---

# Manual assignment flow

How a reviewer assigns a review task by hand, as opposed to [auto-assignment](./auto-assignment-triggers.md).

## Steps
1. The controller's `assign` action redirects to Redmine's new-issue form, pre-filled with a subject, the project's `assignment_tracker_id` and a `code` hash (`action_type`, `rev`, `rev_to`, `path`, `change_id`, `changeset_id`, `attachment_id`) (S008).
2. `CodeReviewIssueHooks#view_issues_form_details_bottom` reads `code` from the request and emits hidden `code[...]` form fields for each non-blank value. The ids are converted with `to_i` (S017).
3. After the issue is saved, `controller_issues_new_after_save` builds a `CodeReviewAssignment` from `code` (issue id, change, changeset, attachment, `file_path`, `rev`, `rev_to`, `action_type`) and calls `save!` (S017).

## Where the "Add" link comes from
Two places render it. On diff, entry and attachment pages, the `show_assignments` helper (the plugin's only view helper) builds an "Assignments:" label, one issue link per existing assignment (`#id`, CSS classes, title `issue(status)`), and an "Add" link to `assign` carrying `action_type`, `rev`, `rev_to`, `path`, `change_id`, `attachment_id` and `changeset_id` (S033). On the revision page the block is inline, and passes `rev`, `changeset_id` and `repository_id` instead (S028; see [Revision page integration](./review-revision-page-view.md)). The helper's link has no `repository_id`, so `find_repository` falls back to the project's main repository (S033, S008).

## Gotchas (S017)
- The hooks fire for **any** new issue whose request carries a `code` parameter. The hooks add no check of their own: not the `assign_code_review` permission, not whether the project has the `code_review` module, not the tracker. Redmine's normal permission checks for creating an issue still apply, but nothing ties `code` to the `assign` action.
- `save!` runs inside the issue-create hook, so a failed assignment save raises from that hook instead of being reported on the form.
- Unlike the auto path, `file_path` and `action_type` are filled here (see [CodeReviewAssignment model](./code-review-assignment-model.md)).

## Issue page
`CodeReviewIssueHooks` renders the `code_review/issues_show_details_bottom` partial on the issue view via `render_on :view_issues_show_details_bottom` (S017). The class also holds an older method, `view_issues_show_details_bottom_org`, which checks the `code_review#show` permission and builds the review or assignment rows with the private helpers `create_review_info` and `create_assignment_info`. Its name is not a Redmine hook name, so Redmine does not call it, and the helpers are used only by it within this file (S017).

### What the partial shows (S030)
The partial returns early unless the user is allowed `code_review#show`, which is `view_code_review` (S030, S005). It then adds up to two table rows to the issue's details:
- **Code review:** if the issue has a review, a link labelled `[repository:]path[@revision]:line N` (for an attachment review, `filename[@revision]:line N`) to the `show` action.
- **Assigned for review:** if the issue has an assignment, then, in order: a link to `show` with the `assignment_id` when the assignment has a `path`; else a "Revision" link to the changeset; else the attachment filename link.

Because `path` is `file_path`, which `create_with_changeset` never fills but the manual hook does, auto-assigned issues show the revision link and manually assigned ones show a path link (S030, S010, S017). The labels pass through `URI.decode_www_form_component`, which turns `+` into a space and raises `ArgumentError` on an invalid `%` sequence, and the paths are not encoded first (S030). The retired `_org` method in the hooks class builds the same two rows (S017, S030).

Related: [Controller actions](./code-review-controller-actions.md), [Plugin overview](./plugin-overview.md).
