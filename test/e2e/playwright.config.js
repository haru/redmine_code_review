const path = require('path');
const { defineConfig, devices } = require('@playwright/test');
const { redmineRoot, workDir, port } = require('./support/env');

const baseURL = `http://127.0.0.1:${port}`;

// The Rails env (RAILS_ENV, DB, DB_NAME, REDMINE_LANG) is inherited from run.sh.
module.exports = defineConfig({
  testDir: 'tests',
  outputDir: 'test-results',
  reporter: 'list',
  // All tests share one SQLite DB.
  workers: 1,
  fullyParallel: false,
  use: {
    baseURL,
    screenshot: 'only-on-failure',
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: {
    command: `bin/rails server -e test -p ${port} -b 127.0.0.1 -P ${path.join(workDir, 'server.pid')}`,
    cwd: redmineRoot,
    url: baseURL,
    reuseExistingServer: false,
    timeout: 120 * 1000,
    stdout: 'pipe',
    stderr: 'pipe',
  },
});
