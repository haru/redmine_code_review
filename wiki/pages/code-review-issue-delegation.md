---
title: Review ↔ Issue delegation
type: component
sources: [S001, S007, S008, S014, S020]
updated: 2026-11-21
---

# Review ↔ Issue delegation

`CodeReview` is a thin record that bridges version-control changes and a Redmine `Issue`; creating a review creates its issue (S001).

## Delegated attributes
`subject` → `issue.subject`, `comment` → `issue.description`, `status_id` → `issue.status_id`, `user_id` → `issue.author_id`, `parent_id` → `issue.parent_issue_id` (S001, S007). Validations require `project_id`, `user_id`, `updated_by_id`, `issue`, `subject`, `action_type` and `line` (S007). This reuses Redmine's workflow, permissions and notifications (S001).

The matching `code_reviews` columns no longer exist; see [Database schema](./database-schema.md) (S020).

## Lifecycle
Status is inherited from the issue: `is_closed?` returns `issue.closed?` (S007). `close()` and `reopen()` only assign the issue's status, to `IssueStatus.find(5)` and `IssueStatus.find(1)`, and do not save (S007).

> Gotcha: those hard-coded status ids 5 and 1 only mean "closed" and "new" in Redmine's default status data. A site with different statuses gets the wrong ones or a `RecordNotFound` (S007). `STATUS_OPEN` and `STATUS_CLOSED` are defined but unused (S007).

## Path resolution
`path()` returns `file_path` when present, else the attachment filename, else a path computed from the repository `url` and `root_url` (handles sub-path repositories) (S001). Results are cached in `@path` (S007).

> Gotcha: `path()` wraps its whole body in `rescue => ex` and returns `ex.to_s`, so a failure (for example a review with neither change nor attachment) yields an error message as the "path" instead of raising (S007).

## The Issue side of the link
The `Issue` patch adds `has_one :code_review` and `has_one :code_review_assignment`, both `dependent: :destroy` (S014). Deleting the issue therefore deletes its review or assignment. This is why the controller's `destroy` action removes the issue only (S008, S014). The module holding the patch's instance methods, `IssueInstanceMethodsCodeReview`, is empty (S014).

## Assignments
`open_assignment_issues()` finds related `CodeReviewAssignment` records, keeps open ones assigned to a user, and returns their issues. It gathers assignments from the review's `change`, `changeset` and `attachment` (S007).

The method has no side effects. The issue relations and watchers created for open assignments are made by the controller's `new` action (S008); see [Review creation flow](./code-review-creation-flow.md). S001 attributes that work to the model method, which is wrong (S007).

## Derived accessors (S007)
`changeset` comes from `change.changeset`, `repository` from the changeset, `revision` is `rev` or else the changeset revision, and `committer` is the changeset author.

## Unregistered callback-style methods
`before_create`, `before_save` and `validate` are defined as plain instance methods with no callback macro. `before_create` only assigns a local variable (S007).

Related: [Plugin overview](./plugin-overview.md), [Controller actions](./code-review-controller-actions.md), [Auto-assignment](./auto-assignment-system.md).
