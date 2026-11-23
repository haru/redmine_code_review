---
title: code_review.js internals
type: component
sources: [S021, S022, S026, S027, S028, S029, S032, S038, S042, S043]
updated: 2026-11-23
---

# code_review.js internals

What `assets/javascripts/code_review.js` really does (S022). The overview is on [Review frontend](./review-frontend-javascript.md), the form on [New-review form](./review-new-form-view.md); the page bootstrap is on [update_diff_view partial](./update-diff-view-partial.md).

## Adding a review
1. `setAddReviewButton(url, change_id, image_tag, is_readonly, is_diff, attachment_id)` finds `table.filecontent` tables and, in each row, takes the line number from the `data-txt` attribute of the line-number `th` (the second `th` on diff views, the first otherwise). Unless the page is read-only it puts the pencil image there, with the id `add_revew_img_<line>_<tableIndex>` (the spelling is in the code), and binds `clickPencil` (S022).
2. `clickPencil` parses `line` and `file_count` (the table index) from that id with a regex (feature 007 replaces the former `eval` with `Number.parseInt(..., 10)`) (S043), and builds a URL from `change_id`, `action_type`, `rev`, `rev_to`, `attachment_id`, `repository_id`, `path`, `line` and `file_count`. Only `path` and `repository_id` are URL-encoded; the other values are concatenated as they are (S022).
3. When `path` is empty (a diff across all files), it takes the file name from the table's `th.filename` and adds `diff_all=true`. That is where the model's `diff_all` comes from (S022). Attachment pages leave `path` empty, so they take this branch (S032; see [Attachment page integration](./review-attachment-page-view.md)).
4. It then calls `addReview(url)`, which GET-loads the URL into `#review-form` through `loadWithErrorDisplay` (see [loading and error display](./review-javascript-loading-errors.md)), and opens the form dialog (640 px wide). The POST is sent later by the form's Apply button (S022; form in S021). Since feature 007 the body is built with `new URLSearchParams(new FormData(form))`; `serialize2json` is deleted (S043).

## Showing a review
`setShowReviewButton` adds a review or closed-review icon next to the line and a hidden `#show_review_<id>` div. Clicking calls `showReview`, which does a load with `{review_id}` (a POST, since data is an object) into that div and opens it as a 640 px dialog (jQuery UI before feature 007, now [Review dialog](./review-dialog-component.md)) whose content is the [review popup partial](./review-popup-view.md) (S029). One dialog per review id is kept in `code_reviews_dialog_map` (S022).

## Listing pages
- `UpdateRepositoryView` appends a progress column from `review_counts['revision_<rev>']` with **no null check**; a row without an entry throws (S022).
- `UpdateRevisionView` appends a list of a file's reviews under each `li.change`, using `code_reviews_map[path]` and skipping files without an entry (S022). The map and `urlprefix` are filled by the revision-page partial; a file with an empty list still gets an empty `<ul>` (S022, S028; see [Revision page integration](./review-revision-page-view.md)).
- `$.fn.down` imitated Prototype's `down`; feature 007 deletes it along with all jQuery use (S022, S043).

## Loading and error display
All loads go through `loadWithErrorDisplay`, which shows HTTP failures in the target; details and the lint conventions are on [code_review.js loading and error display](./review-javascript-loading-errors.md) (S022).

## Dead code removed and what remains
- Feature 005 deletes `getReviewObjById` (with its call in `showReview`), `deleteReview`, `changeImage` and `call_update_revisions`: none had callers, and the last three depended on Prototype.js APIs (S038).
- Feature 007 fixes both former known defects: `make_addreview_link` now throws `Error('code_review: entry tab (#tab-entry) not found')` when the tab is missing, and `eval` is gone (S043). Before it, the null check never fired and `clickPencil` used `eval` (S022, S038). `make_addreview_link` is used by the [entry-page partial](./review-entry-add-review-link.md) (S027).
- Feature 005 also moved view logic into the file (`change_option`, `loadOnReady`, `bindReviewFormTrackerChange`, settings functions) (S038); see [Why Vitest](./vitest-javascript-unit-tests.md).

## After feature 007
The jQuery flow above is replaced: loading goes through `crLoad`, views hand over values with `data-cr-*`, and the script is split into four files (S043). See [Why plain JavaScript](./replace-jquery-with-plain-javascript.md) and [crLoad and data attributes](./review-view-data-attributes.md).
