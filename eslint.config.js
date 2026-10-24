import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import globals from 'globals';
import prettier from 'eslint-plugin-prettier';

/**
 * The globals ADR 0009 decision 2 denies the engine: no I/O, no DOM, no clock,
 * no ambient randomness. The ADR's own reason for a lint rule is that this is
 * "exactly the constraint that erodes quietly".
 */
const deniedEngineGlobals = [
  {
    name: 'fetch',
    message: 'The engine does no I/O (ADR 0009 decision 2). Content is handed to it.',
  },
  { name: 'XMLHttpRequest', message: 'The engine does no I/O (ADR 0009 decision 2).' },
  { name: 'WebSocket', message: 'The engine does no I/O (ADR 0009 decision 2).' },
  {
    name: 'Date',
    message: 'The engine never reads the clock (ADR 0009 decision 3). Time is the day index.',
  },
  { name: 'performance', message: 'The engine never reads the clock (ADR 0009 decision 3).' },
  { name: 'document', message: 'The engine has no UI (ADR 0003 decision 1).' },
  { name: 'window', message: 'The engine has no UI (ADR 0003 decision 1).' },
  { name: 'navigator', message: 'The engine has no UI (ADR 0003 decision 1).' },
  {
    name: 'localStorage',
    message:
      'The engine has no UI and no I/O (ADR 0009 decision 2). A save is a seed and a ' +
      'command sequence, held by the page.',
  },
  { name: 'sessionStorage', message: 'The engine has no UI and no I/O (ADR 0009 decision 2).' },
  { name: 'process', message: 'The engine does no I/O (ADR 0009 decision 2).' },
  { name: 'require', message: 'The engine does no I/O (ADR 0009 decision 2).' },
  { name: '__dirname', message: 'The engine does no I/O (ADR 0009 decision 2).' },
];

const deniedEngineImports = [
  'fs',
  'node:fs',
  'fs/promises',
  'node:fs/promises',
  'path',
  'node:path',
  'os',
  'node:os',
  'http',
  'node:http',
  'https',
  'node:https',
  'crypto',
  'node:crypto',
  'react',
  'react-dom',
].map((name) => ({
  name,
  message:
    'The engine is a plain TypeScript library with no I/O and no UI (ADR 0009 decision 2). ' +
    'The page and the harness do the reading; the engine is handed the data.',
}));

/**
 * The day index is the one engine value ADR 0005 decision 3 says the player
 * never reads: "'day 214' is an engine artifact, not something a patron says."
 * The page is handed both a read model and the campaign, and `day` is reachable
 * on `TodayView`, `DigestView` and `Campaign` alike, so the denial is on the
 * reading rather than on any one of them. The page renders the date; the harness
 * (#8), which is not the page, is what the index is kept in the read model for.
 *
 * Reviewed by hand once and found breached in the first commit of the page
 * (`day {read.today.day}`), which is the shape of constraint ADR 0009 decision 2
 * already gave a lint rule rather than a standard.
 */
const deniedPageReadings = [
  {
    selector: 'MemberExpression[property.name="day"]',
    message:
      'The player reads the date, never the day index (ADR 0005 decision 3). ' +
      'Render `date`; the index is for the harness.',
  },
  {
    selector: 'ObjectPattern > Property[key.name="day"]',
    message:
      'The player reads the date, never the day index (ADR 0005 decision 3). ' +
      'Destructure `date`; the index is for the harness.',
  },
];

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'coverage'] },
  js.configs.recommended,
  tseslint.configs.recommended,
  {
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
  },
  /**
   * Formatting is a check, not a judgement call (#31). Prettier owns the layout
   * of everything it can reach; `max-len` covers the one thing it cannot, which
   * is a line too long because of a string or a comment rather than because of
   * its structure. Prettier leaves those alone by design, and they are a third
   * of the long lines `/code-review` found by eye in #10.
   *
   * `max-len` carries ESLint's "formatting rules are being moved out of core"
   * notice. Removal would fail `eslint .` on an unknown rule, loudly and at
   * upgrade time, which is cheaper than a third dependency for one rule.
   */
  {
    plugins: { prettier },
    rules: {
      'prettier/prettier': 'error',
      'max-len': ['error', { code: 100, ignoreUrls: true }],
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
            'Randomness comes from the seeded generator created in startCampaign and ' +
            'threaded explicitly (ADR 0009 decision 3).',
        },
      ],
    },
  },
  {
    files: ['src/page/**/*.ts', 'src/page/**/*.tsx'],
    rules: {
      'no-restricted-syntax': ['error', ...deniedPageReadings],
    },
  },
);
