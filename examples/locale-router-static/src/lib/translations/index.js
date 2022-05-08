import i18n from 'sveltekit-i18n';
import en from './en';
import de from './de';
import cs from './cs';
import lang from './lang';

/** @type {import('sveltekit-i18n').Config} */
const config = {
  translations: {
    en: {
      ...en,
      lang,
    },
    de: {
      ...de,
      lang,
    },
    cs: {
      ...cs,
      lang,
    },
  },
};

export const defaultLocale = 'en';

export const { t, locale, locales, loading, loadTranslations, translations } = new i18n(config);
