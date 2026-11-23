import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
    // crLoad inserts response fragments with createContextualFragment; in a
    // browser the <script> elements of the fragment execute on insertion, and
    // jsdom only does the same with scripts enabled.
    environmentOptions: {
      jsdom: { runScripts: 'dangerously' },
    },
    restoreMocks: true,
    unstubGlobals: true,
    include: ['test/javascript/**/*.test.js'],
    coverage: {
      provider: 'v8',
      include: ['assets/javascripts/**/*.js'],
      reportsDirectory: 'coverage-js',
      reporter: ['text', 'html', 'lcov', 'json-summary'],
      thresholds: {
        lines: 95,
        perFile: false
      }
    }
  }
});
