import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { typegen } from '@sveltekit-i18n/typegen';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // Everything is prerendered, but the adapter is a server one: the pages are
    // served flat while anything added later can still render per request.
    sveltekit({ adapter: adapter() }),
    // Writes `src/i18n-schema.d.ts` from the config's own loaders, on
    // `vite build` and while `vite dev` runs.
    typegen({ config: 'src/lib/translations/index.ts', extractParams: { from: 'sveltekit-i18n' } }),
  ],
});
