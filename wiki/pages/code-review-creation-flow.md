---
title: Review creation flow
type: component
sources: [S001, S008, S021]
updated: 2026-11-21
---

# Review creation flow

How `CodeReviewController#new` works. Everything runs inside one `CodeReview.transaction` (S008).

## GET: build the form
- A new `CodeReview` gets a new `Issue`. The tracker is `params[:issue][:tracker_id]` if given, else the project setting's `tracker_id` (S008).
- Review fields come from params: `rev`, `rev_to`, `path` (as `file_path`), `attachment_id`, `repository_id`, `diff_all`, `action_type`. The review's `user_id` and `updated_by_id` are the current user (S008).
- When the review has a changeset with a `user_id`, the issue is pre-assigned to that user (S008).
- The default target version is taken from the first source that has one: the issue, then the changeset's issues, then the user's open assignment issues (S008).
- A parent candidate is looked up from the revision's changeset issues, taking the first issue with a parent (S008).
- The response is the `new_form` partial (S008).

## POST: save
1. `issue.save!` (S008).
2. If the project setting's `auto_relation?` is true, create a relation (type from `issue_relation_type`) from the review's issue to each issue linked to the changeset. For an attachment whose container is an `Issue`, relate to that issue (S008).
3. For every open assignment issue of the current user (`open_assignment_issues`), create a `TYPE_RELATES` relation unless it is the review issue's parent. Then add the assignment issue's author as a watcher of the review issue, once per author (S008).
4. `review.save!`, then render the `add_success` partial (S008).

`create_relation` silently returns without a relation when the target issue belongs to another project (S008).

## Error handling
`ActiveRecord::RecordInvalid` is logged and the form is re-rendered with status 200. The client never sees an HTTP error; the form template shows the failure through `error_messages_for` on `review`, `issue` and `relation` (S008, S021; see [Review frontend](./review-frontend-javascript.md)).

## Where S001's claim lands
The relations and watchers that S001 attributes to the model's `open_assignment_issues` are created here, in the controller, not in the model. See [Review ↔ Issue delegation](./code-review-issue-delegation.md) and [Controller actions](./code-review-controller-actions.md).
