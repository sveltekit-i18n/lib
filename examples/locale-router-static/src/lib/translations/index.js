import i18n from 'sveltekit-i18n';
import lang from './lang';

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
  ],
};

export const supportedLocales = Object.keys(lang);

export const defaultLocale = supportedLocales[0];

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);

loading.subscribe(($loading) => $loading && console.log('Loading translations...'));