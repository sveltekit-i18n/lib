import { I18n } from 'sveltekit-i18n';

/**
 * The component's own lexicon, kept beside the component rather than in the
 * application's translations. Nothing outside this directory names these keys.
 */
export const LOCALES = ['en', 'cs', 'de'];

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  fallbackLocale: 'en',
  loaders: LOCALES.map((locale) => ({
    locale,
    key: 'rates',
    loader: async () => (await import(`./translations/${locale}.json`)).default,
  })),
};

/**
 * A component has no `load` of its own, so it exports this instead and the
 * parent page calls it. A throwaway instance per request, the same way the
 * application builds one — the result is the payload the component is handed.
 */
export const snapshot = async (locale) => {
  const i18n = new I18n(config);

  await i18n.loadTranslations(locale);

  return i18n.snapshot();
};
