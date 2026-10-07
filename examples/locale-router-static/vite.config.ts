import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { typegen } from '@sveltekit-i18n/typegen';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // No fallback: every page is written out, and an unknown URL is answered by
    // whatever serves the files. locale-router-advanced takes the other option.
    sveltekit({ adapter: adapter() }),
    // Writes `src/i18n-schema.d.ts` from the config's own loaders, on
    // `vite build` and while `vite dev` runs.
    typegen({ config: 'src/lib/translations/index.ts', extractParams: { from: 'sveltekit-i18n' } }),
  ],
});
