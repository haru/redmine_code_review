import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'jsdom',
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
