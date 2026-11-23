---
title: Project settings and configuration layers
type: component
sources: [S004, S006, S012, S018]
updated: 2026-11-21
---

# Project settings and configuration layers

Configuration works at three levels (S004):
1. **Plugin**: `Redmine::Plugin.register` in `init.rb` defines the module, permissions, menu item, hooks and the wiki macro (S004).
2. **Project**: the `CodeReviewProjectSetting` record, edited by `CodeReviewSettingsController` (S004).
3. **User**: Redmine roles and permissions (S004).

## `CodeReviewProjectSetting` attributes (S004)
| Attribute | Purpose |
|---|---|
| `tracker_id` | default tracker for review issues |
| `assignment_tracker_id` | tracker for auto-assigned review tasks |
| `hide_code_review_tab` | hides the project menu item |
| `auto_relation` | integer: 0 none, 1 relates, 2 blocks (`AUTORELATION_TYPE_*`) (S006) |
| `tracker_in_review_dialog` | show tracker selection in the review dialog |
| `auto_assign` | the auto-assignment settings, stored as YAML text (S006, S012) |
| `auto_assign_settings` | not a column: an accessor wrapping `auto_assign` as an `AutoAssignSettings` object (S006) |

`auto_assign_settings` reads `AutoAssignSettings.load(auto_assign)`, and `before_save` writes it back into `auto_assign` with `to_s`. The enable flag is `enabled` inside the YAML, not a column (S006). S004 describes `auto_assign` as a boolean and `auto_assign_settings` as the YAML field; that is outdated, and S006 is authoritative. See [Auto-assignment system](./auto-assignment-system.md).

## Model behavior (S006)
- Validates presence of `project_id`, `tracker_id` and `assignment_tracker_id`.
- `find_or_create(project)` creates a row defaulting both trackers to the project's first tracker. If the project has **no trackers** it returns an unsaved, invalid record rather than raising.
- `issue_relation_type` maps `auto_relation` to `IssueRelation::TYPE_RELATES` or `TYPE_BLOCKS`, else nil, and `auto_relation?` is true when it is non-nil.
- Includes `Redmine::SafeAttributes` and the `CodeReviewAutoAssignSettings` module.

The settings row is obtained with `CodeReviewProjectSetting.find_or_create(project)` (S004).

## Controller (`CodeReviewSettingsController`)
Actions: `update`, `add_filter`, `edit_filter`, `sort` (S004, S012). It uses the `base` layout, `menu_item :code_review`, and runs `find_project`, `authorize`, `find_user` before every action (S012).

- **`update`** is the only action that persists. It permits `tracker_id`, `assignment_tracker_id`, `hide_code_review_tab`, `auto_relation`, `tracker_in_review_dialog` and `auto_assign`, converts the posted `auto_assign[filters]` hash into a list, assigns `params[:auto_assign].to_yaml` to `auto_assign_settings`, calls `save!`, and redirects to the project settings `code_review` tab (S012). The stored YAML is therefore the text of the raw posted form values, not the output of `AutoAssignSettings#to_s` (S012, with the `before_save` of S006).
- **`add_filter`, `edit_filter`, `sort`** only rebuild the filter list from the posted form state and render the `code_review_settings/filters` partial. Nothing is saved until `update`, so a user who edits filters and leaves the page loses the change (S012). `add_filter` also turns `filter_enabled` on in the rendered state (S012).
- Only `StaleObjectError` is rescued, in `update`. Any other failure from `save!` propagates (S012).
- No server-side check of filter regexes (S012; see [Auto-assignment filters](./auto-assignment-filters.md)).

## Safety
- All actions require permissions and project membership, and `update` uses strong parameters (`params.require(:setting).permit(...)`) (S004).
- `ActiveRecord::StaleObjectError` is rescued and shown as the `notice_locking_conflict` flash, so the settings use optimistic locking (S004).

## Settings tab
`CodeReviewProjectsHelperPatch` is prepended to `ProjectsHelper` and overrides `project_settings_tabs`. It calls `super`, then appends a tab named `code_review` (label `:code_review`, partial `code_review_settings/show`) when `User.current.allowed_to?` the `code_review_settings#show` action in the current project (S018). The `update` action redirects back to this tab (S012, S018). See [Permissions](./permissions.md).

## Menu visibility
The menu item shows only when `project.repository` is present and `hide_code_review_tab` is false (S004).

Related: [Plugin overview](./plugin-overview.md), [Install and enable the plugin](./install-and-enable-plugin.md).
