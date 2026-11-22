# redmine_code_review Constitution

## Core Principles

### I. Simplicity (KISS / DRY / YAGNI)
The simplest design that works MUST be chosen. Duplicated logic MUST be removed, and
speculative abstractions for hypothetical future needs MUST NOT be added. New code MUST follow
the idioms of the file it edits instead of introducing a new pattern.
Rationale: the codebase mixes older Redmine-plugin idioms with newer Rails style, and
monkey patches on core classes make every extra layer costly.

### II. Test-First with Coverage (NON-NEGOTIABLE)
The failing test MUST be written before the implementation. Statement (C0) coverage of the
Minitest suite MUST stay at or above 90%, checked in `coverage/` after a run.
Rationale: a plugin that patches `Change`, `Changeset`, `Issue` and `Attachment` can break
Redmine itself; tests are the only safety net.

### III. End-to-End Verification of the Review UI
The review UI is driven by JavaScript that Minitest cannot exercise, so it MUST be verified
with the Playwright E2E suite in `test/e2e/`, run through `test/e2e/run.sh`. The suite MUST pass
before a branch is proposed for merge (CI is out of scope; see ADR 0001). A change to review
UI behavior (`assets/javascripts/`, the partials injected into repository pages) MUST add or
update an E2E spec for the changed flow. E2E specs MUST:
- run only against the isolated workspace (`tmp/e2e/`, its own DB), never the development DB;
- create the data they need and assert on what they created, not on leftovers of other specs;
- use web-first assertions instead of fixed sleeps.

Rationale: unit tests passing while the UI is broken is exactly the failure this suite exists to
catch.

### IV. Explicit Failure (No Easy Fallbacks)
Errors MUST NOT be swallowed or silently defaulted (broad `rescue`, `rescue nil`, silent
empty-array/false returns). Unexpected conditions MUST raise and be handled explicitly;
validation belongs only at true system boundaries. Scripts and tests MUST fail loudly with a
message that names the cause (for example, missing tools or a busy port).
Rationale: a silent failure hides the real defect and shows up later as a misleading one.

### V. Core Redmine Safety
Changes to the monkey patches in `lib/` MUST consider their effect on non-plugin Redmine
behavior and on other plugins patching the same classes. Load order in `init.rb` is part of the
contract. A new controller action MUST have a matching permission entry in `init.rb`, not only a
route.
Rationale: the patches run inside every Redmine request, not only the plugin's own pages.

## Additional Constraints
- The plugin MUST work on Redmine >= 6.0, as pinned by `requires_redmine` in `init.rb`.
- Code, code comments and git commit messages MUST be written in English. Documents under
  `specs/` MUST be written in Japanese.
- New migrations MUST use the Rails timestamp format.
- `specs/` is a separate, git-ignored repository and MUST NOT be committed here.

## Development Workflow
- Branching follows git-flow: `feature/*` and `bugfix/*` branch from and merge into `develop`;
  `release/*` merges into `main` and `develop`; `hotfix/*` branches from `main`.
- Architecturally significant decisions MUST be recorded as an ADR under `docs/adr/` and listed in
  `docs/adr/README.md`. ADRs are append-only: a changed decision gets a new, superseding ADR.
- The wiki under `wiki/` MUST be changed only through the `speckit-wiki-*` skills.
- Before merge, the Minitest suite and the E2E suite MUST pass and the change SHOULD be reviewed
  with `/speckit-review-run`.

## Governance
This constitution supersedes other practices. Amendments MUST be made through
`/speckit-constitution`, with the version bumped by semantic versioning (MAJOR: a principle is
removed or redefined incompatibly; MINOR: a principle or section is added or materially
expanded; PATCH: clarification only). Every plan MUST be checked against these principles, and
any deviation MUST be justified in the plan's Complexity Tracking. `AGENTS.md` holds the
day-to-day commands and architecture and MUST stay consistent with this document.

**Version**: 1.0.0 | **Ratified**: 2026-11-22 | **Last Amended**: 2026-11-22
