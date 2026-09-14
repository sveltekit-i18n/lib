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
