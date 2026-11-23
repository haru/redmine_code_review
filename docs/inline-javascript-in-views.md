# Inline JavaScript remaining in views

This document records every place where JavaScript (other than a plain function call
with its arguments) is still embedded in an ERB template, and why it was left there
when the review logic was extracted into `assets/javascripts/code_review.js`. The
extraction itself is tracked in
[ADR 0003](adr/0003-adopt-vitest-for-javascript-unit-tests.md).

## Why anything was left behind

The goal of the extraction was to move *logic* (function definitions, event
registration, DOM manipulation, conditionals) out of the templates, not to remove
every byte of script. Two kinds of script cannot leave the views:

1. **Data hand-off.** Only the view knows server-side values (review ids, revisions,
   rendered HTML fragments). It hands them to `code_review.js` either by assigning
   global variables or by passing them as function arguments. Rewriting this as JSON
   blobs or `data-` attributes would change markup and behavior for no benefit.
2. **Erb loops exporting collections.** `review_counts` and `code_reviews_map` are
   built by iterating server-side objects; the loop must stay in ERB.

A `<script>` block that only contains assignments and function calls is therefore
fine; the unit tests cover the called functions, and the Playwright E2E suite covers
the resulting UI behavior.

## Remaining script blocks

| Template | Content | Why it stays |
|---|---|---|
| `app/views/code_review/_update_revisions.html.erb` | An ERB loop that builds a `ReviewCount` object per changeset and fills the `review_counts` map, then calls `UpdateRepositoryView(title)` | ERB loop exporting data (kind 2) plus the call that renders it |
| `app/views/code_review/_add_success.html.erb` | Assignments of `line`, `review_id`, `file_count` and the calls `hideForm()` / `setShowReviewButton(...)` | Value hand-off after a review is created (kind 1) |
| `app/views/code_review/_change_revision_view.html.erb` | Assignment of `urlprefix` and an ERB loop that fills `code_reviews_map`, then calls `UpdateRevisionView()` | ERB loop exporting data (kind 2) |
| `app/views/code_review/_update_diff_view.html.erb` | Assignments of `repository_id`, `add_form_title`, `review_dialog_title`, `addReviewUrl`, `showReviewUrl`, `showReviewImageTag`, `showClosedReviewImageTag`, `is_readonly`, `is_diff`, `action_type`, `rev`, `rev_to`, `path`, and the calls `setAddReviewButton(...)`, `setShowReviewButton(...)` per review, `popupReview(...)`, `moveAssignLinkAboveFileContent()` | Value hand-off of diff state (kind 1); the DOM manipulation it used to contain is now `moveAssignLinkAboveFileContent()` |
| `app/views/code_review/_change_entry_norevision_view.html.erb` | Single call `make_addreview_link(project_name, link)` | Value hand-off of the rendered link HTML (kind 1) |
| `app/views/code_review/_body_bottom.html.erb` | Single call `loadOnReady('#code_review', url, params)` | Function call with values (kind 1) |
| `app/views/code_review/_change_repository_view.html.erb` | Single call `loadOnReady('#code_review_revisions', url, {changeset_ids: ...})` | Function call with values (kind 1) |
| `app/views/code_review/_change_attachement_view.html.erb` | Single call `loadOnReady('#code_review', url, params)` | Function call with values (kind 1) |
| `app/views/code_review/_new_form.html.erb` | Single call `bindReviewFormTrackerChange(url)` | Function call with values (kind 1) |

## Handlers registered by `code_review.js` itself

The delete link of a review (`#delete-review-link`, rendered by `_show.html.erb`) is
handled by delegated `ajax:success` / `ajax:error` handlers on `document`, registered
once when `code_review.js` loads. The partial is rendered on every review popup, so
registering from the view would stack one handler per render. Success reloads the page;
failure shows the HTTP status in an alert instead of reloading.

## Inline event handler attributes

One-line handlers in HTML attributes were left as-is: the spec targets `<script>` /
`javascript_tag` blocks, and each of them is either a plain call into
`code_review.js` or a trivial jQuery expression, not extractable logic.

- `code_review_settings/_show.html.erb` — `onchange="setAutoAssignSettingFormEnable();"`
- `code_review_settings/_filters.html.erb` — `onchange="setAutoAssignSettingFiltersEnable();"`,
  `onclick="cr_sort_filter(url, action, num)"` (sort links), `onclick="update_assign_filter(url, num)"`,
  `onclick="add_assign_filter(url)"`, plus the cancel/delete/edit one-liners that only
  `show()`/`hide()` table rows
- `code_review/index.html.erb` — `onchange="change_option(url, flag)"`
- `code_review/_new_form.html.erb` — `onclick="$('#review_parent_id').val(<id>)"` (parent issue
  suggestion), `onclick="$('#review-form').load(url, $('#review_form').serialize2json())"` (apply),
  `onclick="javascript:hideForm();"` (cancel)
- `code_review/_show.html.erb` — `onclick="$('#show_review_<id>').load(url, ...)"` (apply/reply),
  `onclick='$("#update-form-<id>").hide();'` (cancel)

`escape_javascript` (`j`) is applied to every URL and string value these handlers embed
from ERB (numeric ids such as `@review.id` are interpolated as they are).

## Known quirks preserved on purpose

Behavior was not supposed to change during the extraction, so two existing
flaws were kept and pinned by unit tests instead of being fixed silently:

- `make_addreview_link` checks `if (alist == null)` but `$('...')` returns a jQuery
  set, which is never `null`. When the entry tab is missing, the function therefore
  throws (`undefined.parentNode`) instead of returning early. The unit test pins
  this behavior.
- `clickPencil` uses `eval(result[2])` to parse the file number from the icon id.
  It works, but is unsafe in principle; replacing it with `parseInt` would be a
  behavior-preserving cleanup for a future change.

`_show_error.html.erb` (Prototype.js-only, rendered by nothing) and the dead
functions `deleteReview`, `changeImage`, `call_update_revisions`, `getReviewObjById`
were removed outright instead of documented here; nothing referenced them.
