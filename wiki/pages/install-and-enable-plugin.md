---
title: Install and enable the plugin
type: howto
sources: [S002, S005, S031, S043]
updated: 2026-11-23
---

# Install and enable the plugin

Steps as described by S002 (a DeepWiki snapshot; check against the repo's `README` / `init.rb` where they differ):

0. Requires Redmine >= 7.0.0 since feature 007; `requires_redmine` in `init.rb` was 6.0.0 before (S005, S043). S002 says 5.0.0+, which is outdated (see the conflict note in [Plugin overview](./plugin-overview.md)).
1. Clone into `plugins/` with the directory named `redmine_code_review` (S002).
2. Run `bundle exec rake redmine:plugins:migrate RAILS_ENV=production`, then restart Redmine (S002).
3. Per project, enable the **Code reviews** module under Project Settings → Modules (S002).
4. The project needs a configured, accessible repository. The Code Review tab shows only when the module is enabled **and** a repository exists, and it appears after the Repository tab (S002).
5. Under Project Settings → Code Review, pick the tracker used for review issues, optionally set up [auto-assignment](./auto-assignment-system.md), and set whether the tab is hidden (S002).
6. Grant roles the six permissions listed in [Plugin overview](./plugin-overview.md) (S002).

## Usage
- Reviews are created from repository diff and changeset views by clicking inline review icons, which creates the linked issue (S002).
- The review index is a sortable table: issue #, status, subject, path, line, revision, committer, reviewer, date (S002). Its behavior and gotchas are on [Review index page](./review-index-page.md) (S031).
- Wiki macro: `{{review(123)}}` links to review 123 (S002).

## Verify
Administration → Plugins shows "Redmine Code Review plugin" (version 1.2.2 per S005; S002 agrees). Also check that the tab appears, repository views show review icons, and permissions behave (S002).

Related: [Plugin overview](./plugin-overview.md), [Controller actions](./code-review-controller-actions.md).
