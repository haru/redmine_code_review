# Source Registry

Append-only IDs (S001, S002…). Dedup key: normalized path or URL.
Sources are immutable inputs — the wiki never edits them.

| ID | Source | Type | First ingested | Last ingested | Pages touched |
|----|--------|------|----------------|---------------|---------------|
| S001 | https://deepwiki.com/haru/redmine_code_review (overview, 3.1, 3.4, 4.2 fetched via headless Chromium; DeepWiki index of 2025-09-23, commit 210e21) | url | 2026-11-21 | 2026-11-21 | plugin-overview.md, code-review-issue-delegation.md, code-review-controller-actions.md, auto-assignment-system.md, auto-assignment-filters.md |
| S002 | https://deepwiki.com/haru/redmine_code_review/2-getting-started (headless Chromium; DeepWiki index of 2025-09-23) | url | 2026-11-21 | 2026-11-21 | install-and-enable-plugin.md, plugin-overview.md |
| S003 | https://deepwiki.com/haru/redmine_code_review/3-core-components (headless Chromium; DeepWiki index of 2025-09-23) | url | 2026-11-21 | 2026-11-21 | review-frontend-javascript.md, code-review-controller-actions.md, plugin-overview.md |
| S004 | https://deepwiki.com/haru/redmine_code_review/4-configuration (headless Chromium; DeepWiki index of 2025-09-23) | url | 2026-11-21 | 2026-11-21 | project-settings.md, auto-assignment-filters.md, plugin-overview.md |
| S005 | init.rb | file | 2026-11-21 | 2026-11-21 | permissions.md, plugin-overview.md, install-and-enable-plugin.md, code-review-controller-actions.md |
| S006 | app/models/code_review_project_setting.rb | file | 2026-11-21 | 2026-11-21 | project-settings.md, auto-assignment-system.md, plugin-overview.md |
| S007 | app/models/code_review.rb | file | 2026-11-21 | 2026-11-21 | code-review-issue-delegation.md |
| S008 | app/controllers/code_review_controller.rb | file | 2026-11-21 | 2026-11-21 | code-review-creation-flow.md, code-review-controller-actions.md, code-review-issue-delegation.md |
| S009 | lib/code_review_auto_assign_settings.rb | file | 2026-11-21 | 2026-11-21 | auto-assignment-filters.md, auto-assignment-system.md |
| S010 | app/models/code_review_assignment.rb | file | 2026-11-21 | 2026-11-21 | code-review-assignment-model.md, auto-assignment-system.md, auto-assignment-filters.md |
| S011 | lib/code_review_change_patch.rb | file | 2026-11-21 | 2026-11-21 | auto-assignment-system.md, auto-assignment-filters.md, code-review-assignment-model.md, auto-assignment-triggers.md, review-statistics-helpers.md |
| S012 | app/controllers/code_review_settings_controller.rb | file | 2026-11-21 | 2026-11-21 | project-settings.md, auto-assignment-filters.md, permissions.md |
| S013 | lib/code_review_changeset_patch.rb | file | 2026-11-21 | 2026-11-21 | auto-assignment-triggers.md, review-statistics-helpers.md, auto-assignment-system.md, auto-assignment-filters.md, plugin-overview.md |
| S014 | lib/code_review_issue_patch.rb | file | 2026-11-21 | 2026-11-21 | code-review-issue-delegation.md, plugin-overview.md |
| S015 | lib/code_review_attachment_patch.rb | file | 2026-11-21 | 2026-11-21 | plugin-overview.md |
| S016 | lib/code_review_application_hooks.rb | file | 2026-11-21 | 2026-11-21 | plugin-overview.md, review-frontend-javascript.md |
| S017 | lib/code_review_issue_hooks.rb | file | 2026-11-21 | 2026-11-21 | manual-assignment-flow.md, code-review-controller-actions.md, code-review-assignment-model.md, plugin-overview.md |
| S018 | lib/code_review_projects_helper_patch.rb | file | 2026-11-21 | 2026-11-21 | permissions.md, project-settings.md |
| S019 | config/routes.rb | file | 2026-11-21 | 2026-11-21 | permissions.md, plugin-overview.md |
| S020 | db/migrate (22 migration files) | directory | 2026-11-21 | 2026-11-21 | database-schema.md, plugin-overview.md, code-review-issue-delegation.md |
| S021 | app/views/code_review/_new_form.html.erb | file | 2026-11-21 | 2026-11-21 | review-frontend-javascript.md, code-review-creation-flow.md, review-new-form-view.md |
| S022 | assets/javascripts/code_review.js | file | 2026-11-21 | 2026-11-21 | review-javascript-internals.md, review-frontend-javascript.md |
| S023 | app/views/code_review/_update_diff_view.html.erb | file | 2026-11-21 | 2026-11-21 | update-diff-view-partial.md, review-frontend-javascript.md, review-javascript-internals.md |
| S024 | app/views/code_review/_body_bottom.html.erb | file | 2026-11-21 | 2026-11-21 | review-ui-activation.md, update-diff-view-partial.md, review-frontend-javascript.md, plugin-overview.md |
| S025 | app/views/code_review/_html_header.html.erb | file | 2026-11-21 | 2026-11-21 | review-ui-activation.md, review-frontend-javascript.md, plugin-overview.md |
| S026 | app/views/code_review/_change_repository_view.html.erb | file | 2026-11-21 | 2026-11-21 | review-ui-activation.md, code-review-controller-actions.md |
| S027 | app/views/code_review/_change_entry_norevision_view.html.erb | file | 2026-11-21 | 2026-11-21 | review-entry-add-review-link.md, review-javascript-internals.md, review-ui-activation.md, code-review-controller-actions.md |
| S028 | app/views/code_review/_change_revision_view.html.erb | file | 2026-11-21 | 2026-11-21 | review-revision-page-view.md, review-ui-activation.md, review-javascript-internals.md, code-review-controller-actions.md |
| S029 | app/views/code_review/_show.html.erb | file | 2026-11-21 | 2026-11-21 | review-popup-view.md, review-javascript-internals.md, code-review-controller-actions.md |
| S030 | app/views/code_review/_issues_show_details_bottom.html.erb | file | 2026-11-21 | 2026-11-21 | manual-assignment-flow.md |
| S031 | app/views/code_review/index.html.erb | file | 2026-11-21 | 2026-11-21 | review-index-page.md, code-review-controller-actions.md, install-and-enable-plugin.md |
| S032 | app/views/code_review/_change_attachement_view.html.erb | file | 2026-11-21 | 2026-11-21 | review-attachment-page-view.md, review-ui-activation.md, review-javascript-internals.md |
| S033 | app/helpers/code_review_helper.rb | file | 2026-11-21 | 2026-11-21 | manual-assignment-flow.md, update-diff-view-partial.md |
