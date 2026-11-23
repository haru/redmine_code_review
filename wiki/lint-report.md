# Wiki Lint Report — 2026-11-23

Pages: 38. Mechanical fixes applied: 0. INDEX.md matches `pages/`; no broken links, unknown S-ids, orphans or `> ⚠ conflict:` markers; no page over 600 words or older than 90 days. The seven stale pages and the over-length `plugin-overview.md` from the previous report were fixed by re-ingesting S022–S032 and S045–S047.

| # | Check | Severity | Page | Finding | Suggested fix |
|---|-------|----------|------|---------|---------------|
| 1 | stale | semantic | code-review-controller-actions.md | sources S026, S028, S031 were re-ingested (2026-11-23) after the page's `updated` (2026-11-21); the claims citing them (lines 22, 27, 29: `index` page link, `assign` linked from the revision assignments block, `update_revisions_view` called by `change_repository_view`) were checked and still hold | bump `updated` on the next ingest that touches this page; no content change needed |
| 2 | stale | semantic | manual-assignment-flow.md | source S028 was re-ingested (2026-11-23) after the page's `updated` (2026-11-21); the claim citing it (line 18: revision page block passes `rev`, `changeset_id`, `repository_id`) was checked and still holds | bump `updated` on the next ingest that touches this page; no content change needed |
