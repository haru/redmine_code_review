---
name: create-pr
description: Create (or update) a GitHub pull request for the current branch in this repo using the gh CLI, with a user-facing English title, a bulleted English summary of the actual diff, a linked issue (Fixes #N) when one exists, and enhancement/bug/documentation labels where they fit. Use this whenever the user asks to open a PR, make a pull request, "PRを作って"/"PR作成して", or otherwise wants the current branch's work turned into a reviewable GitHub PR — not just when they explicitly say "use gh".
---

# Create PR

Turn the current branch into a GitHub pull request. The base branch depends on the branch
type (git-flow, see `AGENTS.md`), and the title/description are derived from what actually
changed — not from what the branch name or commit messages merely claim.

All PR text is English regardless of the language the user asks in (repo convention).

## Branch type → base and format

| Branch | Base | Title / body |
|--------|------|--------------|
| `release/*` | `main` | Title and body: `Release <version>` (version taken from the branch name). No labels, no issue link. |
| `hotfix/*` | `main` | Ask the user to confirm the base, then follow the feature/fix rules below. |
| `feature/*`, `bugfix/*`, anything else | `develop` | Rules below. |

## Steps

1. **Inspect the branch.**
   ```bash
   git branch --show-current
   git status
   git log <base>..HEAD --oneline
   git diff <base>...HEAD --stat
   ```
   - Uncommitted changes → stop and tell the user; don't open a PR from a dirty tree.
   - No commits ahead of the base → stop and report that there is nothing to PR.

2. **Check for an existing PR** before creating one:
   ```bash
   gh pr list --head "$(git branch --show-current)" --state all
   ```
   If one is open, this is an *update*: use `gh pr edit` for title/body/labels instead of
   `gh pr create`, say so, and report its URL.

3. **Read the real diff** (`git diff <base>...HEAD`, per file if large). The stat only says
   *which* files changed; the diff says *what* changed, which drives the title, body, and
   labels. If the branch has a Spec Kit spec (`specs/<branch>/spec.md`), use it as extra
   context for the user-facing effect; if it is missing, rely on the diff and commits.

4. **Find the related issue.** Look, in this order, at: the user's message, commit messages,
   the spec, and the branch name only if it explicitly names an issue. If nothing is found,
   search open issues for the topic (`gh issue list --state all --search "<keywords>"`).
   Verify that the number is an **issue, not a PR** (`gh issue view <N>`; a PR number
   returns an error there).
   - Change fully resolves it → `Fixes #N` (or `Closes #N`).
   - Change only partly addresses it → `Related to #N`.
   - Genuinely no matching issue → omit the line; don't invent one. Say so in the report.

5. **Push the branch if needed.** Check `git status -sb` / `git rev-parse --abbrev-ref @{u}`.
   Pushing is a visible, shared-state action: tell the user what you are about to push and
   proceed only if that matches what they asked for. Never force-push.

6. **Write the title.** It is copied into release notes, so write it for end users:
   - Describe the user-visible effect, not the implementation.
   - Start with an imperative verb (Add / Fix / Update / Improve …).
   - Under ~70 characters.
   - No issue numbers, branch names, or file/function names.

7. **Write the body**:
   ```markdown
   Fixes #N

   ## Changes
   - <change 1>
   - <change 2>
   ```
   One bullet per logically distinct change (group related file edits). The issue line goes
   first and is omitted when there is no issue. Add a `## Test plan` section only when there
   is something concrete to run or check (specific commands, a manual repro) — no vague
   checkboxes. End the body with the session URL line if the environment's attribution
   instructions provide one.

8. **Decide labels** from the diff, not the branch name; several may apply. Confirm each
   exists with `gh label list` and silently skip any that doesn't.
   - New application behavior → `enhancement`
   - Fixes incorrect behavior → `bug`
   - Documentation changes (docs/, README, wiki) → `documentation`
   - Purely tooling/CI/devcontainer/tests/refactor with no user-visible change → no
     `enhancement`/`bug`; use `ignore-for-release` instead if it exists, since such PRs
     don't belong in release notes.

9. **Create or update the PR:**
   ```bash
   gh pr create --base <base> --title "<title>" --body "$(cat <<'EOF'
   Fixes #N

   ## Changes
   - ...
   EOF
   )" --label "<label>"   # repeat --label per label; omit when none apply
   ```
   Use a heredoc so multi-line formatting survives. Report the resulting PR URL — don't just
   say "done".

## Non-goals

- Don't guess labels or issue numbers to fill the fields.
- Don't amend commits, rewrite history, or force-push as part of this flow.
