# redmine_code_review Constitution
<!-- SYNC_IMPACT_REPORT
Version change: 1.5.0 -> 1.6.0 (MINOR: Principle VII materially expanded/redefined, Additional Constraints version floor raised)
Modified principles:
  - VII. JavaScript Unit Tests with Coverage (jQuery tooling rules replaced: fetch stubs, no-JavaScript-library rule, data-attribute views)
Added sections: none
Removed sections: none
Follow-up TODOs: none (AGENTS.md and docs/inline-javascript-in-views.md describe the jQuery-free state)
-->

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
- stub Ajax (`vi.stubGlobal('fetch', ...)`) instead of making real requests;
- keep the plugin free of JavaScript library dependencies: code under `assets/javascripts/` MUST
  NOT use jQuery (`$` / `jQuery`), jQuery UI, or `eval`, and new code MUST use browser-standard
  APIs only (Redmine core may still load jQuery for its own use).
View templates MUST NOT contain scripts: values are handed to the scripts through `data`-
attributes (`data-cr-init` / `data-cr-action` markers) and logic belongs in
`assets/javascripts/*.js` where it can be tested; the only exception is the core `wikitoolbar_for`
helper, recorded in `docs/inline-javascript-in-views.md`.
`npm test` MUST pass before a branch is proposed for merge. Vitest complements, and does not
replace, the Playwright E2E suite of Principle III.
Rationale: Minitest cannot reach browser-side logic, and E2E specs are too slow and coarse to
pin down every branch; fast unit tests keep the JavaScript refactorable.

### VIII. Never Develop on `develop` or `main` (NON-NEGOTIABLE)
Work MUST NOT start, and nothing MUST be edited or committed, while `develop` or `main` is checked
out. These are integration branches that change only by merging a reviewed branch. Before the
first edit, commit or spec-kit step of any task, session or resumed session (including after
`/clear`), the agent MUST run `git branch --show-current` and confirm:
- the branch is a git-flow work branch (`feature/*`, `bugfix/*`, `release/*` or `hotfix/*`);
- for spec-kit work, the branch matches the feature directory in `.specify/feature.json`
  (`specs/006-example` -> `feature/006-example`).

If the check fails, the agent MUST stop, create or switch to the correct branch from `develop`
(from `main` for `hotfix/*`), and only then continue; carrying uncommitted changes over is
allowed, committing them on `develop` or `main` is not. Review, read-only analysis and answering
questions are exempt as long as no file is changed. A branch-creating hook (`speckit.git.feature`)
that was skipped or failed MUST be rerun or replaced by creating the branch by hand, never ignored.
Rationale: feature work has repeatedly landed directly on `develop`, which forced history rewrites
and made the work impossible to review or discard as a unit.

### IX. JavaScript Static Analysis Clean (NON-NEGOTIABLE)
All JavaScript under `assets/javascripts/` and `test/javascript/` MUST pass ESLint with no
errors and no warnings. ESLint MUST be run only through `npm run lint` from the plugin
directory (the same command the `lint-javascript` CI job uses); it MUST NOT be invoked with ad
hoc paths or options. Lint rules MUST be:
- `error` severity only, with `--max-warnings 0` kept in the script so a `warn` rule fails;
- applied to exactly those two directories, never to `test/e2e/` or `app/views/`;
- configured in `eslint.config.js` with versions pinned in `package.json` (ADR 0004).
Unavoidable exceptions MUST be recorded individually with a reason (an inline
`eslint-disable-next-line <rule> -- reason` or a scoped entry in `eslint.config.js`); blanket
`/* eslint-disable */`, disabling a rule globally, and a hand-maintained globals list MUST NOT
be added. The size and complexity limits (`max-lines`, `complexity`, ...) are ratchets: they
MAY be lowered, and raising one MUST be recorded in a new ADR. New or changed functions MUST
carry real JSDoc; stub comments inserted only to satisfy the linter MUST NOT be committed.
Rationale: Vitest and E2E only find defects on executed paths; static analysis catches
undefined identifiers, unused variables and implicit coercion on every path, and one command
and one pinned toolchain keep local and CI results identical.

## Additional Constraints
- The plugin MUST work on Redmine >= 7.0, as pinned by `requires_redmine` in `init.rb`.
- Code, code comments and git commit messages MUST be written in English. Documents under
  `specs/` MUST be written in Japanese.
- New migrations MUST use the Rails timestamp format.
- `specs/` is a separate, git-ignored repository and MUST NOT be committed here.

## Development Workflow
- Branching follows git-flow: `feature/*` and `bugfix/*` branch from and merge into `develop`;
  `release/*` merges into `main` and `develop`; `hotfix/*` branches from `main`. Direct work on
  `develop` and `main` is forbidden (Principle VIII).
- Architecturally significant decisions MUST be recorded as an ADR under `docs/adr/` and listed in
  `docs/adr/README.md`. ADRs are append-only: a changed decision gets a new, superseding ADR.
- The wiki under `wiki/` MUST be changed only through the `speckit-wiki-*` skills.
- Before merge, `build-scripts/rubocop.sh` and `npm run lint` (Principle IX) MUST report no offenses, the
  Minitest suite, the Vitest suite (`npm run test:coverage`) and the E2E suite MUST pass, and the
  change SHOULD be reviewed with `/speckit-review-run`.

## Governance
This constitution supersedes other practices. Amendments MUST be made through
`/speckit-constitution`, with the version bumped by semantic versioning (MAJOR: a principle is
removed or redefined incompatibly; MINOR: a principle or section is added or materially
expanded; PATCH: clarification only). Every plan MUST be checked against these principles, and
any deviation MUST be justified in the plan's Complexity Tracking. `AGENTS.md` holds the
day-to-day commands and architecture and MUST stay consistent with this document.

**Version**: 1.6.0 | **Ratified**: 2026-11-22 | **Last Amended**: 2026-11-23
