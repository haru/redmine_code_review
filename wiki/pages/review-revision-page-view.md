---
title: Revision page integration
type: component
sources: [S022, S024, S028]
updated: 2026-11-23
---

# Revision page integration

`_change_revision_view.html.erb` is rendered on a repository `revision` page (S024). It does nothing unless `@changeset` is set (S028).

## Assignments block (S028)
For users with `assign_code_review`, it renders `#code_review_assignments`: a link (`#<issue id>`, with the issue's CSS classes and a status title) for each of the changeset's `code_review_assignments`, and an "Add" link to the `assign` action with `rev`, `changeset_id` and the repository id. `crInitRevisionView` moves the block right after `#changes-legend` (S022). Clicking "Add" starts the [manual assignment flow](./manual-assignment-flow.md).

## Review data for the file list (S028)
The partial emits a `<div data-cr-init="revision-view">` with no script (S028). It carries:
- `data-cr-urlprefix`: the revision's `.../<identifier>/entry` URL;
- `data-cr-reviews`: one JSON object keyed by `'/<path>'` (a leading `/` is added), whose value lists `{id, link, closed}` per review; `link` is an HTML link (`#<issue id> <subject>(<status>)` to the `show` action) (S028).

`crInitRevisionView` strips the prefix (and any query string) from each `li.change` link to recover the path, then appends a `<ul>` of `code_review_summary` items, with the closed or open review icon, under the entry (S022). Folders and entries without a link are skipped (S022). Every change gets a key, so changes with no reviews still get an empty `<ul>` (S022, S028). See [crLoad and data-cr-* attributes](./review-view-data-attributes.md) for the marker mechanism.

## Gotchas (S028)
- No eager loading: every review's `issue`, `subject` and `status`, and every assignment's `issue`, is loaded one at a time inside the loops.
- `link` is built server-side with `link_to` and inserted with `innerHTML` (S022, S028), so its escaping is Rails' `link_to`.

Related: [When and how the review UI loads](./review-ui-activation.md), [code_review.js internals](./review-javascript-internals.md).
