const { test, expect } = require('../support/fixtures');
const { login } = require('../support/helpers');

// The auto fixture must turn an uncaught exception into a test failure; test.fail
// asserts exactly that.
test('fails the test when a page throws an uncaught exception', async ({ page }) => {
  test.fail(true, 'an uncaught exception is expected to fail the test (fixtures.js)');
  await login(page);
  await page.evaluate(() => { setTimeout(() => { throw new Error('intentional E2E error'); }); });
  // Wait until the exception has fired so the page is still alive when it is reported.
  await page.waitForFunction(() => new Promise((resolve) => setTimeout(() => resolve(true), 0)));
});

test('ignores console.error output', async ({ page }) => {
  await login(page);
  await page.evaluate(() => console.error('intentional console error'));
  await expect(page.locator('#content h2')).toContainText('My page');
});
