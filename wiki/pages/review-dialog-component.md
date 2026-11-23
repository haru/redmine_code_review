---
title: Review dialog (code_review_dialog.js)
type: component
sources: [S043, S044]
updated: 2026-11-23
---

# Review dialog (`code_review_dialog.js`)

The popup that shows the new-review form and review details. It replaces jQuery UI `dialog` ([why](./replace-jquery-with-plain-javascript.md)). Content comes from the [popup partial](./review-popup-view.md) and the [new-review form](./review-new-form-view.md) (S043).

## Behavior kept from jQuery UI (S043)
- Non-modal; several can be open at once.
- Title bar with a close button; Esc closes it.
- Drag by the title bar, kept inside the document.
- Resize from all eight edges and corners.
- Opens centered in the window and comes to the front when pressed.
- Dropped: the scale-in animation. Also, `window.scrollTo` jumps to the icon instead of animating.

## Structure (S043)
`div.cr-dialog[role=dialog][aria-labelledby]` holds `div.cr-dialog-titlebar` (`span.cr-dialog-title`, `button.cr-dialog-close`), `div.cr-dialog-content` (the existing `#review-form-frame` or `#show_review_<id>` is moved in) and eight `div.cr-dialog-handle[data-cr-dir]`. The contract is in `contracts/dialog.md` of the feature spec (S043).

## Implementation notes
- Moving and resizing use Pointer Events with `setPointerCapture`; one function turns a direction string such as `se` into per-edge changes (S043).
- Each `pointerdown` takes a z-index from a shared counter (S043).
- The dialog stays inside `#content` so the arrow-key guard in [crLoad and data attributes](./review-view-data-attributes.md) keeps working (S043).
- Styles use `cr-` classes in `assets/stylesheets/code_review.css`, not `.ui-dialog`, because Redmine may drop jQuery UI (S043).
- Tests: jsdom has no layout, so `getBoundingClientRect` is stubbed and `PointerEvent`s are fired; E2E gets `dialog.spec.js` for move, resize, front and Esc, and `arrow-keys.spec.js` uses `.cr-dialog .cr-dialog-close` (S043). The test files are split in two to respect ESLint limits (S044).
