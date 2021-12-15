import i18n from 'sveltekit-i18n';

export const config = ({
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    {
      locale: 'cs',
      key: 'common',
      loader: async () => (await import('./cs/home.json')).default,
    },
  ],
});

export const { t, translation, translations, locale, locales, loading, loadConfig } = new i18n(config);