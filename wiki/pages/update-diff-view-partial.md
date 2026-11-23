---
title: update_diff_view partial
type: component
sources: [S003, S008, S022, S023, S024, S033, S038]
updated: 2026-11-23
---

# `_update_diff_view.html.erb`

The partial rendered by the controller's `update_diff_view` and `update_attachment_view` actions (S008, S023). It is the markup plus a `diff-view` marker that bootstraps the review UI on a diff, changeset or attachment page; it contains no `<script>` (S023).

## Markup it provides (S023)
- `.code_review` (empty), and `#review-form-frame` containing `#review-form`, which the JS loads the new-review form into (see [code_review.js internals](./review-javascript-internals.md)).
- `#code-review-assign-form` and `#code-review-assign-link`. The link block is filled with the `show_assignments` helper only when the user has `assign_code_review`. The helper is `show_assignments` in `CodeReviewHelper` (S033; see [Manual assignment flow](./manual-assignment-flow.md)).
- The assign form is written as `<div ... />`. HTML ignores the self-closing slash on a `div`, so the link block ends up inside it.

## The `diff-view` marker (S023)
A `<div data-cr-init="diff-view">` carries every value as a `data-cr-*` attribute, built with `content_tag`, so Rails escapes them (S023):
- URLs of the `new` and `show` actions; the add (`edit.png`), open (`review.png`) and closed (`closed_review.png`) image tags; the form and dialog titles.
- `repository-id`, `action-type`, `rev`, `rev-to`, `path`, `change-id`, `attachment-id`.
- `readonly`: `"true"` unless `authorize_for('code_review', 'new')` passes, i.e. unless the user can add reviews. `diff`: `"true"` when the action type is `diff` or the attachment is a diff.
- `reviews`: one JSON array of `{id, line, file_count, closed}`; `popup-review-id` only when a review was requested.

`crInitDiffView` in `code_review.js` reads the marker and then, in order: puts the add-review pencils (`setAddReviewButton`), adds an icon per review (`setShowReviewButton`), opens the requested review (`popupReview`) and moves the assign link above the first `table.filecontent` (`moveAssignLinkAboveFileContent`) (S022). `readonly` and `diff` must be exactly `"true"` or `"false"`, and a missing attribute or invalid `reviews` JSON throws (S022). The pencil is built with DOM APIs, so the line number from `data-txt` is never parsed as HTML (S022). Details: [crLoad and data-cr-* attributes](./review-view-data-attributes.md), [code_review.js internals](./review-javascript-internals.md).

## What this means for S003's `updateDiff()`
The refresh of the diff UI that S003 attributes to a JS function `updateDiff()` is done by `crInitDiffView` when this partial is loaded (S022, S023). For `diff`, `entry` and `annotate` pages with a known revision it is loaded through a `load` marker in `_body_bottom` (S024; see [When and how the review UI loads](./review-ui-activation.md)); attachment pages load it the same way ([Attachment page integration](./review-attachment-page-view.md)).

Related: [Review frontend](./review-frontend-javascript.md), [Controller actions](./code-review-controller-actions.md).
