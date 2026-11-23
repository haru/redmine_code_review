---
title: Review popup (_show partial)
type: component
sources: [S005, S007, S008, S029, S043]
updated: 2026-11-23
---

# Review popup (`_show.html.erb`)

The partial rendered by the controller's `show`, `reply` and `update` actions, and shown in a [dialog](./review-dialog-component.md) by `showReview` (S029, S008; see [code_review.js internals](./review-javascript-internals.md)).

## Layout (S029)
- A flash area: `error_messages_for` for `review` and `reply`, plus `@notice` and `@error` (set by the controller, for example the locking-conflict message) (S029, S008).
- A toolbar. **Update** (shown if `authorize_for('code_review', 'update')`) reveals a hidden edit form. **Delete** (if `destroy`) is a remote link with a confirm, and on `ajax:complete` it reloads the whole page. The reload script is emitted even when the Delete link is not (S029).
- A title linking to the issue (tracker, `#id`, status), the subject, an author avatar with created and updated times, and the comment rendered with `textilizable` (wiki markup) (S029).
- The issue's journals, sorted by id, as a history. A branch for ChiliProject (`respond_to?('render_journal')`) and one for Redmine use different partials. Only the Redmine branch is relevant here, since the plugin requires Redmine >= 6.0 (S029, S005).
- A reply form, shown if `authorize_for('code_review', 'reply')` (S029).

## Forms (S029)
- **Edit:** hidden `review[lock_version]`, `issue[lock_version]` and `review_id`; subject; a status select if the user has allowed statuses; comment. Apply loads `update_url` with the serialized form (`.load(...)` in the original; `crLoad` after feature 007, which keeps GET for update and reply) (S043). Cancel hides the form.
- **Reply:** the same hidden fields, an optional status select (`review[status_id]`), and `reply[comment]`. Apply loads `reply` the same way.
- The controller reads `params[:issue][:lock_version]` for optimistic locking, which is why both forms carry it. A stale value makes it set `@error` and re-render this partial (S008).

## Permission mapping
In `init.rb`, `update` belongs to `edit_code_review`, `destroy` to `delete_code_review`, and `reply` to `add_code_review` (S005). So reply needs the add permission, not a separate one. These checks only hide the buttons, and the controller enforces the same permissions (S008, S005).

## Consequences
A reply with a status selected changes the review's issue status, because `reply` assigns `status_id` through the review's delegation to the issue and then saves the issue (S008, S007, S029).
