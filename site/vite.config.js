import adapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

import { DEFAULT_LOCALE, LOCALES, PAGES } from './src/lib/docs.js';

const paths = ['', '/examples', '/playground', '/docs', ...Object.keys(PAGES).map((slug) => `/docs/${slug}`)];

// Explicit entries rather than crawling: a prefixed locale is reachable only
// through the language switcher, and a crawler that misses one link silently
// drops a whole language from the build.
const entries = LOCALES.flatMap((locale) => {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

  return paths.map((path) => `${prefix}${path}` || '/');
});

export default defineConfig({
  plugins: [
    sveltekit({
      adapter: adapter({ fallback: '404.html' }),
      prerender: { entries },
    }),
  ],
  // The documentation lives outside this package: `docs/` is the single source
  // of truth and the site renders it rather than keeping a copy.
  server: { fs: { allow: ['..'] } },
});
