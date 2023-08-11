import i18n from 'sveltekit-i18n';
import { dev } from '$app/environment';

import lang from './lang.json';

export const defaultLocale = 'en';

const API_URL = dev ? 'http://localhost:5173' : 'https://loaders-example.netlify.app';

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  log: {
    level: dev ? 'warn' : 'error',
  },
  cache: 0, // JUST FOR THE DEMO PURPOSE
  translations: {
    en: { lang },
    cs: { lang },
  },
  loaders: [
    /* ENGLISH */
    {
      locale: 'en',
      key: 'menu',
      /* File import */
      loader: async () => (await import('./en/menu.json')).default,
    },
    {
      locale: 'en',
      key: 'home',
      routes: ['', '/'],
      /* Fetch request */
      loader: () => fetch(`${API_URL}/?lang=en`).then((res) => res.json()),
    },
    {
      locale: 'en',
      key: 'about',
      /* RegExp route */
      routes: [/^\/about/],
      loader: async () => (await import('./en/about.json')).default,
    },
    {
      locale: 'en',
      key: 'more',
      /* Route with parameter */
      routes: ['/about?something=else'],
      loader: async () => (await import('./en/more.json')).default,
    },

    /* CZECH */
    {
      locale: 'cs',
      key: 'menu',
      /* File import */
      loader: async () => (await import('./cs/menu.json')).default,
    },
    {
      locale: 'cs',
      key: 'home',
      routes: ['', '/'],
      /* Fetch request */
      loader: () => fetch(`${API_URL}/?lang=cs`).then((res) => res.json()),
    },
    {
      locale: 'cs',
      key: 'about',
      /* RegExp route */
      routes: [/^\/about/],
      loader: async () => (await import('./cs/about.json')).default,
    },
    {
      locale: 'cs',
      key: 'more',
      /* Route with parameter */
      routes: ['/about?something=else'],
      loader: async () => (await import('./cs/more.json')).default,
    },
  ],
};

export const { t, loading, locales, locale, translations, loadTranslations, addTranslations, setLocale, setRoute } = new i18n(config);

loading.subscribe(($loading) => $loading && console.log('Loading translations...'));