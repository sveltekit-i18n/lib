import i18n from 'sveltekit-i18n';
import lang from './lang.json';

/** @type {import('sveltekit-i18n').Config} */
const config = {
  translations: {
    en: { lang },
    de: { lang },
    cs: { lang },
  },
  loaders: [
    {
      locale: 'en',
      key: 'menu',
      loader: async () => (await import('./en/menu.json')).default,
    },
    {
      locale: 'en',
      key: 'home',
      routes: ['', '/'],
      loader: async () => (await import('./en/home.json')).default,
    },
    {
      locale: 'en',
      key: 'about',
      routes: ['/about'],
      loader: async () => (await import('./en/about.json')).default,
    },
    {
      locale: 'de',
      key: 'menu',
      loader: async () => (await import('./de/menu.json')).default,
    },
    {
      locale: 'en',
      key: 'error',
      routes: ['error'],
      loader: async () => (await import('./en/error.json')).default,
    },
    {
      locale: 'de',
      key: 'home',
      routes: ['', '/'],
      loader: async () => (await import('./de/home.json')).default,
    },
    {
      locale: 'de',
      key: 'about',
      routes: ['/about'],
      loader: async () => (await import('./de/about.json')).default,
    },
    {
      locale: 'cs',
      key: 'menu',
      loader: async () => (await import('./cs/menu.json')).default,
    },
    {
      locale: 'de',
      key: 'error',
      routes: ['error'],
      loader: async () => (await import('./de/error.json')).default,
    },
    {
      locale: 'cs',
      key: 'home',
      routes: ['', '/'],
      loader: async () => (await import('./cs/home.json')).default,
    },
    {
      locale: 'cs',
      key: 'about',
      routes: ['/about'],
      loader: async () => (await import('./cs/about.json')).default,
    },
    {
      locale: 'cs',
      key: 'error',
      routes: ['error'],
      loader: async () => (await import('./cs/error.json')).default,
    },
  ],
};

export const defaultLocale = 'en';

export const { t, locale, locales, loading, loadTranslations, translations } = new i18n(config);

// Translations logs
loading.subscribe(async ($loading) => {
  if ($loading) {
    console.log('Loading translations...');

    await loading.toPromise();
    console.log('Updated translations', translations.get());
  }
});