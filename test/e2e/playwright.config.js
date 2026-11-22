// @ts-check
const path = require('path');
const { defineConfig, devices } = require('@playwright/test');

// test/e2e -> test -> plugin -> plugins -> Redmine root
const redmineRoot = path.resolve(__dirname, '..', '..', '..', '..');
const workDir = path.join(redmineRoot, 'tmp', 'e2e');
const baseURL = 'http://127.0.0.1:4500';

module.exports = defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  reporter: 'list',
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bin/rails server -e test -p 4500 -b 127.0.0.1 -P ${path.join(workDir, 'server.pid')}`,
    cwd: redmineRoot,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
    env: {
      RAILS_ENV: 'test',
      DB: 'sqlite3',
      DB_NAME: path.join(workDir, 'db.sqlite3'),
      REDMINE_LANG: 'en',
    },
  },
});
