import i18n from 'sveltekit-i18n';
import translations from './translations';

export const config = ({
  initLocale: 'en', // or you can set it later changing `$locale` value (see `__layout.svelte`)
});

export const { t, locales, locale, addTranslations } = new i18n(config);
addTranslations(translations);