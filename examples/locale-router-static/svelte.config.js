/* eslint-disable */

import adapter from '@sveltejs/adapter-static';
import lang from './src/lib/translations/lang.js';

const supportedLocales = Object.keys(lang);

/** @type {import('@sveltejs/kit').Config} */
export default {
  kit: {
    // hydrate the `body` element in src/app.html
    target: 'body',
    adapter: adapter(),

    // NOTE: REMOVE `prerender` IF YOU DO NOT USE `@sveltejs/adapter-static`
    prerender: {
      // You can replace `['*']` to generate pages for non-locale routes with default locale (e.g. `['/', '/about']` – use `hooks.js` to configure your default locale)
      entries: supportedLocales.reduce((acc, locale) => [...acc, `/${locale}`, `/${locale}/401`, `/${locale}/403`, `/${locale}/404`, `/${locale}/500`], ['*']),
    },
  }
}
