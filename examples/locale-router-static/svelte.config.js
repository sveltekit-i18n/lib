/* eslint-disable */

import adapter from '@sveltejs/adapter-static';
import lang from './src/lib/translations/lang.js';

const supportedLocales = Object.keys(lang);

/** @type {import('@sveltejs/kit').Config} */
export default {
  kit: {
    adapter: adapter(),
    prerender: {
      // NOTE: You can modify your exported error pages here.
      entries: supportedLocales.reduce((acc, locale) => [...acc, `/${locale}`, `/${locale}/401`, `/${locale}/403`, `/${locale}/404`, `/${locale}/500`], ['*']),
    },
  }
}
