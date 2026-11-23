# Wiki Lint Report — 2026-11-23

Pages: 38. Mechanical fixes applied: 1 (frontmatter). INDEX.md already matches `pages/`; no broken links, unknown S-ids or orphans; no `> ⚠ conflict:` markers.

| # | Check | Severity | Page | Finding | Suggested fix |
|---|-------|----------|------|---------|---------------|
| 1 | links | mechanical | vitest-javascript-unit-tests.md | body cited S044 but frontmatter `sources` lacked it | **Fixed** (S044 added) |
| 2 | stale | semantic | update-diff-view-partial.md | describes the inline bootstrap script (`## Inline script, in order`), which feature 007 (S043) replaces with `data-cr-init` | re-ingest the 007 view contracts or the final `_update_diff_view.html.erb`, then rewrite the section |
| 3 | stale | semantic | run-javascript-unit-tests.md | line 21 "Spy on `$.fn.load`" contradicts S043 (tests stub `fetch`) | ingest the final test layout and update the how-to |
| 4 | stale | semantic | review-attachment-page-view.md | step 4 documents `$('#code_review').load(...)`; S043 moves it to `crLoad` / `loadOnReady`; S022 re-ingested after the page's update | re-ingest `_change_attachement_view.html.erb` |
| 5 | stale | semantic | review-ui-activation.md | describes a document-ready inline script for `diff`/`entry`/`annotate`; S022 re-ingested after the page's update | re-ingest `_body_bottom.html.erb` |
| 6 | stale | semantic | review-revision-page-view.md | S022 re-ingested after the page's update; inline data hand-off now `data-cr-*` | re-ingest `_change_revision_view.html.erb` |
| 7 | stale | semantic | review-index-page.md | `change_option` call described pre-007 (inline handler to `data-cr-action`) | re-ingest `index.html.erb` |
| 8 | citations | structural | plugin-overview.md | 612 words, over the 600-word cap | split (for example the version/conflict section into its own page) |

No page is older than 90 days.
