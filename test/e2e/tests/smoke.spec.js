const { test, expect } = require('@playwright/test');
const { login } = require('../support/helpers');

test('logs in and shows My page', async ({ page }) => {
  await login(page);
  await page.goto('/my/page');
  await expect(page.locator('h2')).toContainText('My page');
});
