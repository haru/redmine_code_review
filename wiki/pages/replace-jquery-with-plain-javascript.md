---
title: Why plain JavaScript instead of jQuery
type: decision
sources: [S043, S044]
updated: 2026-11-23
---

# Why plain JavaScript instead of jQuery

Feature 007 removes jQuery and jQuery UI from the plugin's browser code (`code_review.js` and the inline JavaScript at 31 places in the ERB views) and uses only browser APIs. Stimulus is not adopted.

## Decisions
- **Partial loading**: one `fetch`-based `crLoad(target, url, options)` replaces `$.fn.load`. It keeps the old HTTP method per call, always sends `X-Requested-With` (the controller's `request.xhr?` branches on it in `index` and `show`), sends the CSRF token on POST, and runs `<script>` tags in the response through `createContextualFragment`. See [crLoad and data attributes](./review-view-data-attributes.md) (S043).
- **Popup**: jQuery UI `dialog` is replaced by a hand-written one in `code_review_dialog.js`, with every behavior except the opening animation (S043). See [Review dialog](./review-dialog-component.md).
- **View hand-off**: `data-cr-init` and `data-cr-action` replace all inline scripts and handler attributes (S043).
- **Scripts stay classic scripts** (not ES modules), loaded in the order dialog → loader → `code_review.js` → `code_review_settings.js`. Redmine has no official way to register plugin modules in its importmap, and modules would force a rewrite of the test loader and ESLint blocks (S043).
- **Supported Redmine stays at 6.0 or later.** Stimulus would have forced dropping 6.x, which is why Stimulus was rejected; no decision to drop 6.x was ever made (an earlier record saying 7.0 or later was wrong and is corrected in spec FR-012 and research R8) (S043), so `init.rb`, CI, README, AGENTS and the constitution keep the 6.0 floor. Whether the jQuery-free code runs on 6.x is not yet verified (S043).
- **Behavior is preserved**: server responses and HTTP methods do not change, so the update and reply forms still send GET. That is weak for CSRF but out of scope (S043).

## Rejected alternatives
- Direct `XMLHttpRequest`: no advantage over `fetch`. Re-creating scripts after `innerHTML`: `createContextualFragment` does it in one line (S043).
- `<dialog>.show()`: no Esc close when non-modal, no move/resize/front, weak jsdom support. CSS `resize: both`: only the bottom-right corner. Reusing `.ui-dialog` classes: breaks when Redmine drops jQuery UI (S043).
- `MutationObserver` for inserted markup: every insertion already goes through `crLoad`. Per-element `addEventListener`: needs re-binding after each redraw and causes double binding (S043).
- Keeping jQuery as a test-only dependency: tests would stop reflecting production (S044).

## Why four JS files
ESLint's `max-lines` (351 per file) is a ratchet that can only go down ([Why ESLint](./eslint-javascript-static-analysis.md)). The dialog (about 150 lines) plus the loader plus a rewrite of all view logic would exceed it, so the code is split into dialog, loader, repository/diff screens and settings screens, which register themselves with `crRegisterInit` / `crRegisterAction`. Test files are split by feature for the same reason (S044).

## Knock-on changes
Constitution Principle VII (pinned jQuery, `$.fn.load` spy) had to be amended (MINOR), and a new ADR 0005 supersedes the jQuery parts of ADR 0003, with links in both files (S044). Test impact: [Why Vitest](./vitest-javascript-unit-tests.md). Redmine itself still loads jQuery, rails-ujs and jsToolBar; they are out of scope (S043).

Related: [Review frontend](./review-frontend-javascript.md), [code_review.js internals](./review-javascript-internals.md).
