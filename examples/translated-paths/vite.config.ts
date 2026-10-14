import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { typegen } from '@sveltekit-i18n/typegen';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    sveltekit({
      // The redirect of `/cs/about` to `/cs/o-nas` runs in `handle`, and the
      // product pages render per request, so this example needs a server.
      adapter: adapter(),
      // The `hreflang` alternates name this origin, in the prerendered pages
      // too; a deployment states its own. An app served at several domains
      // sets none.
      paths: { origin: 'https://example.com' },
      prerender: {
        // Each translated pathname of a prerendered page is a file of its
        // own: SvelteKit answers one the crawler missed with the canonical
        // file, in English. The switcher links to all of them; the entries
        // keep that from resting on a link.
        entries: ['/', '/cs', '/de', '/about', '/cs/o-nas', '/de/ueber-uns'],
      },
    }),
    // Writes `src/i18n-schema.d.ts` from the config's own loaders, on
    // `vite build` and while `vite dev` runs.
    typegen({ config: 'src/lib/translations/index.ts', extractParams: { from: 'sveltekit-i18n' } }),
  ],
});
