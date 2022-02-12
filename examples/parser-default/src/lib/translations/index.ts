import i18n from '@sveltekit-i18n/base';
import parser, { Config } from '@sveltekit-i18n/parser-default';
// Or you could use `sveltekit-i18n`

import lang from './lang.json';
import * as customModifiers from './modifiers';
import type { CurrencyProps } from './modifiers';

const config: Config<
{}, /* Translation payload props */
CurrencyProps /* Modifier props */
> = {
  initLocale: 'en',

  parser: parser({
    customModifiers,
  }),
  // Replace `parser` with `parserOptions` in case of `sveltekit-i18n`

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