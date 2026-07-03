---
name: create-pr
description: Create (or update) a GitHub pull request for the current branch in this repo using the gh CLI, with a generated English title, a bulleted English summary of the actual diff, and an enhancement/bug label when one clearly applies. Use this whenever the user asks to open a PR, make a pull request, "PRを作って"/"PR作成して", or otherwise wants the current branch's work turned into a reviewable GitHub PR — not just when they explicitly say "use gh".
---

# Create PR

Turn the current branch into a GitHub pull request against `develop`, with a title and
description derived from what actually changed — not from what the branch name or commit
messages merely claim.

## Why these specific rules

This repo follows git-flow (see `AGENTS.md`): `feature/*` and `bugfix/*` branches always merge
back into `develop`, never `main`. PR text is always written in English regardless of the
language the user asks in, matching the repo's convention that commit messages and code comments
are English (`AGENTS.md` → "Project conventions"). Labels are only applied when they clearly
fit — a PR that only touches tooling/CI/docs, with no application-code feature or fix, should
get no label rather than a forced one.

## Steps

1. **Inspect the branch.**
   ```bash
   git branch --show-current
   git status
   git log develop..HEAD --oneline
   git diff develop...HEAD --stat
   ```
   If there are uncommitted changes, stop and tell the user — don't create a PR out of a dirty
   tree without asking first.

2. **Check for an existing PR** for this branch before creating a new one:
   ```bash
   gh pr list --head "$(git branch --show-current)" --state all
   ```
   If one is already open, this is an *update*, not a create — use `gh pr edit` for
   title/body/labels instead of `gh pr create`, and say so to the user.

3. **Read the real diff**, not just the stat summary — `git diff develop...HEAD` (or per-file, if
   large). The stat line tells you *which* files changed; only the actual diff tells you *what*
   changed and therefore what the title/body/label should say. Don't infer content from file
   names or commit subjects alone.

4. **Push the branch if needed.** `gh pr create` requires the branch to exist on the remote.
   Check with `git status` / `git rev-parse --abbrev-ref @{u}` whether it's already tracked and
   up to date. If a push is required, tell the user what you're about to push and proceed only
   if that matches what they asked for — pushing is a visible, shared-state action, not a purely
   local one.

5. **Write the title**: concise, English, under ~70 characters, describing the net effect of the
   change (not a list of file names). Prefer a conventional-commit-ish lead verb (Add/Fix/Update/
   Refactor) when it fits naturally, but clarity wins over format.

6. **Write the body** as a short bulleted summary in English, one bullet per logically distinct
   change (group related file edits into one bullet rather than one bullet per file). Use this
   shape:
   ```markdown
   ## Summary
   - <change 1>
   - <change 2>
   ```
   Add a `## Test plan` section only when there's something concrete and checkable to verify
   (e.g. specific commands, a CI matrix, a manual repro step) — don't pad it with vague
   checkboxes just to have the section.

7. **Decide the label** by reading the diff, not the branch name:
   - Diff adds new application behavior (new feature, new option, new endpoint, etc.) → `enhancement`.
   - Diff fixes incorrect behavior → `bug`.
   - Diff is purely tooling/CI/devcontainer/docs/refactor-with-no-behavior-change → no label.
   Confirm the label actually exists first (`gh label list`) — don't pass a label name that isn't
   defined in the repo.

8. **Create or update the PR:**
   ```bash
   gh pr create --base develop --title "<title>" --body "$(cat <<'EOF'
   ## Summary
   - ...
   EOF
   )" ${label:+--label "$label"}
   ```
   Use a heredoc for `--body` so multi-line formatting survives quoting. Report the resulting PR
   URL back to the user — don't just say "done."

## Non-goals

- Don't guess a label just to fill the field — an unlabeled PR is correct output when neither
  `enhancement` nor `bug` fits.
- Don't invent a base branch other than `develop` for `feature/*`/`bugfix/*` work; if the current
  branch is a `release/*` or `hotfix/*` branch (which target `main` per `AGENTS.md`), ask the
  user to confirm the base rather than assuming `develop`.
- Don't force-push, amend existing commits, or rewrite history as part of this flow.
