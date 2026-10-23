import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Rules are tested through the engine's public seam only (ADR 0003
    // decision 5). The two page files test that a read model renders and that a
    // command reaches the engine, and ask for a DOM in their own docblock.
    //
    // Nothing outside `tests/` is picked up, which is what keeps the harness —
    // a throw-away instrument with its own config and its own entry point (#8,
    // ADR 0009 decision 5) — out of the test run.
    include: ['tests/**/*.test.ts', 'tests/**/*.test.tsx'],
  },
});
