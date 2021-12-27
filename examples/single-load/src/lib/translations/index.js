import i18n from 'sveltekit-i18n';
import translations from './translations';

export const config = ({
  initLocale: 'en',
});

export const { t, l, locales, locale, addTranslations, loadConfig } = new i18n();
addTranslations(translations);