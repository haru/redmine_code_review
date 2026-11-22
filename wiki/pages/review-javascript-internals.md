---
title: code_review.js internals
type: component
sources: [S021, S022, S026, S027, S028, S029, S032]
updated: 2026-11-21
---

# code_review.js internals

What `assets/javascripts/code_review.js` really does (S022). The overview is on [Review frontend](./review-frontend-javascript.md), the form on [New-review form](./review-new-form-view.md); the page bootstrap is on [update_diff_view partial](./update-diff-view-partial.md).

## Adding a review
1. `setAddReviewButton(url, change_id, image_tag, is_readonly, is_diff, attachment_id)` finds `table.filecontent` tables and, in each row, takes the line number from the `data-txt` attribute of the line-number `th` (the second `th` on diff views, the first otherwise). Unless the page is read-only it puts the pencil image there, with the id `add_revew_img_<line>_<tableIndex>` (the spelling is in the code), and binds `clickPencil` (S022).
2. `clickPencil` parses `line` and `file_count` (the table index) from that id with a regex and `eval`, and builds a URL from `change_id`, `action_type`, `rev`, `rev_to`, `attachment_id`, `repository_id`, `path`, `line` and `file_count`. Only `path` and `repository_id` are URL-encoded; the other values are concatenated as they are (S022).
3. When `path` is empty (a diff across all files), it takes the file name from the table's `th.filename` and adds `diff_all=true`. That is where the model's `diff_all` comes from (S022). Attachment pages leave `path` empty, so they take this branch (S032; see [Attachment page integration](./review-attachment-page-view.md)).
4. It then calls `addReview(url)`, which does a GET `$('#review-form').load(url)`, and opens the form dialog (640 px wide). The POST is sent later by the form's Apply button, using `$.fn.serialize2json`, which this file defines (it turns the serialized form into an object, making arrays for repeated names) (S022; form in S021).

## Showing a review
`setShowReviewButton` adds a review or closed-review icon next to the line and a hidden `#show_review_<id>` div. Clicking calls `showReview`, which does `.load(url, {review_id})` (a POST, since data is an object) into that div and opens it as a 640 px jQuery UI dialog whose content is the [review popup partial](./review-popup-view.md) (S029). It keeps one dialog per review id in `code_reviews_dialog_map` and hides the old one first. `popupReview` scrolls to the icon, then shows it (S022).

## Listing pages
- `UpdateRepositoryView` appends a progress column to the changesets table using `review_counts['revision_<rev>']`. It has **no null check**, so a changeset row without an entry throws (S022).
- `UpdateRevisionView` appends a list of a file's reviews under each `li.change`, using `code_reviews_map[path]` and skipping files without an entry (S022). The map and `urlprefix` are filled by the revision-page partial; a file with an empty list still gets an empty `<ul>` (S022, S028; see [Revision page integration](./review-revision-page-view.md)).
- `$.fn.down` is defined here only if missing, to imitate Prototype's `down` (S022).

## Dead or broken code (S022)
- `getReviewObjById` loops with `for ... in` over `code_reviews_map`, which yields keys, so it never finds a review and always returns null. Its result is unused in `showReview`.
- `deleteReview` and `changeImage` use jQuery selectors missing the `#` (`$('review_<id>')`), and `changeImage` also uses Prototype's `new Element`. `call_update_revisions` uses Prototype's `$$` and `Ajax.Updater`. They do not work in a jQuery-only page. The repository list page now loads the same action with jQuery instead (S026), so `call_update_revisions` looks superseded; I did not check for callers of any of the three.
- `make_addreview_link` is jQuery code and is in use: the [entry-page partial](./review-entry-add-review-link.md) calls it (S027). Its first parameter is unused and its null check can never fire (S022).
