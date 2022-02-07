import i18n from 'sveltekit-i18n';
// Or you could use @sveltekit-i18n/base and @sveltekit-i18n/parser-default

import lang from './lang.json';
import * as customModifiers from './modifiers';

/** @type {import('sveltekit-i18n').Config} */
const config = {
  initLocale: 'en',
  translations: {
    en: { lang },
    cs: { lang },
  },
  loaders: [
    {
      locale: 'en',
      key: 'content',
      loader: async () => (await import('./en/content.json')).default,
    },
    {
      locale: 'cs',
      key: 'content',
      loader: async () => (await import('./cs/content.json')).default,
    },
  ],
  parserOptions: {
    customModifiers,
  },
};

export const { t, loading, locales, locale, translations } = new i18n(config);

loading.subscribe(async ($loading) => {
  if ($loading) {
    console.log('Loading translations...');
    await loading.toPromise();
    console.log('Updated translations', translations.get());
  }
});