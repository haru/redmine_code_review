---
title: update_diff_view partial
type: component
sources: [S003, S008, S023, S024, S033]
updated: 2026-11-21
---

# `_update_diff_view.html.erb`

The partial rendered by the controller's `update_diff_view` and `update_attachment_view` actions (S008, S023). It is both markup and the script that bootstraps the review UI on a diff, changeset or attachment page.

## Markup it provides (S023)
- `.code_review` (empty), and `#review-form-frame` containing `#review-form`, which the JS loads the new-review form into (see [code_review.js internals](./review-javascript-internals.md)).
- `#code-review-assign-form` and `#code-review-assign-link`. The link block is filled with the `show_assignments` helper only when the user has `assign_code_review`. The helper is `show_assignments` in `CodeReviewHelper` (S033; see [Manual assignment flow](./manual-assignment-flow.md)).
- The assign form is written as `<div ... />`. HTML ignores the self-closing slash on a `div`, so the link block ends up inside it.

## Inline script, in order (S023)
1. Sets the JS globals `repository_id`, `add_form_title`, `review_dialog_title`, `addReviewUrl`, `action_type`, `rev`, `rev_to` and `path`. These are written straight into JS string literals; only `path` gets manual single-quote escaping.
2. `is_readonly` is true unless `authorize_for('code_review', 'new')` passes, i.e. unless the user can add reviews. `is_diff` is true when the action type is `diff` or the attachment is a diff.
3. Calls `setAddReviewButton(addReviewUrl, change_id, edit.png tag, is_readonly, is_diff, attachment_id)`.
4. Sets `showReviewUrl` and the open and closed review image tags (from the plugin's `review.png` and `closed_review.png`).
5. For each loaded review calls `setShowReviewButton(line, id, is_closed?, file_count)`.
6. If a `review_id` was requested, calls `popupReview(id)`.
7. Moves the assign link just before the first `table.filecontent` (S023).

## What this means for S003's `updateDiff()`
The refresh of the diff UI that S003 attributes to a JS function `updateDiff()` is done by this partial's inline script when it is loaded. For `diff`, `entry` and `annotate` pages with a known revision it is loaded by a script in `_body_bottom` (S024; see [When and how the review UI loads](./review-ui-activation.md)). I did not check whether the other `change_*` partials load it too.

Related: [Review frontend](./review-frontend-javascript.md), [Controller actions](./code-review-controller-actions.md).
