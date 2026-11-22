---
title: When and how the review UI loads
type: component
sources: [S005, S008, S016, S022, S024, S025, S026, S032]
updated: 2026-11-21
---

# When and how the review UI loads

`_body_bottom.html.erb` is rendered at the end of every page by the application hook (S016). Its own logic decides whether anything happens (S024).

## Assets (`_html_header.html.erb`, S025)
In the page head, the partial outputs nothing unless `@project` is set and has the `code_review` module enabled. Then it includes `code_review.js`, the core `jstoolbar/jstoolbar` script and its language file `jstoolbar-<project language, lower-cased>.js`, the calendar headers, `code_review.css` and `jstoolbar.css` (S025). The `baseurl` variable it computes is not used (S025).

## Conditions in the body partial (all must hold, S024)
- A project and a controller are present, and the project has the `code_review` module enabled.
- The user is allowed `code_review#update_diff_view`.
- A `CodeReviewProjectSetting` row **exists** for the project and its `tracker_id` is not nil. The partial reads it with `where(project_id).first`, so it never creates the row. Rows are created elsewhere by `find_or_create` (menu item, controllers) (S024, S005, S008).
- The controller is `RepositoriesController` or `AttachmentsController`.

## Dispatch (S024)
| Page | Partial rendered |
|---|---|
| `AttachmentsController#show` | `change_attachement_view` (the spelling is in the code; see [Attachment page integration](./review-attachment-page-view.md)) |
| repository `show` or `revisions` | `change_repository_view` |
| repository `revision` | `change_revision_view` (see [Revision page integration](./review-revision-page-view.md)) |
| `diff`, `entry` or `annotate`, with no `rev` or `rev == 'master'`, or an unknown revision | `change_entry_norevision_view` (see [Add-review link](./review-entry-add-review-link.md)) |
| `diff`, `entry` or `annotate`, with a known revision | inline script, see below |

Only the literal `master` is special-cased as "no revision". The locals passed to the partials include a key spelled `:requrest` (S024); I did not check whether the partials use it.

## Loading the diff UI (S024)
For `diff`, `entry` and `annotate` with a known revision, the partial emits an empty `<div id="code_review">` and a document-ready script. It runs `$('#code_review').load(url, {rev, path, review_id, action_type, rev_to})`, with `url` pointing at the `update_diff_view` action and the repository identifier. A `.load` with an object is a POST. The response is the [update_diff_view partial](./update-diff-view-partial.md) (S024, S008). `path` is sent as `.` when the request has none, and `action_type` is the Rails action name. The values come from request params and are written into JS string literals (S024).

## Repository list pages: `change_repository_view` (S026)
On repository `show` and `revisions` pages the partial does nothing unless `@changesets` is set. When it is, it joins the page's changeset revisions into a comma-separated string (with a trailing comma), emits `<div id="code_review_revisions">` and, on document ready, runs `.load` (a POST) on the `update_revisions_view` action with `changeset_ids` (S026). The controller splits the string on commas and skips blank ids, so the trailing comma is harmless (S008). The revisions are inserted into the script with `raw`, so they are not escaped (S026). The result is the `update_revisions` partial (S008).

Open question: with `path` sent as `.`, the empty-path `diff_all` branch of `clickPencil` (S022; see [code_review.js internals](./review-javascript-internals.md)) would not trigger on this route. The attachment route does reach it, because it leaves `path` empty ([Attachment page integration](./review-attachment-page-view.md), S032). Why a repository review would get `diff_all` is not settled.

Related: [Review frontend](./review-frontend-javascript.md), [Plugin overview](./plugin-overview.md).
