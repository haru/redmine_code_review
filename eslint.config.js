// ESLint configuration for the plugin's JavaScript (flat config).
//
// Two blocks are inspected and nothing else: the classic scripts served to the
// browser (assets/javascripts/) and the Vitest unit tests (test/javascript/).
// `npm run lint` passes exactly these two directories to eslint, so files
// outside them (test/e2e/, app/views/, node_modules/, coverage-js/) are never
// scanned. Every rule is an error: the presets used here ship no `warn` rules
// (the jsdoc preset is the `-error` variant), and `--max-warnings 0` fails on
// any warning a future preset might introduce.
import fs from 'node:fs';
import path from 'node:path';
import { parse } from 'espree';
import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

// The unit tests are ESM but use the classic script's top-level names as bare
// globals (load_classic_script.js runs the asset script in the test context).
// Instead of hand-maintaining a duplicate list of names (DRY), collect them
// from the script itself: every top-level declaration of a classic script is
// visible by bare name. Only the file the test loader runs is scanned, so a
// name can never count as defined in the tests without being defined there
// (keep it in sync with DEFAULT_SCRIPTS in load_classic_script.js). The path
// is resolved from this file, not from the working directory. Failing loudly
// when the scan finds nothing keeps an empty registration from silently
// passing `no-undef` violations in the tests. The names are registered
// writable because the tests intentionally reassign them to set up state.
const loadedScript = path.join(import.meta.dirname, 'assets/javascripts/code_review.js');
const pluginGlobals = (() => {
  const program = parse(fs.readFileSync(loadedScript, 'utf8'), {
    ecmaVersion: 'latest',
    sourceType: 'script',
  });
  const names = new Set();
  for (const node of program.body) {
    if (node.type === 'VariableDeclaration') {
      node.declarations.forEach((declaration) => names.add(declaration.id.name));
    } else if (node.type === 'FunctionDeclaration' || node.type === 'ClassDeclaration') {
      names.add(node.id.name);
    }
  }
  if (names.size === 0) {
    throw new Error(`eslint.config.js: no top-level declaration found in ${loadedScript}`);
  }
  return Object.fromEntries(Array.from(names).map((name) => [name, 'writable']));
})();

const jqueryGlobals = { jQuery: 'readonly', $: 'readonly' };

// Rules shared by the assets and the tests.
const sharedRules = {
  ...js.configs.recommended.rules,
  'prefer-const': 'error',
  'eqeqeq': ['error', 'smart'],
  'curly': 'error',
  'no-implicit-coercion': 'error',
};

// Size and complexity limits are ratchets measured from the current code.
// They may only be lowered; raising one requires a new ADR recording why.
const assetsRules = {
  ...sharedRules,
  ...jsdoc.configs['flat/recommended-error'].rules,
  // The fixers are disabled because they would insert empty comment stubs,
  // which fake the documentation requirement; write real JSDoc instead.
  'jsdoc/require-jsdoc': [
    'error',
    {
      enableFixer: false,
      require: {
        FunctionDeclaration: true,
        FunctionExpression: true,
        MethodDefinition: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: true,
      },
    },
  ],
  'jsdoc/require-param': ['error', { enableFixer: false }],
  // `vars: "local"` keeps view-called top-level functions from being reported
  // as unused; locals and arguments inside functions are still checked.
  'no-unused-vars': ['error', { vars: 'local', argsIgnorePattern: '^_' }],
  // `no-var` is intentionally NOT used. Top-level `var` declarations are the
  // globals the ERB views reference and assign by bare name, and the unit
  // test harness re-runs this script per test to reset state (a top-level
  // `let`/`const` would throw "Identifier has already been declared" on the
  // second run). Only `var` nested inside functions, blocks and for-loops is
  // banned by the selector below.
  'no-restricted-syntax': ['error', ":not(Program) > VariableDeclaration[kind='var']"],
  // Ratchets (see above): may only be lowered.
  'max-lines': ['error', { max: 351, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 49, skipBlankLines: true, skipComments: true }],
  'complexity': ['error', { max: 14 }],
  'max-depth': ['error', { max: 4 }],
  'max-params': ['error', { max: 6 }],
  // `camelcase` is intentionally not adopted: several snake_case globals
  // (review_counts, add_form_title, ...) are referenced by name from the ERB
  // views, and the spec does not require a naming convention.
};

const testRules = {
  ...sharedRules,
  'no-var': 'error',
  // Ratchets (see above): may only be lowered. `max-lines-per-function` is
  // intentionally omitted: each test file is one describe() callback, so its
  // function length is just the file length and not a maintainability signal.
  'max-lines': ['error', { max: 270, skipBlankLines: true, skipComments: true }],
  'complexity': ['error', { max: 3 }],
  'max-depth': ['error', { max: 1 }],
  'max-params': ['error', { max: 3 }],
};

export default [
  {
    files: ['assets/javascripts/**/*.js'],
    languageOptions: {
      sourceType: 'script',
      globals: { ...globals.browser, ...jqueryGlobals },
    },
    plugins: { jsdoc },
    rules: assetsRules,
  },
  {
    files: ['test/javascript/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, ...jqueryGlobals, ...pluginGlobals },
    },
    rules: testRules,
  },
];
