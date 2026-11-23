---
title: Revision page integration
type: component
sources: [S022, S024, S028]
updated: 2026-11-21
---

# Revision page integration

`_change_revision_view.html.erb` is rendered on a repository `revision` page (S024). It does nothing unless `@changeset` is set (S028).

## Assignments block (S028)
For users with `assign_code_review`, it renders `#code_review_assignments`: a link (`#<issue id>`, with the issue's CSS classes and a status title) for each of the changeset's `code_review_assignments`, and an "Add" link to the `assign` action with `rev`, `changeset_id` and the repository id. A script moves the block right after `#changes-legend`. Clicking "Add" starts the [manual assignment flow](./manual-assignment-flow.md).

## Review data for the file list (S028)
A script sets `urlprefix` to the revision's `.../<identifier>/entry` URL, which `UpdateRevisionView` strips from each file link to recover the path (S022, S028). For every change in the changeset it:
- builds a `CodeReview` JS object per review, with an HTML link (`#<issue id> <subject>(<status>)` to the `show` action) as `url` and `is_closed` set for closed reviews;
- registers the list as `code_reviews_map['/<path>']`, adding a leading `/` and escaping single quotes.

It ends with `UpdateRevisionView()`, which appends each file's review list under its `li.change` (S022, S028). Changes with no reviews register an empty list, so an empty `<ul>` is appended for them (S022, S028).

## Gotchas (S028)
- No eager loading: every review's `issue`, `subject` and `status`, and every assignment's `issue`, is loaded one at a time inside the loops.
- The review links are put into single-quoted JS strings with `<%=url%>`, as in the other partials.

Related: [When and how the review UI loads](./review-ui-activation.md), [code_review.js internals](./review-javascript-internals.md).
