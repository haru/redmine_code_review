const { test, expect } = require('../support/fixtures');
const {
  seed, login, resetCodeReviewSettings, commitFile, fetchChangesets, openReviewForm, applyReview, openReview, reviewIdFrom,
} = require('../support/helpers');

const settingsUrl = `/projects/${seed.settingsProject}/settings/code_review`;
const filterRows = (page) => page.locator('#auto_assignment_filters tbody tr[id^="auto_assign_tr_"]');
const filterExpressions = (page) => filterRows(page).locator('td:nth-child(3)');

// All settings scenarios run on the dedicated settings project and start from default
// settings, so they depend neither on each other nor on the main project.
async function openSettings(page) {
  await login(page);
  await resetCodeReviewSettings(page);
  // The reset request leaves a flash that the first page view shows. A 302 alone cannot
  // tell a saved reset from a caught locking conflict, so check the notice, then load the
  // page again so that the only notice a later save can produce is its own.
  await page.goto(settingsUrl);
  await expect(page.locator('#flash_notice')).toContainText('Successful update');
  await expect(page.locator('#flash_error')).toHaveCount(0);
  await page.goto(settingsUrl);
  await expect(page.locator('#code_review_form')).toBeVisible();
  await expect(page.locator('#flash_notice')).toHaveCount(0);
}

// Submits the form and waits for the notice of the page the save redirects to.
async function saveSettings(page) {
  await page.locator('#code_review_form input[type=submit]').click();
  await expect(page.locator('#flash_notice')).toContainText('Successful update');
  await expect(page.locator('#code_review_form')).toBeVisible();
}

// Turns on the auto-assign block and its filter block.
async function enableFilters(page) {
  await page.locator('#auto_assign_enabled').check();
  await expect(page.locator('#cr_auto_assign_settings')).toBeVisible();
  await page.locator('#auto_assign_filter_enabled').check();
  await expect(page.locator('#auto_assignment_filter_form')).toBeVisible();
}

// Adds one filter through the inline form and waits for the redrawn table to list it.
async function addFilter(page, expression, accept = 'true') {
  const rowsBefore = await filterRows(page).count();
  await page.locator('#auto_assignment_filter_form .contextual a.icon-add').click();
  await expect(page.locator('#add_filter_form')).toBeVisible();
  await page.selectOption('#auto_assign_add_filter_accept', accept);
  await page.fill('#auto_assign_add_filter_expression', expression);
  const [response] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/code_review_settings/add_filter')),
    page.locator('#add_filter_form').getByRole('button', { name: 'Apply' }).click(),
  ]);
  expect(response.status()).toBe(200);
  await expect(filterRows(page)).toHaveCount(rowsBefore + 1);
}

test('saves tracker settings and keeps them after reloading', async ({ page }) => {
  await openSettings(page);
  await page.locator('#setting_tracker_id').selectOption({ index: 1 });
  await page.locator('#setting_assignment_tracker_id').selectOption({ index: 1 });
  await page.locator('#setting_auto_relation_1').check();
  const reviewTracker = await page.locator('#setting_tracker_id').inputValue();
  const assignmentTracker = await page.locator('#setting_assignment_tracker_id').inputValue();
  await saveSettings(page);

  await page.goto(settingsUrl);
  await expect(page.locator('#setting_tracker_id')).toHaveValue(reviewTracker);
  await expect(page.locator('#setting_assignment_tracker_id')).toHaveValue(assignmentTracker);
  await expect(page.locator('#setting_auto_relation_1')).toBeChecked();
});

test('shows the auto-assign settings and filter blocks only when activated', async ({ page }) => {
  await openSettings(page);
  await expect(page.locator('#cr_auto_assign_settings')).toBeHidden();

  await page.locator('#auto_assign_enabled').check();
  await expect(page.locator('#cr_auto_assign_settings')).toBeVisible();
  await expect(page.locator('#auto_assignment_filter_form')).toBeHidden();

  await page.locator('#auto_assign_filter_enabled').check();
  await expect(page.locator('#auto_assignment_filter_form')).toBeVisible();
  await page.locator('#auto_assign_filter_enabled').uncheck();
  await expect(page.locator('#auto_assignment_filter_form')).toBeHidden();

  await page.locator('#auto_assign_enabled').uncheck();
  await expect(page.locator('#cr_auto_assign_settings')).toBeHidden();
});

test('adds, edits and deletes filters and keeps the saved list after reloading', async ({ page }) => {
  await openSettings(page);
  await enableFilters(page);
  await addFilter(page, 'e2e-keep/.*');
  await addFilter(page, 'e2e-drop/.*', 'false');
  await addFilter(page, 'e2e-edit-me');
  await expect(filterExpressions(page)).toHaveText(['e2e-keep/.*', 'e2e-drop/.*', 'e2e-edit-me']);

  // The edit row opens and cancel restores the plain row.
  const third = page.locator('#auto_assign_tr_2');
  await third.getByRole('link', { name: 'Edit' }).click();
  await expect(page.locator('#auto_assign_edit_tr_2')).toBeVisible();
  await expect(third).toBeHidden();
  await page.locator('#auto_assign_edit_tr_2').getByRole('button', { name: 'Cancel' }).click();
  await expect(third).toBeVisible();
  await expect(page.locator('#auto_assign_edit_tr_2')).toBeHidden();

  // Editing redraws the table with the new expression.
  await third.getByRole('link', { name: 'Edit' }).click();
  await page.fill('#auto_assign_edit_filter_2_expression', 'e2e-edited');
  const [response] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/code_review_settings/edit_filter')),
    page.locator('#auto_assign_edit_tr_2').getByRole('button', { name: 'Apply' }).click(),
  ]);
  expect(response.status()).toBe(200);
  await expect(filterExpressions(page)).toHaveText(['e2e-keep/.*', 'e2e-drop/.*', 'e2e-edited']);

  // Deleting a row only removes it on the client until the form is saved.
  await page.locator('#auto_assign_tr_1').getByRole('link', { name: 'Delete' }).click();
  await expect(filterRows(page)).toHaveCount(2);
  await saveSettings(page);

  await page.goto(settingsUrl);
  await expect(page.locator('#auto_assign_filter_enabled')).toBeChecked();
  await expect(filterExpressions(page)).toHaveText(['e2e-keep/.*', 'e2e-edited']);
});

test('reorders filters and keeps the order after saving', async ({ page }) => {
  await openSettings(page);
  await enableFilters(page);
  await addFilter(page, 'e2e-first');
  await addFilter(page, 'e2e-second');
  await addFilter(page, 'e2e-third');

  const sort = async (rowIndex, direction) => {
    const [response] = await Promise.all([
      page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/code_review_settings/sort')),
      page.locator(`#auto_assign_tr_${rowIndex} a[data-cr-direction="${direction}"]`).click(),
    ]);
    expect(response.status()).toBe(200);
  };
  await sort(0, 'lowest');
  await expect(filterExpressions(page)).toHaveText(['e2e-second', 'e2e-third', 'e2e-first']);
  await sort(2, 'highest');
  await expect(filterExpressions(page)).toHaveText(['e2e-first', 'e2e-second', 'e2e-third']);
  await sort(1, 'lower');
  await expect(filterExpressions(page)).toHaveText(['e2e-first', 'e2e-third', 'e2e-second']);
  await sort(1, 'higher');
  await expect(filterExpressions(page)).toHaveText(['e2e-third', 'e2e-first', 'e2e-second']);
  await saveSettings(page);

  await page.goto(settingsUrl);
  await expect(filterExpressions(page)).toHaveText(['e2e-third', 'e2e-first', 'e2e-second']);
});

test('rejects an invalid filter regular expression with an alert', async ({ page }) => {
  await openSettings(page);
  await enableFilters(page);
  await page.locator('#auto_assignment_filter_form .contextual a.icon-add').click();
  await page.fill('#auto_assign_add_filter_expression', '(');

  const dialogs = [];
  page.once('dialog', (dialog) => { dialogs.push(dialog.message()); dialog.accept(); });
  await page.locator('#add_filter_form').getByRole('button', { name: 'Apply' }).click();
  await expect.poll(() => dialogs.length).toBe(1);
  expect(dialogs[0]).toContain('Invalid regular expression');
  await expect(filterRows(page)).toHaveCount(0);
});

const settingsRevisionUrl = (revision) => `/projects/${seed.settingsProject}/repository/${seed.settingsRepository}/revisions/${revision}`;
const settingsDiffUrl = () => `/projects/${seed.settingsProject}/repository/${seed.settingsRepository}/diff/${seed.path}?rev=${seed.revision}`;

// Turns auto-assign on with the reviewer as author and candidate, and a subject that
// carries the commit message so each scenario can find its own assignment.
// `filter` is { expression, accept } or null for no filters; `defaultAccept` is the
// "default" select of the filter block ('true' = assign, 'false' = drop).
async function configureAutoAssign(page, { filter, defaultAccept }) {
  await enableFilters(page);
  await page.locator('#auto_assign_author_id').selectOption({ label: `E2E ${seed.user.login}` });
  await page.getByRole('checkbox', { name: `E2E ${seed.user.login}` }).check();
  await page.fill('#auto_assign_subject', 'E2E auto $COMMENTS');
  if (filter) {
    await addFilter(page, filter.expression, filter.accept);
  }
  await page.locator('#auto_assign_accept_for_default').selectOption(defaultAccept);
  await saveSettings(page);
}

// Commits a unique file, lets the settings project import it and returns the unique name
// together with the assignment links the new revision's page shows.
async function importCommit(page) {
  const unique = `e2e-${Date.now()}`;
  const revision = commitFile(`auto/${unique}.txt`, `${unique}\n`, `auto ${unique}`);
  await fetchChangesets(page, seed.settingsProject);
  const response = await page.goto(settingsRevisionUrl(revision));
  expect(response.status(), 'the new commit must have been imported').toBe(200);
  return { unique, assignments: page.locator(`#code_review_assignments a[title*="${unique}"]`) };
}

test('creates a review assignment when a matching commit is imported', async ({ page }) => {
  await openSettings(page);
  await configureAutoAssign(page, { filter: { expression: 'auto/e2e-.*', accept: 'true' }, defaultAccept: 'false' });

  const { assignments } = await importCommit(page);
  await expect(assignments).toHaveCount(1);
});

const dropCases = [
  { name: 'creates no assignment when the commit is dropped by the filter', filter: { expression: 'auto/e2e-.*', accept: 'false' }, defaultAccept: 'true', expected: 0 },
  { name: 'follows the default action (assign) when there are no filters', filter: null, defaultAccept: 'true', expected: 1 },
  { name: 'follows the default action (drop) when there are no filters', filter: null, defaultAccept: 'false', expected: 0 },
];
for (const { name, filter, defaultAccept, expected } of dropCases) {
  test(name, async ({ page }) => {
    await openSettings(page);
    await configureAutoAssign(page, { filter, defaultAccept });

    const { assignments } = await importCommit(page);
    await expect(page.locator('#code_review_assignments')).toBeVisible();
    await expect(assignments).toHaveCount(expected);
  });
}

test('lets the reviewer pick the tracker in the review dialog when enabled', async ({ page }) => {
  await openSettings(page);
  await page.locator('#setting_tracker_in_review_dialog').check();
  await saveSettings(page);

  await openReviewForm(page, settingsDiffUrl());
  const tracker = page.locator('#issue_tracker_id');
  const options = await tracker.locator('option').allTextContents();
  const chosen = options[1];
  await page.fill('#review_subject', 'E2E tracker switch');
  const [response] = await Promise.all([
    page.waitForResponse((r) => new URL(r.url()).pathname.endsWith('/code_review/new') && r.url().includes('issue%5Btracker_id%5D=')),
    tracker.selectOption({ label: chosen }),
  ]);
  expect(response.status()).toBe(200);
  // The dialog is redrawn with the chosen tracker and the typed subject kept.
  await expect(page.locator('#issue_tracker_id option:checked')).toHaveText(chosen);
  await expect(page.locator('#review_subject')).toHaveValue('E2E tracker switch');

  const id = reviewIdFrom(await (await applyReview(page)).text(), 'E2E tracker switch');
  await openReview(page, id);
  await expect(page.locator(`#show_review_${id} h2`)).toContainText(chosen);
});
