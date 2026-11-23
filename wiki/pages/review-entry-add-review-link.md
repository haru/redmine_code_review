---
title: Add-review link on entry pages
type: component
sources: [S008, S022, S024, S027, S043]
updated: 2026-11-23
---

# Add-review link on entry pages

`_change_entry_norevision_view.html.erb` is rendered on repository `diff`, `entry` and `annotate` pages when the request has no `rev`, the `rev` is `master`, or the revision is not found (S024). It never shows the diff UI itself. Its only job is to offer a link that jumps to a revision where reviewing is possible (S027).

## Behavior (S027)
1. It does nothing unless the request has a non-empty `path`.
2. It asks the repository for `latest_changesets(path, rev, Setting.repository_log_display_limit)` and takes the first. If there is none, it does nothing.
3. Otherwise it builds an "Add review" link (`icon icon-edit`) to the controller's `forward_to_revision` action with `path`, `rev` and the repository identifier, and calls `make_addreview_link(project.name, link)` from a script.

## The JS side
`make_addreview_link` finds `div.tabs ul li a#tab-entry` and appends the link HTML to that list. Its first parameter (the project name) is not used, its `alist == null` check could never be true for a jQuery result (S022); feature 007 replaces it with a `querySelector` null check that throws `Error('code_review: entry tab (#tab-entry) not found')` (S043). `forward_to_revision` redirects to the repository `entry` page for the latest revision of that path (S008).

Gotchas: the link is inserted into a single-quoted JS string with `<%=link%>` (S027). Pages with no `path` get no link, so the root-level diff page offers no way in (S027).

Related: [When and how the review UI loads](./review-ui-activation.md), [code_review.js internals](./review-javascript-internals.md), [Controller actions](./code-review-controller-actions.md).
