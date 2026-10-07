import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { typegen } from '@sveltekit-i18n/typegen';
import { mdsvex } from 'mdsvex';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      // `.svx` has to be a page extension as well, or the router never looks at it.
      extensions: ['.svelte', '.svx'],
      // `smartypants` rewrites quotes in the Markdown body, and a `{i18n.t('key')}`
      // inside a heading is Markdown body — it would reach the compiler with curly
      // quotes and fail to parse.
      preprocess: mdsvex({ extensions: ['.svx'], smartypants: false }),
      adapter: adapter(),
    }),
    // Writes `src/i18n-schema.d.ts` from the config's own loaders, on
    // `vite build` and while `vite dev` runs.
    typegen({ config: 'src/lib/translations/index.ts', extractParams: { from: 'sveltekit-i18n' } }),
  ],
});
