# 0004. Adopt ESLint for JavaScript static analysis

- Status: Accepted
- Date: 2026-11-23

## Context

Feature 005 (ADR 0003) gave the plugin JavaScript unit tests with a coverage gate, but
nothing statically checks the JavaScript itself. Undefined identifiers, unused
variables, nested `var`, loose equality, implicit coercion and missing JSDoc
were only caught by review or at runtime. CI already runs independent jobs for
Ruby lint (`rubocop`) and unit tests (`javascript`); JavaScript lint needed the
same treatment: a one-command local entry point whose result CI reproduces
exactly. A candidate configuration was measured against the existing code: 98
violations (`jsdoc/require-jsdoc` ~25, nested `var` 56, unused arguments 5,
`curly` 5, `eqeqeq` 7), all in `assets/javascripts/code_review.js`.

## Decision

Use **ESLint 10 (flat config) + `eslint-plugin-jsdoc`** in the Node project
created by ADR 0003:

- `eslint.config.js` inspects exactly two blocks: `assets/javascripts/**/*.js`
  (classic scripts) and `test/javascript/**/*.js` (ESM tests). `npm run lint`
  passes only these directories to eslint, so `test/e2e/`, `app/views/` and
  build output are never scanned. ESLint fails when a passed pattern matches no
  file, which keeps an accidentally emptied target a loud failure.
- Every rule is an `error`. `js.configs.recommended` ships no `warn` rules and
  the jsdoc preset used is `flat/recommended-error`, so no promotion code is
  needed; the lint command runs with `--max-warnings 0`, so a preset update
  that introduces a `warn` rule fails CI instead of passing as a warning.
- `jsdoc/require-jsdoc` requires a JSDoc comment on every function
  declaration, function expression (including `var X = function () {}`
  constructors), method, class and arrow function; the preset's
  `require-param` and related rules check the tags it contains. Lint verifies
  that the comment exists and is consistent with the signature, not that its
  prose is meaningful. The top-level names are globals the ERB views call by
  bare name, so documenting them at the definition site is the only place the
  contract can live. The fixers of `require-jsdoc` and `require-param` are
  disabled (`enableFixer: false`) because they only insert empty stubs.
- **Top-level `var` is allowed, nested `var` is not.** `no-var` would flag the
  ~20 top-level declarations that views overwrite (`urlprefix`, `rev`, ...)
  and that the test harness re-executes per test to reset state — converting
  them to `let`/`const` breaks both (views write them as globals; a second
  `let`-declared script run throws `Identifier has already been declared`).
  Instead of per-line disables, one selector bans the nested cases:
  `no-restricted-syntax: [":not(Program) > VariableDeclaration[kind='var']"]`,
  with the reason recorded in a config comment.
- Test-block globals are auto-registered: the config parses
  `assets/javascripts/code_review.js` (the file the test loader runs) with
  `espree`, a direct devDependency, and registers every top-level declaration
  (`writable`, because tests assign them). The path is resolved from the
  config file, so linting works from any working directory. A hand-maintained
  duplicate list would drift; if the scan finds nothing, loading the config
  throws.
- Size and complexity limits are **ratchets measured from the current code**
  (`max-lines` 351 assets / 270 tests, `max-lines-per-function` 49 assets only,
  `complexity` 14/3, `max-depth` 4/1, `max-params` 6/3). They may only be
  lowered; raising one requires a new ADR recording why. `max-lines-per-function`
  is omitted for tests because every test file is one `describe()` callback.
- `camelcase` is not adopted: several snake_case globals (`review_counts`,
  `add_form_title`, ...) are referenced by name from the ERB views, and the
  spec requires no naming convention.
- No `eslint-disable` files, no blanket `ignores` hiding violations, and no
  `.eslintignore`: exceptions exist only as individual, commented config
  entries. `.eslintrc*` formats are not used at all.
- `.github/workflows/build.yml` gains a `lint-javascript` job (checkout,
  setup-node 24 with npm cache, `npm ci`, `npm run lint`, Slack notification on
  failure in the same style as the other jobs) with no `needs`, so violations
  are reported without waiting for the test matrix. `npm ci` also fails on a
  lockfile/`package.json` mismatch. Renovate updates the ESLint packages like
  any other dependency; a tool update that introduces violations fails this job
  and is caught in the Renovate PR.

## Alternatives considered

- **Biome / oxlint**: faster, but their JSDoc coverage is thinner than
  `eslint-plugin-jsdoc`, and the reference setups this plugin follows use ESLint.
- **Linting the whole repo (`eslint .`)**: would scan `test/e2e/`, which has
  its own globals and dependencies and is out of scope; the unconfigured area
  would either need ignores (forbidden) or fail.
- **Fixing everything with `eslint --fix` alone**: jsdoc rules also auto-insert
  empty comment stubs, which would fake the documentation requirement; those
  fixers are disabled, so `--fix` applies only where the result equals a real
  fix (brace style, comment formatting).
- **Starting with "ideal" limits (e.g. 30-line functions)**: would require a
  big refactor at introduction and violate the no-behavior-change constraint of
  this feature. Measured ratchets fix the baseline now and tighten over time.

## Consequences

- `npm run lint` / `npm run lint:fix` are the entry points; CI runs the same
  `npm run lint`, so local and CI verdicts cannot drift.
- `code_review.js` must keep its top-level `var` declarations; new code must
  use `const`/`let` inside functions and a documented JSDoc comment on every
  declaration.
- The ratchet limits are lower bounds of code health: they start at the
  measured maximum and may only decrease.
- A preset update that adds `error` rules, or a `warn` rule (rejected by
  `--max-warnings 0`), fails CI in the Renovate PR instead of being ignored.
