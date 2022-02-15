import i18n from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';

import type { Config } from '@sveltekit-i18n/parser-icu';

import lang from './lang.json';

const config: Config<{/* Translation payload props */}> = {
  initLocale: 'en',

  parser: parser(),

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
};

export const { t, loading, locales, locale, translations } = new i18n(config);

loading.subscribe(async ($loading) => {
  if ($loading) {
    console.log('Loading translations...');
    await loading.toPromise();
    console.log('Updated translations', translations.get());
  }
});