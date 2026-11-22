const { test, expect } = require('@playwright/test');
const { fileDiffUrl, login, createReview } = require('../support/helpers');

test('a view-only member sees reviews but cannot add one', async ({ page }) => {
  await login(page);
  const { id } = await createReview(page, 'E2E review for viewer');
  await page.context().clearCookies();

  await login(page, 'viewer');
  await page.goto(fileDiffUrl());
  await expect(page.locator(`#review_${id} img`)).toBeVisible();
  await expect(page.locator('img[id^="add_revew_img_"]')).toHaveCount(0);
});
