const { test, expect } = require('@playwright/test');
const { seed, login } = require('../support/helpers');

test('logs in as the seeded reviewer', async ({ page }) => {
  await login(page);
  await expect(page.locator('#account .user-login')).toBeAttached();
  await expect(page.locator('#account .user-login')).toHaveText(`@${seed.user.login}`);
});
