import i18n from 'sveltekit-i18n';
import lang from './lang.json';

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  loaders: [
    {
      locale: 'en',
      key: 'lang',
      loader: () => lang,
    },
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    {
      locale: 'cs',
      key: 'lang',
      loader: () => lang,
    },
    {
      locale: 'cs',
      key: 'common',
      loader: async () => (await import('./cs/common.json')).default,
    },
    {
      locale: 'de',
      key: 'lang',
      loader: () => lang,
    },
    {
      locale: 'de',
      key: 'common',
      loader: async () => (await import('./de/common.json')).default,
    },
  ],
};

export default (initLocale) => new i18n({ ...config, initLocale });