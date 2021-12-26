import i18n from 'sveltekit-i18n';
import lang from './lang.json';
import * as customModifiers from './modifiers';

export const config = ({
  initLocale: 'en',
  loaders: [
    {
      locale: 'en',
      key: 'lang',
      loader: () => lang,
    },
    {
      locale: 'en',
      key: 'content',
      loader: async () => (await import('./en/content.json')).default,
    },
    {
      locale: 'cs',
      key: 'lang',
      loader: () => lang,
    },
    {
      locale: 'cs',
      key: 'content',
      loader: async () => (await import('./cs/content.json')).default,
    },
  ],
  customModifiers,
});

export const { t, locales, locale } = new i18n(config);