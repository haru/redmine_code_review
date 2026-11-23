const { test, expect } = require('../support/fixtures');
const { seed, login } = require('../support/helpers');

test('logs in as the seeded reviewer', async ({ page }) => {
  await login(page);
  // Redmine 7.0 puts "@login" in a hidden account dropdown, 6.x shows "Logged in as login";
  // both live in the top menu.
  await expect(page.locator('#top-menu')).toContainText(seed.user.login);
});
