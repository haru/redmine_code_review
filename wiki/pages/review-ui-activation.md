---
title: When and how the review UI loads
type: component
sources: [S005, S008, S016, S022, S024, S025, S026, S032, S045]
updated: 2026-11-23
---

# When and how the review UI loads

`_body_bottom.html.erb` is rendered at the end of every page by the application hook (S016). Its own logic decides whether anything happens (S024).

## Assets (`_html_header.html.erb`, S025)
In the page head, the partial outputs nothing unless `@project` is set and has the `code_review` module enabled. Then it includes four scripts in this order: `code_review_dialog.js`, `code_review_loader.js`, `code_review.js`, `code_review_settings.js`; the later ones register their handlers with the loader (S025). It adds the core `jstoolbar/jstoolbar` script and its language file `jstoolbar-<project language, lower-cased>.js` only when the page has not loaded the wiki toolbar already and the Redmine version still ships `jstoolbar.js` (loading it twice is a SyntaxError), then the calendar headers, `code_review.css` and `jstoolbar.css` (S025). The `baseurl` variable it computes is not used (S025).

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
| `diff`, `entry` or `annotate`, with a known revision | a `load` marker, see below |

Only the literal `master` is special-cased as "no revision". The locals passed to the partials include a key spelled `:requrest` (S024); I did not check whether the partials use it.

## Loading the diff UI (S024)
For `diff`, `entry` and `annotate` with a known revision, the partial emits an empty `<div id="code_review" data-cr-init="load">` with no script (S024). `data-cr-url` points at the `update_diff_view` action with the repository identifier, and `data-cr-params` is JSON of `{rev, path, review_id, action_type, rev_to}` (S024). On `DOMContentLoaded`, `crInitLoad` POSTs those params with `crLoad` and inserts the response, the [update_diff_view partial](./update-diff-view-partial.md) (S022, S045, S008). `path` is sent as `.` when the request has none, and `action_type` is the Rails action name. The values come from request params and are escaped by `content_tag` as attribute values (S024). How markers and `crLoad` work: [crLoad and data-cr-* attributes](./review-view-data-attributes.md).

## Repository list pages: `change_repository_view` (S026)
On repository `show` and `revisions` pages the partial does nothing unless `@changesets` is set. When it is, it joins the page's changeset revisions into a comma-separated string (with a trailing comma) and emits `<div id="code_review_revisions" data-cr-init="load">` whose `data-cr-params` is `{changeset_ids}` and whose URL is the `update_revisions_view` action, so it is POSTed the same way (S026, S045). The controller splits the string on commas and skips blank ids, so the trailing comma is harmless (S008). The result is the `update_revisions` partial (S008).

Open question: with `path` sent as `.`, the empty-path `diff_all` branch of `clickPencil` (S022; see [code_review.js internals](./review-javascript-internals.md)) would not trigger on this route. The attachment route does reach it, because it leaves `path` empty ([Attachment page integration](./review-attachment-page-view.md), S032). Why a repository review would get `diff_all` is not settled.

Related: [Review frontend](./review-frontend-javascript.md), [Plugin overview](./plugin-overview.md).
