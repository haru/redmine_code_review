const { test, expect } = require('../support/fixtures');
const { seed, attachmentUrl, login, createReview, openReview } = require('../support/helpers');

test('offers the add-review control on the lines of an attached patch', async ({ page }) => {
  await login(page);
  await page.goto(attachmentUrl());
  await page.waitForLoadState('networkidle');
  await expect(page.locator('img[id^="add_revew_img_"]').first()).toBeVisible();
});

test('reviews a line of an attached patch and shows the review after reloading and on the index', async ({ page }) => {
  const subject = 'E2E attachment review';
  await login(page);
  const { id } = await createReview(page, subject, attachmentUrl());

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator(`#review_${id} img`)).toBeVisible();
  await openReview(page, id);
  await expect(page.locator(`#show_review_${id}`)).toContainText(subject);

  await page.goto(`/projects/${seed.project}/code_review/index`);
  const row = page.locator('#code_review_list tr', { has: page.locator('td.subject', { hasText: subject }) });
  await expect(row).toHaveCount(1);
  await expect(row.locator('td.path')).toContainText(seed.path);  // the file the patch changes
});
