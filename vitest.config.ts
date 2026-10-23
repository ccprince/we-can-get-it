import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Tests go through the engine's public seam only (ADR 0003 decision 5), so
    // they need neither a DOM nor the page's plugins. The harness is a
    // throw-away instrument with its own config and its own entry point, and
    // this include pattern is what keeps the test run from picking it up
    // (ADR 0009 decision 5).
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
