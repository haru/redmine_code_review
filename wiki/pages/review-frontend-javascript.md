---
title: Review frontend (JavaScript and partials)
type: component
sources: [S003, S016, S021, S022, S023, S024, S025]
updated: 2026-11-21
---

# Review frontend (JavaScript and partials)

`assets/javascripts/code_review.js` adds review UI to Redmine's repository and attachment pages. The application hooks render the `code_review/html_header` (head) and `code_review/body_bottom` (end of body) partials on every page (S016), but the header partial includes `code_review.js` and `code_review.css` only when `@project` is set and has the `code_review` module enabled (S025). Pages without a project, or in projects without the module, do not load the script. See [Plugin overview](./plugin-overview.md) and [When and how the review UI loads](./review-ui-activation.md).

## What it does
- Diff views get pencil icons for adding a review on a line. Repository views show review status indicators, and attachment views allow reviews on uploaded files (S003).
- State is held in `review_counts[]`, `code_reviews_map[]` and `code_reviews_dialog_map[]`, with dialogs for the review form and the review popup (S003).

## JS function → controller action (S021, S022)
| Trigger | Action | Purpose |
|---|---|---|
| `addReview(url)`, called by `clickPencil()` | `new` (GET, through `.load`) | load the review form |
| the form's Apply button | `new` (POST, through `.load` with the serialized form) | submit a new review |
| `showReview()` | `show` (POST, through `.load` with `{review_id}`) | display the review popup |

There is no `updateDiff()` function. The diff UI is set up by the inline script of the [update_diff_view partial](./update-diff-view-partial.md) (S023), which `_body_bottom` loads through the `update_diff_view` action (S024; see [activation](./review-ui-activation.md)). S003 gives a different table, with `clickPencil()` as the POST and an `updateDiff()` function; the code shows otherwise (S022).

## Partials (S003)
- `_new_form.html.erb`: the creation form, loaded by `addReview()`.
- `_show.html.erb`: the review popup, loaded by `showReview()`.
- `_update_diff_view.html.erb`: sets up the buttons and handlers on diff pages.
- `_add_success.html.erb`: the post-create response, which closes the dialog and refreshes the view.

## The new-review form
The form's fields, hidden values and submission are described on [New-review form](./review-new-form-view.md) (S021).

Creation flow: click pencil → GET `new` returns `_new_form` → POST `new` creates the review and its issue → `_add_success` (S003).

Related: [Controller actions](./code-review-controller-actions.md), [Review ↔ Issue delegation](./code-review-issue-delegation.md).
