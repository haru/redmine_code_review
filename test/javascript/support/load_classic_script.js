import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInThisContext } from 'node:vm';

const DEFAULT_SCRIPTS = [
  'node_modules/jquery/dist/jquery.js',
  'node_modules/jquery-ui/dist/jquery-ui.js',
  'assets/javascripts/code_review.js'
];

// Resolves after the ready handlers (`$(fn)`) registered by the loaded scripts have run.
export const flushReady = () => new Promise((resolve) => setTimeout(resolve, 0));

// Loads classic scripts (top-level declarations become globals, like a <script> tag)
// in the current context so that `code_review.js` stays untouched while tests can
// read and write its global state. `filename` keeps v8 coverage attributed to the file.
export function loadClassicScripts(scripts = DEFAULT_SCRIPTS) {
  for (const script of scripts) {
    const file = resolve(process.cwd(), script);
    const source = readFileSync(file, 'utf8');
    runInThisContext(source, { filename: file });
  }
  $.fx.off = true;
}
