// ESLint configuration for the plugin's JavaScript (flat config).
//
// Two blocks are inspected and nothing else: the classic scripts served to the
// browser (assets/javascripts/) and the Vitest unit tests (test/javascript/).
// `npm run lint` passes exactly these two directories to eslint, so files
// outside them (test/e2e/, app/views/, node_modules/, coverage-js/) are never
// scanned. Every rule is an error; running with `--max-warnings 0` additionally
// fails on any warning a future preset might introduce.
import fs from 'node:fs';
import js from '@eslint/js';
import jsdoc from 'eslint-plugin-jsdoc';
import globals from 'globals';

// The unit tests are ESM but use the classic script's top-level names as bare
// globals (load_classic_script.js runs the asset files in the test context).
// Instead of hand-maintaining a duplicate list of names (DRY), collect them
// from the asset scripts themselves: a declaration at column 0 of a classic
// script is a top-level `var` or `function` and therefore a global. Failing
// loudly when the scan finds nothing keeps an empty registration from
// silently passing `no-undef` violations in the tests. They are registered
// writable because the tests intentionally reassign them to set up state.
const pluginGlobals = (() => {
  const files = fs.globSync('assets/javascripts/**/*.js');
  if (files.length === 0) {
    throw new Error('eslint.config.js: no files matched assets/javascripts/**/*.js');
  }
  const names = new Set();
  for (const file of files) {
    const source = fs.readFileSync(file, 'utf8');
    for (const match of source.matchAll(/^(?:var|function)\s+([A-Za-z_$][A-Za-z0-9_$]*)/gm)) {
      names.add(match[1]);
    }
  }
  if (names.size === 0) {
    throw new Error('eslint.config.js: no top-level var/function declaration found in assets/javascripts/**/*.js');
  }
  return Object.fromEntries(Array.from(names).map((name) => [name, 'writable']));
})();

// Promote every `warn` of the recommended presets to `error` in bulk. Adding a
// rule name here per preset update would be error-prone; converting whatever
// the preset ships keeps the "all violations are errors" policy automatically
// when a preset gains rules.
const promoteWarningsToErrors = (rules) =>
  Object.fromEntries(
    Object.entries(rules).map(([name, setting]) => {
      if (setting === 'warn') {
        return [name, 'error'];
      }
      if (Array.isArray(setting) && setting[0] === 'warn') {
        return [name, ['error', ...setting.slice(1)]];
      }
      return [name, setting];
    }),
  );

// Size and complexity limits are ratchets measured from the current code.
// They may only be lowered; raising one requires a new ADR recording why.
const assetsRules = {
  ...promoteWarningsToErrors(js.configs.recommended.rules),
  ...promoteWarningsToErrors(jsdoc.configs['flat/recommended'].rules),
  'jsdoc/require-jsdoc': [
    'error',
    {
      require: {
        FunctionDeclaration: true,
        FunctionExpression: true,
        MethodDefinition: true,
        ClassDeclaration: true,
        ArrowFunctionExpression: true,
      },
    },
  ],
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
  'prefer-const': 'error',
  'eqeqeq': ['error', 'smart'],
  'curly': 'error',
  'no-implicit-coercion': 'error',
  // Ratchets (see above): may only be lowered.
  'max-lines': ['error', { max: 360, skipBlankLines: true, skipComments: true }],
  'max-lines-per-function': ['error', { max: 60, skipBlankLines: true, skipComments: true }],
  'complexity': ['error', { max: 14 }],
  'max-depth': ['error', { max: 4 }],
  'max-params': ['error', { max: 6 }],
  // `camelcase` is intentionally not adopted: several snake_case globals
  // (review_counts, add_form_title, ...) are referenced by name from the ERB
  // views, and the spec does not require a naming convention.
};

const testRules = {
  ...promoteWarningsToErrors(js.configs.recommended.rules),
  'no-var': 'error',
  'prefer-const': 'error',
  'eqeqeq': ['error', 'smart'],
  'curly': 'error',
  'no-implicit-coercion': 'error',
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
      globals: { ...globals.browser, jQuery: 'readonly', $: 'readonly' },
    },
    plugins: { jsdoc },
    rules: assetsRules,
  },
  {
    files: ['test/javascript/**/*.js'],
    languageOptions: {
      sourceType: 'module',
      globals: { ...globals.browser, ...globals.node, jQuery: 'readonly', $: 'readonly', ...pluginGlobals },
    },
    rules: testRules,
  },
];
