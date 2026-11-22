---
title: Permissions and menu registration
type: component
sources: [S005, S012, S018, S019]
updated: 2026-11-21
---

# Permissions and menu registration

Defined in `init.rb` inside the `code_review` project module (S005).

| Permission | Controller actions | Access |
|---|---|---|
| `view_code_review` | `code_review#update_diff_view`, `update_attachment_view`, `update_revisions_view`, `index`, `show` | `read: true` |
| `add_code_review` | `code_review#new`, `reply`, `forward_to_revision`, `preview` | members only |
| `edit_code_review` | `code_review#update` | members only |
| `delete_code_review` | `code_review#destroy` | members only |
| `assign_code_review` | `code_review#assign` | members only |
| `code_review_setting` | `code_review_settings#show`, `update`, `add_filter`, `edit_filter`, `sort` | members only |

Every row is from S005. A controller action that has no entry here is unreachable even when it has a route (see [Controller actions](./code-review-controller-actions.md)).

> Gotcha: `code_review_setting` lists `code_review_settings#show`, but `CodeReviewSettingsController` defines no `show` action, only `update`, `add_filter`, `edit_filter` and `sort` (S005, S012). The reason is the project settings tab: `ProjectsHelper#project_settings_tabs` adds a `code_review` tab whose action is `code_review_settings#show` and shows it only if the user is allowed that action, then renders the `code_review_settings/show` partial itself, so no `show` action is needed (S018). Holding `code_review_setting` is what makes the tab visible.

## Routes
`config/routes.rb` has exactly two wildcard routes (S019):
- `projects/:id/code_review/:action` to `code_review#*`, for **GET and POST only**.
- `projects/:id/code_review_settings/:action` to `code_review_settings#*`, for GET, POST, PUT and PATCH.

Because the action name is a URL segment, there is no per-action route list. Any public action on those controllers is routable, so the permission map above is the only thing deciding what a user can reach (S019, S005). The `code_review` routes accept no PUT, PATCH or DELETE, so `update` and `destroy` are reached with GET or POST (S019). A commented-out Rails 2 `map.connect` line is left in the file (S019).

## Menu item
The `:project_menu` entry points at `code_review#index` and is placed `:after => :repository`. It shows only when `project.repository` is present and the setting's `hide_code_review_tab` is false, and it calls `CodeReviewProjectSetting.find_or_create(project)` on each evaluation (S005). See [Project settings](./project-settings.md).

## Wiki macro
`{{review(id)}}` renders a link to the review's `show` action. It returns nil for a missing or zero id. The `return nil unless review` guard can never trigger, because `CodeReview.find` raises `RecordNotFound` for an unknown id (S005).

Related: [Plugin overview](./plugin-overview.md).
