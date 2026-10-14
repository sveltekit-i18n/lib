import adapter from '@sveltejs/adapter-node';
import { sveltekit } from '@sveltejs/kit/vite';
import { typegen } from '@sveltekit-i18n/typegen';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [
    // Every page renders per request: its locale depends on the host it is
    // requested at, which a prerendered file cannot. No `paths.origin`
    // either, so each request keeps its own host.
    sveltekit({ adapter: adapter() }),
    // Writes `src/i18n-schema.d.ts` from the config's own loaders, on
    // `vite build` and while `vite dev` runs.
    typegen({ config: 'src/lib/translations/index.ts', extractParams: { from: 'sveltekit-i18n' } }),
  ],
  // The development hosts in `src/lib/translations/index.ts` name this port,
  // so the dev server takes no other.
  server: { port: 5173, strictPort: true },
});
