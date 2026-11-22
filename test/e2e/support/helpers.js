const fs = require('fs');
const path = require('path');
const { expect } = require('@playwright/test');

const SEED_PATH = path.resolve(__dirname, '..', '..', '..', '..', '..', 'tmp', 'e2e', 'seed.json');

// Reads the seed data written by support/seed.rb. Missing file or keys raise.
function loadSeed() {
  const seed = JSON.parse(fs.readFileSync(SEED_PATH, 'utf8'));
  const required = [
    ['user', 'login'], ['user', 'password'],
    ['project'], ['repository'], ['revision'], ['path'],
  ];
  for (const keys of required) {
    const value = keys.reduce((obj, key) => (obj == null ? undefined : obj[key]), seed);
    if (value === undefined || value === null || value === '') {
      throw new Error(`seed.json is missing key: ${keys.join('.')}`);
    }
  }
  return seed;
}

async function login(page) {
  const seed = loadSeed();
  await page.goto('/login');
  await page.fill('#username', seed.user.login);
  await page.fill('#password', seed.user.password);
  await page.click('#login-submit');
  // Redmine redirects to My page after a successful login.
  await expect(page.locator('h2')).toContainText('My page');
}

// Opens the seeded diff and creates one review through the pencil icon dialog.
// Returns after the review icon has appeared on the diff line.
async function createReview(page, subject) {
  const seed = loadSeed();
  await page.goto(
    `/projects/${seed.project}/repository/${seed.repository}/diff/${seed.path}?rev=${seed.revision}`
  );
  // The pencil icon id is spelled "add_revew_img_" in the plugin's JavaScript.
  await page.locator('img[id^="add_revew_img_"]').first().click();
  await page.fill('#review_subject', subject);
  await page.getByRole('button', { name: 'Apply' }).click();
  await expect(page.locator('span[id^="review_span_"] > span[id^="review_"] img').first()).toBeVisible();
}

module.exports = { loadSeed, login, createReview };
