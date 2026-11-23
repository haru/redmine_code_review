# 0005. Replace jQuery with plain JavaScript

- Status: Accepted
- Date: 2026-11-23

## Context

The review UI depends on jQuery and jQuery UI (the `.load()` partial loader,
`$.fn.down` / `$.fn.serialize2json` extensions, jQuery UI dialogs with drag,
resize and z-index management) and on 31 inline `<script>` blocks, `javascript_tag`
calls and inline event attributes in the ERB views. Redmine 7.0 still ships jQuery
for its own use, but a plugin-side library dependency is a liability: the plugin
carries and pins two libraries (ADR 0003) that the production browser bundle only
needs for this one file, the dialogs rely on a jQuery UI theme CSS that Redmine may
drop, and inline view scripts cannot be unit tested (Principle VII). The target
Redmine version was raised to >= 7.0 in the same decision.

## Decision

Replace all plugin-side jQuery / jQuery UI usage with browser-standard APIs
(`fetch`, `FormData`, `URLSearchParams`, Pointer Events,
`Range.createContextualFragment`, `CustomEvent`) and remove every inline script
from the ERB views:

- Partial loading is centralized in one `crLoad(target, url, { method, params })`
  function (`code_review_loader.js`) that reproduces the observable behavior of
  `$.fn.load`: always send `X-Requested-With`, send `X-CSRF-Token` on POST (error
  when the meta tag is missing), execute `<script>` elements of the response via
  `createContextualFragment`, and show `div.flash.error.cr-load-error` on failure.
- The jQuery UI dialog is replaced by a self-contained popup in the new
  `code_review_dialog.js` (non-modal, draggable, 8-direction resize, move-to-front,
  Esc to close, `onClose` callback), styled with `cr-` prefixed classes in the
  plugin stylesheet instead of a jQuery UI theme.
- Views pass values only through `data-cr-init` / `data-cr-action` attributes;
  the scripts self-register per-screen initializers and actions at load time. The
  sole script exception is the core `wikitoolbar_for` helper.
- The browser scripts are split into four classic scripts loaded in order
  (`code_review_dialog.js` -> `code_review_loader.js` -> `code_review.js` ->
  `code_review_settings.js`) to stay within the ESLint `max-lines` ratchet; no
  Stimulus, no ES modules, no importmap.
- Vitest tests stub `fetch` (`vi.stubGlobal`) instead of spying on `$.fn.load`;
  `jquery` / `jquery-ui` are removed from `package.json` and from the Renovate
  ignore rules.
- `init.rb` requires Redmine 7.0.0; CI drops the 6.0-stable / 6.1-stable jobs.

This supersedes the jQuery-related parts of ADR 0003: pinning `jquery` /
`jquery-ui` to the Redmine-bundled versions and stubbing Ajax via
`vi.spyOn($.fn, "load")` are no longer the rule — the tests stub `fetch` and the
plugin must not depend on jQuery at all. Everything else in ADR 0003 (Vitest +
jsdom + v8 coverage gate, `vm.runInThisContext` loader, classic scripts) stays in
force.

Stimulus was considered and rejected: it would add a build step or a runtime
dependency for state that the review UI already keeps in a handful of globals,
while the two delegation mechanisms (`data-cr-init`, `data-cr-action`) cover the
same need with no dependency. Keeping classic scripts also preserves the ADR 0003
test loader and the ADR 0004 lint setup unchanged.

## Consequences

- The plugin stylesheet owns the dialog look (`cr-dialog*` classes); if Redmine
  drops jQuery UI, the review UI keeps working.
- `grep -rnE '\$\(|\$\.|jQuery' assets/javascripts` must stay at 0 matches; the
  ESLint `no-restricted-globals` rule makes regressions fail lint.
- View templates stay script-free (`wikitoolbar_for` aside), so all view-triggered
  logic is unit testable; the functional tests assert the `data-cr-*` contract.
- Redmine 6.0 / 6.1 are no longer supported; installs on those versions must stay
  on a plugin release before this change.
