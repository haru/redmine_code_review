// Drop-in replacement for `@playwright/test`: every spec imports `test` and `expect` from
// here so that an uncaught JavaScript exception on any page fails the test (FR-015).
const base = require('@playwright/test');

const test = base.test.extend({
  pageErrors: [async ({ context }, use) => {
    const errors = [];
    const watch = (page) => page.on('pageerror', (error) => {
      errors.push(`${error.message}\n${error.stack || ''}`);
    });
    context.pages().forEach(watch);
    context.on('page', watch);
    await use(errors);
    base.expect(errors, `uncaught JavaScript exceptions:\n${errors.join('\n---\n')}`).toEqual([]);
  }, { auto: true }],
});

module.exports = { test, expect: base.expect };
