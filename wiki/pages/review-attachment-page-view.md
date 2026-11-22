---
title: Attachment page integration
type: component
sources: [S008, S022, S023, S024, S032]
updated: 2026-11-21
---

# Attachment page integration

`_change_attachement_view.html.erb` (the spelling is in the file name) is rendered by `_body_bottom` on `AttachmentsController#show` pages (S024, S032).

## Behavior (S032)
1. It reads the `id` param and does `Attachment.find(id)`, which raises `RecordNotFound` for an unknown id.
2. It returns an empty string unless the attachment is text or a diff, so other attachments (images, archives) get no review UI.
3. It emits `<div id="code_review">` containing a `<div id="review_comment"/>`. As in the other partials, HTML ignores the self-closing slash on a `div`.
4. On document ready it runs `$('#code_review').load(url, {attachment_id, review_id})`, a POST to the `update_attachment_view` action. `review_id` is passed through so a requested review pops up (S032, S008).

The response is the shared [update_diff_view partial](./update-diff-view-partial.md) (S008, S023).

## Why this matters for `diff_all`
`update_attachment_view` never sets `@path` (S008), so the shared partial writes `path = ''` into the page (S023). With an empty `path`, `clickPencil` takes the file name from the table's `th.filename` and sends `diff_all=true` (S022). So reviews on attachment pages reach that branch. I did not check that attachment pages have a `th.filename` cell.

Related: [When and how the review UI loads](./review-ui-activation.md), [code_review.js internals](./review-javascript-internals.md).
