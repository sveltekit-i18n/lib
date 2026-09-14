import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import { DEFAULT_LOCALE, LOCALES } from './src/lib/locale.js';

const PATHS = ['', '/about'];

// Explicit entries rather than crawling: a prefixed locale is reachable only
// through the language switcher, and a crawler that misses one link silently
// drops a whole language from the build.
const entries = LOCALES.flatMap((locale) => {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

  return PATHS.map((path) => `${prefix}${path}` || '/');
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    // The fallback shell answers every URL that was not written out, which is
    // what lets the error page be this application's rather than the host's.
    adapter: adapter({ fallback: '404.html' }),
    prerender: { entries },
  },
};

export default config;
