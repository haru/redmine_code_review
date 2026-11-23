
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
Minitest suite MUST stay at or above 95%, checked in `coverage/` after a run.
JavaScript is held to the same rule; see Principle VII.
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

### VI. RuboCop Clean (NON-NEGOTIABLE)
All Ruby code MUST pass RuboCop with no offenses. RuboCop MUST be run only through
`build-scripts/rubocop.sh` (the same script CI uses), never as a bare `rubocop`, which inspects
0 files inside Redmine. Unavoidable exceptions MUST be recorded individually with a reason:
inline `# rubocop:disable Cop -- reason` or a per-cop entry in `.rubocop.yml`. A
`.rubocop_todo.yml` and blanket disabling of a whole department MUST NOT be added. Tool versions
MUST stay pinned in `tools/rubocop/Gemfile.lock`.
Rationale: one script and one pinned version make local and CI results identical, and
per-cop reasons keep exceptions reviewable instead of silently accumulating.

### VII. JavaScript Unit Tests with Coverage (NON-NEGOTIABLE)
Logic in `assets/javascripts/` MUST be covered by Vitest unit tests under `test/javascript/`
(see ADR 0003), written before the implementation. Line coverage MUST stay at or above 95%,
checked with `npm run test:coverage` from the plugin directory (the threshold is enforced in
the Vitest config, so a drop fails the run). Unit tests MUST:
- load scripts through `test/javascript/support/load_classic_script.js` so globals and coverage
  attribution match the browser, and reset global state in `beforeEach`;
- stub Ajax (`vi.spyOn($.fn, "load")`) instead of making real requests;
- keep `jquery` and `jquery-ui` pinned to the Redmine-bundled versions.
View templates MUST keep only value hand-off and function calls in `<script>` blocks; logic
belongs in `code_review.js` where it can be tested (`docs/inline-javascript-in-views.md`).
`npm test` MUST pass before a branch is proposed for merge. Vitest complements, and does not
replace, the Playwright E2E suite of Principle III.
Rationale: Minitest cannot reach browser-side logic, and E2E specs are too slow and coarse to
pin down every branch; fast unit tests keep the JavaScript refactorable.

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
- Before merge, `build-scripts/rubocop.sh` MUST report no offenses, the Minitest suite, the
  Vitest suite (`npm run test:coverage`) and the E2E suite MUST pass, and the change SHOULD be reviewed
  with `/speckit-review-run`.

## Governance
This constitution supersedes other practices. Amendments MUST be made through
`/speckit-constitution`, with the version bumped by semantic versioning (MAJOR: a principle is
removed or redefined incompatibly; MINOR: a principle or section is added or materially
expanded; PATCH: clarification only). Every plan MUST be checked against these principles, and
any deviation MUST be justified in the plan's Complexity Tracking. `AGENTS.md` holds the
day-to-day commands and architecture and MUST stay consistent with this document.

**Version**: 1.3.0 | **Ratified**: 2026-11-22 | **Last Amended**: 2026-11-23
