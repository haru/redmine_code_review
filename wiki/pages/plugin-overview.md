---
title: Plugin overview
type: concept
sources: [S001, S002, S003, S004, S005, S006, S007, S011, S013, S014, S015, S016, S017, S019, S020, S024, S025, S034, S035, S036, S043]
updated: 2026-11-23
---

# Plugin overview

The plugin adds collaborative code review to Redmine projects. Reviews cover repository changesets and diffs, individual changes, and attachments, and every review is tracked as a Redmine issue with comment history, status and notifications (S001).

## How it integrates
- Registers a `code_review` project module with six permissions (action mapping in [Permissions](./permissions.md)): `view_code_review`, `add_code_review`, `edit_code_review`, `delete_code_review`, `assign_code_review`, `code_review_setting` (S001).
- Shows the project menu tab only when the project has a repository and the setting `hide_code_review_tab` is off (S001).
- `init.rb` loads the patches in the order `code_review_application_hooks`, `change_patch`, `changeset_patch`, `issue_patch`, `issue_hooks`, `projects_helper_patch`, `attachment_patch` (S005).
- `Changeset` is patched by prepending an override of `scan_comment_for_issue_ids` and adding `code_review_assignments` (S013); see [Auto-assignment triggers](./auto-assignment-triggers.md).
- `Issue` is patched only with `has_one :code_review` and `has_one :code_review_assignment` (`dependent: :destroy`) (S014); see [Review ↔ Issue delegation](./code-review-issue-delegation.md).
- `CodeReviewIssueHooks` adds the review rows to the issue view and creates manual assignments, see [Manual assignment flow](./manual-assignment-flow.md) (S017).
- `Attachment` is patched only with `has_many :code_reviews` and `has_many :code_review_assignments`, with no `dependent` option, unlike `Change`, `Changeset` and `Issue`, which use `dependent: :destroy` (S015, S011, S013, S014). Nothing in the patch removes the review or assignment rows when an attachment is deleted (S015).
- Extends core `Changeset`, `Change`, `Issue` and `Attachment` through model patches, and extends helpers through helper patches (S001).
- Injects JS/CSS via the `view_layouts_base_html_head` and `view_layouts_base_body_bottom` hooks (S001). `CodeReviewApplicationHooks` is a `Redmine::Hook::ViewListener` that renders the partials `code_review/html_header` and `code_review/body_bottom` there, with no conditions in the listener itself (S016). The conditions are in the partials: the header includes its assets only for projects with the module enabled (S025), and the body partial has further checks, see [When and how the review UI loads](./review-ui-activation.md) (S024). It is the first patch loaded by `init.rb` (S005).
- Routing is two wildcard `:action` routes under `projects/:id/`; see [Permissions](./permissions.md) (S019).
- Registers the `{{review(id)}}` wiki macro for linking reviews from wiki pages (S001).
- The browser UI loads review forms and icons by AJAX (`update_diff_view`, `update_attachment_view`) and the server answers with partials (S001).
- `CodeReviewAssignment` (`issue_id`, `change_id`, `changeset_id`, `file_path`) assigns review tasks to users (S003); UI details are in [Review frontend](./review-frontend-javascript.md).
- VCS-agnostic: uses Redmine's repository abstraction, so Git, Subversion, Mercurial etc. work (S001).

## Data model (S004, S006, S007, S020)
`CodeReview` has the columns `project_id`, `updated_by_id`, `issue_id`, optional `change_id` / `attachment_id`, `action_type`, `line`, `file_path`, `rev`, `rev_to`, `diff_all`, `file_count`, `lock_version`, `status_changed_from`, `status_changed_to` and `repository_id` (S020). It has no `user_id` column: `user_id` is delegated to `issue.author_id` (S007, S020). S001 lists `user_id` as a field, which is outdated. `CodeReviewProjectSetting` holds `tracker_id`, `assignment_tracker_id`, `hide_code_review_tab`, `auto_relation` (an integer relation type), `tracker_in_review_dialog` and `auto_assign` (the auto-assignment settings as YAML text) (S004, S006). Details on [Project settings](./project-settings.md). Column lists and migration history: [Database schema](./database-schema.md) (S020).

## Requirements
The plugin is version 1.2.2 and requires Redmine >= 6.0.0 (`requires_redmine :version_or_higher => "6.0.0"`) (S005); feature 007 keeps this floor (S043). The DeepWiki pages S001 and S002 say 5.0.0+; they are outdated on this point, and S005 is authoritative.

Full list of project settings: [Project settings](./project-settings.md). Setup steps: [Install and enable the plugin](./install-and-enable-plugin.md).

## Browser tests
The review UI is covered by Playwright E2E tests in `test/e2e/`, separate from the Minitest suite (S035). See [Why Playwright for E2E tests](./e2e-playwright-adoption.md), [E2E isolated environment](./e2e-isolated-environment.md) and [Run the E2E tests](./run-e2e-tests.md).

See [Review ↔ Issue delegation](./code-review-issue-delegation.md), [Controller actions](./code-review-controller-actions.md), [Auto-assignment](./auto-assignment-system.md).

## Static analysis
RuboCop runs in CI and locally through one script with pinned versions. See [Run RuboCop](./run-rubocop.md) and [Pin RuboCop with a dedicated Gemfile and Renovate](./rubocop-pinned-gemfile-and-renovate.md) (S036).
