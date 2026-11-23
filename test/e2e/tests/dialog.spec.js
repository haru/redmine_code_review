const { test, expect } = require('../support/fixtures');
const { login, createReview, openReview, openReviewForm } = require('../support/helpers');

const FORM_DIALOG = '.cr-dialog:has(#review-form-frame)';

// Drags `locator` by (dx, dy) pixels from its center with the mouse.
async function dragBy(page, locator, dx, dy) {
  // Mouse coordinates are viewport-relative; a handle below the fold would be missed.
  await locator.scrollIntoViewIfNeeded();
  const box = await locator.boundingBox();
  const x = box.x + box.width / 2;
  const y = box.y + box.height / 2;
  await page.mouse.move(x, y);
  await page.mouse.down();
  await page.mouse.move(x + dx, y + dy, { steps: 5 });
  await page.mouse.up();
}

test('moves the add-review dialog by its title bar', async ({ page }) => {
  await login(page);
  await openReviewForm(page);
  const dialog = page.locator(FORM_DIALOG);
  const before = await dialog.boundingBox();

  await dragBy(page, dialog.locator('.cr-dialog-titlebar'), 40, 30);

  const after = await dialog.boundingBox();
  expect(Math.round(after.x - before.x)).toBe(40);
  expect(Math.round(after.y - before.y)).toBe(30);
});

test('resizes the dialog from the southeast and northwest handles', async ({ page }) => {
  await login(page);
  await openReviewForm(page);
  const dialog = page.locator(FORM_DIALOG);
  const before = await dialog.boundingBox();

  await dragBy(page, dialog.locator('.cr-dialog-handle[data-cr-dir="se"]'), 50, 40);
  const grown = await dialog.boundingBox();
  expect(Math.round(grown.width - before.width)).toBe(50);
  expect(Math.round(grown.height - before.height)).toBe(40);

  await dragBy(page, dialog.locator('.cr-dialog-handle[data-cr-dir="nw"]'), -20, -10);
  const moved = await dialog.boundingBox();
  expect(Math.round(moved.width - grown.width)).toBe(20);
  expect(Math.round(moved.x - grown.x)).toBe(-20);
  expect(Math.round(moved.y - grown.y)).toBe(-10);
});

test('closes the dialog with Esc and with the close button, and opens it again', async ({ page }) => {
  await login(page);
  await openReviewForm(page);

  await page.keyboard.press('Escape');
  await expect(page.locator(FORM_DIALOG)).toHaveCount(0);

  await page.locator('img[id^="add_revew_img_"]').first().click();
  await expect(page.locator('#review_subject')).toBeVisible();
  await page.locator(`${FORM_DIALOG} .cr-dialog-close`).click();
  await expect(page.locator(FORM_DIALOG)).toHaveCount(0);

  await page.locator('img[id^="add_revew_img_"]').first().click();
  await expect(page.locator('#review_subject')).toBeVisible();
  await expect(page.locator('#review_subject')).toHaveValue('');
});

test('shows several review popups and brings the clicked one to the front', async ({ page }) => {
  await login(page);
  const first = await createReview(page, 'E2E dialog first');
  const second = await createReview(page, 'E2E dialog second');
  await openReview(page, first.id);
  // The first popup is centered and may cover the second icon, so dispatch the click.
  await page.locator(`#review_${second.id} img`).dispatchEvent('click');
  await expect(page.locator(`#show_review_${second.id}`)).toBeVisible();
  const popups = page.locator('.cr-dialog');
  await expect(popups).toHaveCount(2);

  const zIndex = (id) => page.locator(`.cr-dialog:has(#show_review_${id})`)
    .evaluate((el) => Number(el.style.zIndex));
  expect(await zIndex(second.id)).toBeGreaterThan(await zIndex(first.id));

  // The second popup covers the first, so a real click would be intercepted. The frame's own
  // pointerdown only raises it (a titlebar pointerdown would start a drag needing a real pointer).
  await page.locator(`.cr-dialog:has(#show_review_${first.id})`).dispatchEvent('pointerdown');
  expect(await zIndex(first.id)).toBeGreaterThan(await zIndex(second.id));
});
