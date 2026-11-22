---
title: New-review form (_new_form partial)
type: component
sources: [S021, S022]
updated: 2026-11-21
---

# New-review form (`_new_form.html.erb`)

The dialog form for creating a review, loaded by `addReview()` (S021, S022; see [code_review.js internals](./review-javascript-internals.md)). The controller side is on [Review creation flow](./code-review-creation-flow.md).

- **Submission:** the form targets `code_review#new`, but its Apply button is a plain `type: 'button'` that runs `$('#review-form').load(submit_url, $('#review_form').serialize2json())`. A jQuery `.load` with an object as data issues a POST. `serialize2json` is defined in `code_review.js` (S022). Cancel calls `hideForm()`. Note that the form's own id is `review_form` while the load target container is `#review-form`.
- **Hidden fields** carry the review context to the controller: `change_id`, `line`, `action_type`, `rev`, `rev_to`, `path`, `file_count`, `attachment_id`, `repository_id`, `diff_all`.
- **Visible fields:** subject (required), parent issue id (with a "Yes" suggestion button when the controller found a `@parent_candidate`), priority, the issue's **required** custom fields only, the comment (with the wiki toolbar), and assignee. Category and target version selects appear only if the project has categories or assignable versions, and the version defaults to `@default_version_id`.
- **Tracker select:** shown only when the project setting `tracker_in_review_dialog` is on. Changing it reloads the form through a GET `new` with the serialized form, which re-renders it with that tracker.
- **Status:** a select of the statuses allowed to the current user for a new issue, otherwise the current status name as text. The view recomputes `@allowed_statuses` itself.
- **Errors:** `error_messages_for` is rendered for `review`, `issue` and `relation`, so a failed save shows its messages inside the form.

Related: [Review frontend](./review-frontend-javascript.md).
