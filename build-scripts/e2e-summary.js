#!/usr/bin/env node
// Prints the Playwright JSON report (argv[2]) as a Markdown table on stdout and
// exits non-zero when the report is missing, malformed, or records no executed test.
// CI appends stdout to $GITHUB_STEP_SUMMARY; run it locally the same way.

import fs from 'node:fs';

const file = process.argv[2];
if (!file) {
  throw new Error('usage: e2e-summary.js <e2e-results.json>');
}

const stats = JSON.parse(fs.readFileSync(file, 'utf8')).stats;
const fields = ['expected', 'unexpected', 'flaky', 'skipped', 'duration'];
for (const field of fields) {
  if (!stats || typeof stats[field] !== 'number') {
    throw new Error(`${file}: stats.${field} is missing or not a number`);
  }
}

const executed = stats.expected + stats.unexpected + stats.flaky;
console.log([
  '## E2E tests',
  '',
  '| Metric | Value |',
  '| --- | --- |',
  `| Executed | ${executed} |`,
  `| Passed | ${stats.expected} |`,
  `| Failed | ${stats.unexpected} |`,
  `| Flaky | ${stats.flaky} |`,
  `| Skipped | ${stats.skipped} |`,
  `| Duration | ${Math.round(stats.duration / 1000)} s |`
].join('\n'));

if (executed === 0) {
  throw new Error('no tests executed (expected + unexpected + flaky == 0)');
}
