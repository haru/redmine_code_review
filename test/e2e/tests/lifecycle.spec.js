const { test, expect } = require('../support/fixtures');
const { seed, fileDiffUrl, reviewShowUrl, login, createReview, openReview } = require('../support/helpers');

// Clicks the Apply button of `formSelector` and waits for the popup to be redrawn by the
// request to `action`. The popup's forms are sent with a GET, but the method is not checked.
async function applyPopupForm(page, formSelector, action) {
  const [response] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.endsWith(`/code_review/${action}`)),
    page.locator(formSelector).getByRole('button', { name: 'Apply' }).click(),
  ]);
  expect(response.status()).toBe(200);
  return response;
}

// Creates a review as the seeded reviewer and opens its popup.
async function createAndOpenReview(page, subject) {
  await login(page);
  const { id } = await createReview(page, subject);
  await openReview(page, id);
  return id;
}

// Reloads the diff and opens the popup of review `id` again.
async function reopenReview(page, id) {
  await page.goto(fileDiffUrl());
  await page.waitForLoadState('networkidle');
  await openReview(page, id);
}

test('replies to a review and shows the reply after reloading', async ({ page }) => {
  const id = await createAndOpenReview(page, 'E2E lifecycle reply');
  const popup = page.locator(`#show_review_${id}`);

  await expect(page.locator(`#reply_${id}`)).toBeHidden();
  await popup.getByRole('link', { name: 'Reply' }).click();
  await expect(page.locator(`#reply_${id}`)).toBeVisible();

  await page.fill(`#reply_comment_${id}`, 'E2E reply text');
  await applyPopupForm(page, `#message-form-${id}`, 'reply');
  await expect(popup).toContainText('E2E reply text');

  await reopenReview(page, id);
  await expect(popup).toContainText('E2E reply text');
});

test('does not add a history entry for an empty reply', async ({ page }) => {
  const id = await createAndOpenReview(page, 'E2E lifecycle empty reply');
  const popup = page.locator(`#show_review_${id}`);

  await popup.getByRole('link', { name: 'Reply' }).click();
  await applyPopupForm(page, `#message-form-${id}`, 'reply');
  await expect(popup.locator('p.author')).toHaveCount(1);
  await expect(popup.getByRole('heading', { name: 'History' })).toHaveCount(0);
});

test('edits the subject and comment of a review and keeps them after reloading', async ({ page }) => {
  const id = await createAndOpenReview(page, 'E2E lifecycle edit');
  const popup = page.locator(`#show_review_${id}`);

  await expect(page.locator(`#update-form-${id}`)).toBeHidden();
  await popup.getByRole('link', { name: 'Update' }).click();
  await expect(page.locator(`#update-form-${id}`)).toBeVisible();
  await page.locator(`#review_form_${id} button[type=button]:has-text("Cancel")`).click();
  await expect(page.locator(`#update-form-${id}`)).toBeHidden();

  await popup.getByRole('link', { name: 'Update' }).click();
  await page.fill(`#review_form_${id} #review_subject`, 'E2E lifecycle edited subject');
  await page.fill(`#review_comment_${id}`, 'E2E edited comment');
  await applyPopupForm(page, `#review_form_${id}`, 'update');
  await expect(popup).toContainText('E2E lifecycle edited subject');
  await expect(popup).toContainText('E2E edited comment');

  await reopenReview(page, id);
  await expect(popup).toContainText('E2E lifecycle edited subject');
  await expect(popup).toContainText('E2E edited comment');
});

test('closes a review and shows it on the index only when closed reviews are included', async ({ page }) => {
  const subject = 'E2E lifecycle close';
  const id = await createAndOpenReview(page, subject);
  const popup = page.locator(`#show_review_${id}`);

  await popup.getByRole('link', { name: 'Update' }).click();
  await page.locator(`#review_form_${id} select#review_status_id`).selectOption({ label: 'Closed' });
  await applyPopupForm(page, `#review_form_${id}`, 'update');
  await expect(popup.getByRole('heading', { level: 2 })).toContainText('(Closed)');

  await page.goto(`/projects/${seed.project}/code_review/index`);
  const row = page.locator('#code_review_list tr', { has: page.locator('td.subject', { hasText: subject }) });
  await expect(row).toHaveCount(0);

  await page.locator('#show_closed').check();
  await expect(row).toHaveCount(1);
  await expect(row.locator('td.status')).toHaveText('Closed');
});

test('deletes a review after confirming and no longer shows it after reloading', async ({ page }) => {
  const id = await createAndOpenReview(page, 'E2E lifecycle delete');

  page.once('dialog', (dialog) => dialog.accept());
  await page.locator(`#show_review_${id}`).getByRole('link', { name: 'Delete' }).click();
  // The plugin reloads the diff after the delete request completes.
  await page.waitForLoadState('networkidle');
  await expect(page.locator(`#review_${id}`)).toHaveCount(0);

  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator(`#review_${id}`)).toHaveCount(0);
});

test('keeps the review when the delete confirmation is cancelled', async ({ page }) => {
  const id = await createAndOpenReview(page, 'E2E lifecycle delete cancel');

  let confirmations = 0;
  page.once('dialog', (dialog) => { confirmations += 1; dialog.dismiss(); });
  await page.locator(`#show_review_${id}`).getByRole('link', { name: 'Delete' }).click();
  await expect.poll(() => confirmations).toBe(1);

  await expect(page.locator(`#show_review_${id}`)).toContainText('E2E lifecycle delete cancel');
  await page.reload();
  await page.waitForLoadState('networkidle');
  await expect(page.locator(`#review_${id} img`)).toBeVisible();
});

test('answers 404 for the show action of a deleted review', async ({ page }) => {
  const id = await createAndOpenReview(page, 'E2E lifecycle deleted show');
  page.once('dialog', (dialog) => dialog.accept());
  await page.locator(`#show_review_${id}`).getByRole('link', { name: 'Delete' }).click();
  await page.waitForLoadState('networkidle');

  const response = await page.request.get(reviewShowUrl(id), { maxRedirects: 0 });
  expect(response.status()).toBe(404);
});

test('previews formatted text from the wiki toolbar of the reply form', async ({ page }) => {
  const id = await createAndOpenReview(page, 'E2E lifecycle toolbar preview');
  await page.locator(`#show_review_${id}`).getByRole('link', { name: 'Reply' }).click();

  await page.fill(`#reply_comment_${id}`, 'see http://example.invalid/e2e-preview');
  await page.locator(`#message-form-${id} a.tab-preview`).click();
  await expect(page.locator(`#preview_reply_comment_${id} a.external`)).toHaveAttribute('href', 'http://example.invalid/e2e-preview');
});

test('renders formatted text for a direct preview request', async ({ page }) => {
  await login(page);
  const response = await page.request.post(`/projects/${seed.project}/code_review/preview`, {
    form: { 'review[comment]': 'see http://example.invalid/e2e-direct' },
  });
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain('href="http://example.invalid/e2e-direct"');
});

test('shows a locking conflict to the second of two concurrent editors', async ({ page, context }) => {
  const id = await createAndOpenReview(page, 'E2E lifecycle conflict');
  const other = await context.newPage();
  await other.goto(fileDiffUrl());
  await other.waitForLoadState('networkidle');
  await openReview(other, id);

  for (const [tab, subject] of [[page, 'E2E conflict first'], [other, 'E2E conflict second']]) {
    const popup = tab.locator(`#show_review_${id}`);
    await popup.getByRole('link', { name: 'Update' }).click();
    await tab.fill(`#review_form_${id} #review_subject`, subject);
    await applyPopupForm(tab, `#review_form_${id}`, 'update');
    if (subject.endsWith('first')) {
      await expect(popup).toContainText(subject);
    } else {
      await expect(popup.locator('div.flash.error')).toBeVisible();
    }
  }

  await reopenReview(page, id);
  const popup = page.locator(`#show_review_${id}`);
  await expect(popup).toContainText('E2E conflict first');
  await expect(popup).not.toContainText('E2E conflict second');
});
