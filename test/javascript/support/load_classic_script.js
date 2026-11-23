import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInThisContext } from 'node:vm';

// The plugin's scripts in the order the browser loads them
// (`_html_header.html.erb`). The plugin uses no jQuery (ADR 0005).
const DEFAULT_SCRIPTS = [
  'assets/javascripts/code_review_dialog.js',
  'assets/javascripts/code_review_loader.js',
  'assets/javascripts/code_review.js',
  'assets/javascripts/code_review_settings.js',
];

// Resolves after the DOM-ready work registered by the loaded scripts has run.
// The scripts register their page initialization on `DOMContentLoaded` (and run
// it immediately when `document.readyState` is already past `loading`, as in
// jsdom); yielding a macrotask lets those synchronous handlers finish.
export const flushReady = () => new Promise((resolve) => setTimeout(resolve, 0));

// Loads classic scripts (top-level declarations become globals, like a
// <script> tag) in the current context so tests can read and write the same
// state the browser would. `filename` keeps v8 coverage attributed to the file.
export function loadClassicScripts(scripts = DEFAULT_SCRIPTS) {
  for (const script of scripts) {
    const file = resolve(process.cwd(), script);
    const source = readFileSync(file, 'utf8');
    runInThisContext(source, { filename: file });
  }
}
