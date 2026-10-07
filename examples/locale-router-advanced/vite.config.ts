import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { typegen } from '@sveltekit-i18n/typegen';
import { defineConfig } from 'vite';

import { DEFAULT_LOCALE, LOCALES } from './src/lib/locale.ts';

const PATHS = ['', '/about'] as const;

// Explicit entries rather than crawling: a prefixed locale is reachable only
// through the language switcher, and a crawler that misses one link silently
// drops a whole language from the build. Literal throughout, so every entry
// types as the path Kit takes.
const entries = LOCALES.flatMap((locale) => {
  const prefix = locale === DEFAULT_LOCALE ? '' : (`/${locale}` as const);

  return PATHS.map((path) => (`${prefix}${path}` as const) || '/');
});

export default defineConfig({
  plugins: [
    sveltekit({
      // The fallback shell answers every URL that was not written out, which is
      // what lets the error page be this application's rather than the host's.
      adapter: adapter({ fallback: '404.html' }),
      prerender: { entries },
    }),
    // Writes `src/i18n-schema.d.ts` from the config's own loaders, on
    // `vite build` and while `vite dev` runs.
    typegen({ config: 'src/lib/translations/index.ts', extractParams: { from: 'sveltekit-i18n' } }),
  ],
});
