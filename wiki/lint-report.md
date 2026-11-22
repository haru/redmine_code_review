# Wiki Lint Report — 2026-11-21

| # | Check | Severity | Page | Finding | Suggested fix |
|---|-------|----------|------|---------|---------------|
| 1 | coverage | — | — | No repo-backed source yet: `_change_attachement_view`, `index`, `_update_revisions`, `_reply`, `_history`, `_show_error`, `_add_success` partials, helpers, tests, and the usage of `code_review_user_settings`. The `path` / `diff_all` question is still open (see review-ui-activation.md). DeepWiki pages 3.2, 3.3, 4.1, 4.3, 5.x, 6.x and 7 are not ingested. | Follow-up ingests. |

No findings for index-drift, links, orphans, contradictions, stale or citations. All 22 pages are indexed, every link resolves, every page has at least 2 inbound links, no conflict markers remain, every cited S-id (S001-S030) is registered and listed in its page's frontmatter, and no page exceeds 600 words.
