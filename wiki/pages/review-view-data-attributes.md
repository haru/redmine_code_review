---
title: crLoad and data-cr-* attributes
type: component
sources: [S043, S044]
updated: 2026-11-23
---

# crLoad and `data-cr-*` attributes

How the views talk to the plugin's scripts after [feature 007](./replace-jquery-with-plain-javascript.md). Partial templates carry no `<script>` blocks or inline handlers (S043).

## crLoad
`crLoad(target, url, options)` is the only way to load partial HTML (S043).
- The caller states the method. Initial loads (`loadOnReady`), `showReview`, applying the new-review form, adding or updating filters and `change_option` are POST; `addReview`, tracker-change redisplay, the review popup's Apply and filter reordering are GET (S043).
- It always sends `X-Requested-With: XMLHttpRequest`. On POST it sends `X-CSRF-Token` from `meta[name="csrf-token"]` and throws if the meta tag is missing (S043). The E2E notes say the test environment renders no CSRF tag; see [Run the E2E tests](./run-e2e-tests.md).
- Forms are serialized with `new URLSearchParams(new FormData(form))`. Names ending in `[]` are sent as a browser would send them (S043).
- On failure the target keeps its content and a `div.flash.error.cr-load-error` shows `status statusText` (or the network error) (S043).
- After inserting, it calls `crInitialize(target)` (S043).

## data-cr-init
An element with `data-cr-init="<name>"` and `data-cr-*` values is initialized by `crInitialize(root)`, on `DOMContentLoaded` for `document` and after each `crLoad`. The attribute is removed first, so no element is initialized twice. An unregistered name throws (S043). Lists such as review counts per revision are passed as Rails `to_json` in one data attribute (S043).

## data-cr-action
One `click` and one `change` listener on `document` find the closest `[data-cr-action]` and dispatch to the registered handler, so inserted elements need no re-binding (S043).

## Redmine helpers that remain
- `link_to_function` and `toggle_link` are replaced by `data-cr-action` links (`toggle` shows and focuses) (S043).
- `wikitoolbar_for` is kept: it is Redmine's component, and its script runs through `createContextualFragment`. It is the one documented exception in `docs/inline-javascript-in-views.md` (S043).
- `:remote => true` and `data-confirm` stay with rails-ujs, whose `ajax:success`/`ajax:error` are native `CustomEvent`s, so listeners use `document.addEventListener` (S043).

## Arrow keys
A native `keydown` listener on `#content` calls `stopPropagation()` for ← / → inside `.cr-dialog` inputs, so Redmine's document-level handler does not fire; `preventDefault()` is not called, so the caret still moves (S043). See [Review dialog](./review-dialog-component.md).

## Errors
Unknown init/action names, missing required attributes, invalid JSON and a missing `#tab-entry` throw (S044).
