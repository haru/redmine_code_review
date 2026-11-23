---
title: code_review.js loading and error display
type: component
sources: [S022, S042]
updated: 2026-11-23
---

# code_review.js loading and error display

Part of [code_review.js internals](./review-javascript-internals.md); overview on [Review frontend](./review-frontend-javascript.md).

## Loading and error display
`loadWithErrorDisplay(target, url, params)` wraps `$.fn.load`: when the request fails it prepends a `div.flash.error.cr-load-error` showing the HTTP status, replacing any earlier one, so a failure is visible instead of leaving the target unchanged. `change_option`, `loadOnReady`, `bindReviewFormTrackerChange` and `addReview` all go through it. A delegated `ajax:success` handler on `#delete-review-link` reloads the page; `ajax:error` alerts the status, so a failed delete does not look like a success (S022).

## Code style under lint
Every function carries JSDoc, nested variables use `let`/`const`, and top-level `var` globals remain because the views assign them. Rules and rationale: [Why ESLint](./eslint-javascript-static-analysis.md) (S022, S042).
