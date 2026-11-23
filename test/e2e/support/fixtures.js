// Drop-in replacement for `@playwright/test`: every spec imports `test` and `expect` from
// here so that an uncaught JavaScript exception on any page, or a 5xx answer of the
// server, fails the test. The plugin loads most of its UI with jQuery `.load()`, which
// shows nothing when the request fails, so a server error would otherwise go unnoticed.
const base = require('@playwright/test');

const test = base.test.extend({
  pageErrors: [async ({ context }, use) => {
    const errors = [];
    const watch = (page) => page.on('pageerror', (error) => {
      errors.push(`${error.message}\n${error.stack || ''}`);
    });
    context.pages().forEach(watch);
    context.on('page', watch);
    context.on('response', (response) => {
      if (response.status() >= 500) {
        errors.push(`server error ${response.status()} ${response.request().method()} ${response.url()}`);
      }
    });
    await use(errors);
    base.expect(errors, `uncaught JavaScript exceptions or server errors:\n${errors.join('\n---\n')}`).toEqual([]);
  }, { auto: true }],
});

module.exports = { test, expect: base.expect };
