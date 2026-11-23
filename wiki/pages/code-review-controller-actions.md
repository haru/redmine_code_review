---
title: CodeReviewController actions
type: component
sources: [S001, S003, S005, S008, S017, S026, S027, S028, S029, S031]
updated: 2026-11-21
---

# CodeReviewController actions

Actions (S001):
- CRUD: `index`, `new`, `show`, `update`, `reply`, `destroy`.
- Repository views, rendered as partials and inserted via AJAX: `update_diff_view`, `update_attachment_view`, `update_revisions_view` (multi-revision).
- Utility: `assign`, `preview` (Markdown), `forward_to_revision`.

Before filters: `find_project`, `authorize`, `find_user`, `find_setting`, `find_repository`, `find_priorities` (S001).

Creating a review (`POST new`): build `CodeReview` and `Issue` from params, `issue.save!`, `review.save!`, then render the `add_success` partial. Write actions use transactions (S001).

Response types: `index` is HTML/XHR, `new`, `update_diff_view` and `reply` render partials, and `show` renders a partial or redirects. `reply` adds journal entries to the review's issue (S003). The JS callers are listed in [Review frontend](./review-frontend-javascript.md).

## Behavior of the other actions (S008)
- `index`: sorted and paginated, closed reviews hidden unless `show_closed=true`. It joins change, changeset, issue and status tables (S008). The page it renders is on [Review index page](./review-index-page.md) (S031).
- `show`: for XHR or `update` requests it renders the `show` partial. Otherwise it redirects to the repository diff or attachment page, adding `review_id` (S008).
- `reply` (see [Review popup](./review-popup-view.md) for its forms, S029): sets `lock_version` from params and adds a journal on the issue. `StaleObjectError` sets `@error` to the locking-conflict message and re-renders the partial (S008).
- `update`: saves the review and issue in a transaction and mails `Mailer.deliver_issue_edit` only if `issue_updated` is in `Setting.notified_events`. The locking handling is the same as `reply` (S008).
- `destroy`: destroys the review's **issue** and answers `delete success.` as plain text (S008).
- `assign` is linked from the revision page's assignments block (S028; see [Revision page integration](./review-revision-page-view.md)). It redirects to Redmine's new-issue form pre-filled with a subject (changeset tag and short comment, or attachment filename), the project's `assignment_tracker_id` and a `code` param hash (S008). The assignment record is created by hooks afterwards, see [Manual assignment flow](./manual-assignment-flow.md) (S017).
- `update_diff_view`: finds the changeset by revision, matches the change by path after adjusting for the repository sub-path, and loads the reviews for that path and revision (S008).
- `update_revisions_view`: called by `change_repository_view` on repository list pages with the page's revisions as `changeset_ids` (S026, S008; see [When and how the review UI loads](./review-ui-activation.md)).
- `forward_to_revision`: the target of the "Add review" link built by `change_entry_norevision_view` (S027, S008; see [Add-review link](./review-entry-add-review-link.md)).
- `find_repository`: uses `params[:repository_id]` when present, else the project's main repository (S008).

Creation details are on [Review creation flow](./code-review-creation-flow.md).

Every new action needs a permission entry in `init.rb` to be reachable (see `AGENTS.md`); the current mapping is on [Permissions](./permissions.md) (S005).

Related: [Review ↔ Issue delegation](./code-review-issue-delegation.md), [Plugin overview](./plugin-overview.md).
