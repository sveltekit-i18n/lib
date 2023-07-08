import i18n from 'sveltekit-i18n';
import translations from './translations';

/** @type {import('sveltekit-i18n').Config} */
const config = {
  initLocale: 'en',
  translations,
};

export const full = new i18n({
  ...config,
  preprocess: 'full', // default
});

export const preserveArrays = new i18n({
  ...config,
  preprocess: 'preserveArrays',
});

export const none = new i18n({
  ...config,
  preprocess: 'none',
});

export const custom = new i18n({
  ...config,
  preprocess: (input) => JSON.parse(JSON.stringify(input).replaceAll(':)', '🙂')),
});