---
title: Review index page
type: component
sources: [S007, S008, S019, S020, S031]
updated: 2026-11-21
---

# Review index page

`index.html.erb` is the project's list of reviews, rendered by the controller's `index` action (S031, S008).

## Behavior (S031)
- A "show closed reviews" checkbox appears only when the project has at least one review (`@all_review_count > 0`). Toggling it calls `change_option`, which runs `$('#content').load(index_url, {show_closed: flag})`. A `.load` with an object is a POST, which the route allows (S019). The controller reads `params['show_closed'] == 'true'` and renders without the layout for XHR requests (S008).
- If the list is empty it shows the "no data" text. So a project with only closed reviews and the box unticked shows the checkbox together with "no data".
- Columns: `#` (links to the issue), status, subject, path, line, revision, committer, reviewer, date. Every column except line is sortable.
- The path cell decodes the path with `URI.decode_www_form_component`, shortens a path longer than 55 characters to its first 15 characters, `...` and its last 35, shows the full path as the link title, and links to `show` (S031). The decode has the `+` and bad-`%` problem described on [Manual assignment flow](./manual-assignment-flow.md) (S031).
- Committer is the changeset author, and reviewer is the issue author (S031, S007).

## Gotchas
- The shortened path is output with `raw`, so it is not HTML-escaped (S031).
- The date column sorts by `updated_at` but displays `created_at` (S031).
- The sort keys `path` and `user_id` are not columns of `code_reviews` any more (`file_path` replaced the first, and `user_id` was dropped) (S020, S008). They can only resolve to columns of the joined tables, and I did not check which, so the Path and Reviewer sorts may not sort what their headers say.
- The pagination total counts all reviews with an issue, including closed ones that are hidden, while the list is filtered. Pages can therefore come up short or empty (S008).
- Each row loads its issue and author separately; the controller joins the tables but does not include them (S031, S008).

Related: [Controller actions](./code-review-controller-actions.md), [Install and enable the plugin](./install-and-enable-plugin.md).
