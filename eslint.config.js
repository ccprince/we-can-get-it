import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';

/**
 * The globals ADR 0009 decision 2 denies the engine: no I/O, no DOM, no clock,
 * no ambient randomness. The ADR's own reason for a lint rule is that this is
 * "exactly the constraint that erodes quietly".
 */
const deniedEngineGlobals = [
  { name: 'fetch', message: 'The engine does no I/O (ADR 0009 decision 2). Content is handed to it.' },
  { name: 'XMLHttpRequest', message: 'The engine does no I/O (ADR 0009 decision 2).' },
  { name: 'WebSocket', message: 'The engine does no I/O (ADR 0009 decision 2).' },
  { name: 'Date', message: 'The engine never reads the clock (ADR 0009 decision 3). Time is the day index.' },
  { name: 'performance', message: 'The engine never reads the clock (ADR 0009 decision 3).' },
  { name: 'document', message: 'The engine has no UI (ADR 0003 decision 1).' },
  { name: 'window', message: 'The engine has no UI (ADR 0003 decision 1).' },
  { name: 'navigator', message: 'The engine has no UI (ADR 0003 decision 1).' },
  { name: 'localStorage', message: 'The engine has no UI and no I/O (ADR 0009 decision 2). A save is a seed and a command sequence, held by the page.' },
  { name: 'sessionStorage', message: 'The engine has no UI and no I/O (ADR 0009 decision 2).' },
  { name: 'process', message: 'The engine does no I/O (ADR 0009 decision 2).' },
  { name: 'require', message: 'The engine does no I/O (ADR 0009 decision 2).' },
  { name: '__dirname', message: 'The engine does no I/O (ADR 0009 decision 2).' },
];

const deniedEngineImports = [
  'fs', 'node:fs', 'fs/promises', 'node:fs/promises',
  'path', 'node:path',
  'os', 'node:os',
  'http', 'node:http', 'https', 'node:https',
  'crypto', 'node:crypto',
  'react', 'react-dom',
].map((name) => ({
  name,
  message:
    'The engine is a plain TypeScript library with no I/O and no UI (ADR 0009 decision 2). The page and the harness do the reading; the engine is handed the data.',
}));

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  {
    files: ['src/engine/**/*.ts'],
    rules: {
      'no-restricted-globals': ['error', ...deniedEngineGlobals],
      'no-restricted-imports': ['error', { paths: deniedEngineImports }],
      'no-restricted-properties': [
        'error',
        {
          object: 'Math',
          property: 'random',
          message:
            'Randomness comes from the seeded generator created in startCampaign and threaded explicitly (ADR 0009 decision 3).',
        },
      ],
    },
  },
);
