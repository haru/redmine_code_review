const { test } = require('@playwright/test');
const { login, createReview } = require('../support/helpers');

test('creates a review from the diff screen', async ({ page }) => {
  await login(page);
  await createReview(page, 'E2E review from diff');
});
