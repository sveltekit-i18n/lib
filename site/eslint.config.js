import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';

/**
 * What SvelteKit runs outside the browser: the adapter and the Vite plugin on
 * the build host, the hook and the server loads on the server, the test runner
 * and its specs on neither.
 */
const SERVER = [
  'eslint.config.js',
  'svelte.config.js',
  'vite.config.js',
  'vitest.config.js',
  'tests/**',
  'src/hooks.server.js',
  'src/**/+*.server.js',
];

export default [
  // `.svelte-kit/` is SvelteKit's generated manifest and type tree; `build/` is
  // the static adapter's output. Both are regenerated, never edited.
  { ignores: ['.svelte-kit/', 'build/'] },
  js.configs.recommended,
  ...svelte.configs.recommended,
  {
    ignores: SERVER,
    languageOptions: { globals: globals.browser },
  },
  {
    files: SERVER,
    languageOptions: { globals: globals.node },
  },
  {
    // The formatting contract shared across the sveltekit-i18n repos.
    plugins: { '@stylistic': stylistic },
    rules: {
      '@stylistic/comma-dangle': ['error', 'always-multiline'],
      '@stylistic/eol-last': 'error',
      '@stylistic/indent': ['error', 2],
      '@stylistic/no-multiple-empty-lines': ['error', { max: 1 }],
      '@stylistic/no-trailing-spaces': 'error',
      '@stylistic/object-curly-spacing': ['error', 'always'],
      '@stylistic/quotes': ['error', 'single', { avoidEscape: true }],
      '@stylistic/semi': ['error', 'always'],
    },
  },
  {
    files: ['**/*.svelte'],
    rules: {
      // The core rule reads a component's script as if it began at column 0, so
      // it sees neither a top-level statement's indentation nor the markup. The
      // Svelte one carries the same two spaces over both.
      '@stylistic/indent': 'off',
      'svelte/indent': ['error', { indent: 2 }],

      // Every `{@html}` here renders markup this site produced: Shiki on the
      // server, `src/lib/highlight.js` in the browser. What a visitor types
      // reaches the page only through the second, whose escaping the site's
      // suite pins. A rule cannot tell those apart, and the one that matters is
      // asserted rather than assumed.
      'svelte/no-at-html-tags': 'off',

      // `resolve()` reads a typed route id and prepends `paths.base`. This site
      // sets no base and carries no types, so the call would do nothing, while
      // the rule flags every href built from a constant — the outbound GitHub,
      // npm and StackBlitz links included.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
];
