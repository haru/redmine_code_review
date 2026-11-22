const path = require('path');
const { expect } = require('@playwright/test');
const { workDir } = require('./env');

// Seed data written by support/seed.rb. Required once per worker; a missing file or
// invalid JSON raises with the path, and missing keys raise below.
const seed = require(path.join(workDir, 'seed.json'));
for (const keys of [
  ['user', 'login'], ['user', 'password'], ['viewer', 'login'], ['viewer', 'password'],
  ['project'], ['repository'], ['revision'], ['path'],
]) {
  const value = keys.reduce((obj, key) => (obj == null ? undefined : obj[key]), seed);
  if (value === undefined || value === null || value === '') {
    throw new Error(`seed.json is missing key: ${keys.join('.')}`);
  }
}

// URLs of the seeded commit: the diff of one file, and the diff of the whole changeset.
// `query` is appended as is (e.g. 'type=sbs').
function fileDiffUrl(query = '') {
  return `/projects/${seed.project}/repository/${seed.repository}/diff/${seed.path}?rev=${seed.revision}&${query}`;
}

function changesetDiffUrl(query = '') {
  return `/projects/${seed.project}/repository/${seed.repository}/revisions/${seed.revision}/diff?${query}`;
}

// `who` is 'user' (reviewer with all review permissions) or 'viewer' (view only).
async function login(page, who = 'user') {
  const account = seed[who];
  await page.goto('/login');
  await page.fill('#username', account.login);
  await page.fill('#password', account.password);
  // A failed login re-renders the form with status 200; a successful one redirects.
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname === '/login'),
    page.click('#login-submit'),
  ]);
  expect(response.status(), `login as ${account.login} failed`).toBe(302);
  // Redmine redirects to My page after a successful login.
  await expect(page.locator('#content h2')).toContainText('My page');
}

// Opens a diff and the add-review dialog of its first pencil icon.
async function openReviewForm(page, diffUrl = fileDiffUrl()) {
  await page.goto(diffUrl);
  // The plugin's update_diff_view request redraws the icons of saved reviews after load;
  // clicking before it finishes loses the typed text.
  await page.waitForLoadState('networkidle');
  // The pencil icon id is spelled "add_revew_img_" in the plugin's JavaScript.
  await page.locator('img[id^="add_revew_img_"]').first().click();
  await expect(page.locator('#review_subject')).toBeVisible();
  // The dialog opens with a jQuery UI effect that rebuilds its content; text typed
  // before the animation ends is lost.
  await page.waitForFunction(() => window.jQuery(':animated').length === 0);
}

// Clicks Apply and returns the response of the POST that saves the review.
async function applyReview(page) {
  const [response] = await Promise.all([
    page.waitForResponse((r) => r.request().method() === 'POST' && new URL(r.url()).pathname.endsWith('/code_review/new')),
    page.locator('#review-form').getByRole('button', { name: 'Apply' }).click(),
  ]);
  return response;
}

// Creates one review through the first pencil icon's dialog.
// Returns { id } after the new review's own icon has appeared; raises if the server
// re-rendered the form instead of creating the review.
async function createReview(page, subject, diffUrl = fileDiffUrl()) {
  await openReviewForm(page, diffUrl);
  await page.fill('#review_subject', subject);
  await expect(page.locator('#review_subject')).toHaveValue(subject);
  const body = await (await applyReview(page)).text();
  const match = body.match(/var review_id = (\d+);/);
  if (!match) {
    throw new Error(`review "${subject}" was not created; the server re-rendered the form:\n${body.slice(0, 500)}`);
  }
  const id = match[1];
  await expect(page.locator(`#review_${id} img`)).toBeVisible();
  return { id };
}

module.exports = { seed, fileDiffUrl, changesetDiffUrl, login, openReviewForm, applyReview, createReview };
