import adapter from '@sveltejs/adapter-static';
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

import { DEFAULT_LOCALE, LOCALES, PAGES } from './src/lib/docs.js';

const paths = ['', '/examples', '/playground', '/docs', ...Object.keys(PAGES).map((slug) => `/docs/${slug}`)];

// Explicit entries rather than crawling: a prefixed locale is reachable only
// through the language switcher, and a crawler that misses one link silently
// drops a whole language from the build.
const entries = LOCALES.flatMap((locale) => {
  const prefix = locale === DEFAULT_LOCALE ? '' : `/${locale}`;

  return paths.map((path) => `${prefix}${path}` || '/');
});

/** @type {import('@sveltejs/kit').Config} */
const config = {
  preprocess: vitePreprocess(),
  kit: {
    adapter: adapter({ fallback: '404.html' }),
    prerender: { entries },
  },
};

export default config;
