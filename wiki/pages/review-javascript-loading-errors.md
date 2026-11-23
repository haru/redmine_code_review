---
title: code_review.js loading and error display
type: component
sources: [S022, S042, S045]
updated: 2026-11-23
---

# code_review.js loading and error display

Part of [code_review.js internals](./review-javascript-internals.md); overview on [Review frontend](./review-frontend-javascript.md).

## Loading and error display
Feature 007 removes `loadWithErrorDisplay`; every partial load goes through `crLoad` in `code_review_loader.js` (S045). When the request fails or the status is not OK, `crLoad` keeps the target's content and prepends a `div.flash.error.cr-load-error` showing `status statusText` or the network error message, replacing any earlier one, so a failure is visible (S045). If initializing the inserted markup throws, it shows the error the same way and rethrows (S045). rails-ujs `ajax:success` / `ajax:error` listeners on `document` handle `#delete-review-link`: success reloads the page; an error alerts the status, or "Network error" for status 0, so a failed delete does not look like a success (S022). See [crLoad and data-cr-* attributes](./review-view-data-attributes.md).

## Code style under lint
Every function carries JSDoc, nested variables use `let`/`const`, and top-level `var` globals such as `crDiff` remain because the test harness re-runs the script per test (S022). Rules and rationale: [Why ESLint](./eslint-javascript-static-analysis.md) (S022, S042).
