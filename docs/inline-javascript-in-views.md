# JavaScript in views

This document records how the plugin's ERB templates hand values to JavaScript. The decision is recorded in
[ADR 0005](adr/0005-replace-jquery-with-plain-javascript.md); it supersedes the
"leave value hand-off scripts in the views" part of
[ADR 0003](adr/0003-adopt-vitest-for-javascript-unit-tests.md).

## How the views work

A template contains no `<script>` block and no event handler attribute. It
only renders markers; `assets/javascripts/code_review_loader.js` finds them.

- **`data-cr-init="<name>"`** marks an element to initialize. The values it needs are
  in further `data-cr-*` attributes (JSON for lists such as `data-cr-reviews`).
  `crInitialize(root)` runs the handler registered with `crRegisterInit(name, fn)`
  for every marker under `root`, once, after the page is ready and after every
  `crLoad` insertion. An unregistered name throws.
- **`data-cr-action="<name>"`** marks an element that reacts to a click or change.
  `crRegisterAction(name, event, fn)` registers the handler; two delegated listeners
  on `document` dispatch to it, so loaded fragments need no re-binding. Selectors the
  handler works on are `data-cr-target` / `data-cr-show` / `data-cr-hide` /
  `data-cr-form` attributes.
- Required attributes are read with `crAttr`, `crAttrInt`, `crAttrBool` and
  `crAttrJson`, which throw naming the attribute when it is missing or malformed.
  There are no silent defaults.

Because values travel in attributes (escaped by ERB), no string is spliced into
JavaScript source, and `escape_javascript` is not needed for these views.

The functional tests enforce this with `assert_no_inline_script` and `cr_marker`
(`test/test_helper.rb`); the unit tests cover the handlers, and the Playwright E2E
suite covers the resulting UI.

## Exception

`wikitoolbar_for` (Redmine core) writes its own `jsToolBar` script into the review
forms. It is not plugin code and cannot be avoided; `assert_no_inline_script` ignores
exactly that script.

## Checks

Both of these must report nothing (the first is also enforced by ESLint
`no-restricted-globals`, the second by the functional tests):

```bash
grep -rnE '\$\(|\$\.|jQuery|eval\(' assets/javascripts app/views
grep -rnE '<script|javascript_tag|onclick|onchange|link_to_function|toggle_link' app/views
```
