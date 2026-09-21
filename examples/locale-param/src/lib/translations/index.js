import { LOCALES } from '$lib/locale.js';
import cs from './cs.json';
import de from './de.json';
import en from './en.json';

/**
 * The config, not an instance: this module is evaluated once per process, so
 * an instance here would be shared by every request the server handles.
 */
export const NAMESPACES = [
  { namespace: 'home', routes: ['/'] },
  { namespace: 'about', routes: ['/about'] },
];

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  translations: { en, cs, de },
  loaders: NAMESPACES.flatMap(({ namespace, routes }) => LOCALES.map((locale) => ({
    locale,
    namespace,
    routes,
    loader: async () => (await import(`./${namespace}/${locale}.json`)).default,
  }))),
};
