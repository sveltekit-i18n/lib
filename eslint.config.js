import js from '@eslint/js';
import stylistic from '@stylistic/eslint-plugin';
import { importX } from 'eslint-plugin-import-x';
import svelte from 'eslint-plugin-svelte';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  // Build outputs, plus `site/` — a standalone SvelteKit project with its own
  // toolchain and its own ESLint config.
  { ignores: ['**/dist/', '/lib/', '**/build/', '**/.svelte-kit/', 'site/'] },
  js.configs.recommended,
  tseslint.configs.recommendedTypeChecked,
  // Self-scoped to `**/*.svelte`, which only the examples carry here.
  ...svelte.configs.recommended,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      // base types translation values and loader payloads as `any`; this
      // package only passes them through, so the unsafe-* family would restate
      // that decision on every line. Async correctness rules
      // (no-floating-promises, no-misused-promises, require-await) stay on.
      '@typescript-eslint/no-unused-vars': ['error', { ignoreRestSiblings: true }],
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-argument': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-call': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
    },
  },
  {
    plugins: { 'import-x': importX },
    rules: {
      // base and parser-curly are the only runtime dependencies; any other
      // bare import reachable from src/ is a bug.
      'import-x/no-extraneous-dependencies': ['error', {
        devDependencies: [
          '**/*.config.ts',
          '**/*.config.js',
          'tests/**',
        ],
      }],
    },
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
    // The examples are standalone SvelteKit apps, each with its own toolchain
    // and its own dependencies, so they are linted for the shared formatting
    // contract alone: untyped, and without the dependency rule the root
    // package's own source is held to.
    files: ['examples/**'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: { ...globals.browser, ...globals.node },
    },
    rules: {
      'import-x/no-extraneous-dependencies': 'off',
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

      // No example sets `paths.base`, and none is type-checked, so `resolve()`
      // would hand back the href it was given — at the price of an import in
      // every link of code whose subject is translation, not routing.
      'svelte/no-navigation-without-resolve': 'off',
    },
  },
  {
    // Plain JS (this config, the tsup config) sits outside tsconfig's program
    // (no allowJs) — lint it untyped, with node globals so no-undef doesn't
    // fire on console/process in one-off scripts.
    files: ['**/*.js', '**/*.mjs', '**/*.cjs'],
    extends: [tseslint.configs.disableTypeChecked],
    languageOptions: {
      globals: globals.node,
    },
  },
);
