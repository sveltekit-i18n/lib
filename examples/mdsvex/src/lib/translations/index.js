import { LOCALES } from '$lib/locale.js';
import cs from './cs.json';
import de from './de.json';
import en from './en.json';

/**
 * The config, not an instance: this module is evaluated once per process, so
 * one instance here would be shared by every page being prerendered.
 *
 * `guide` is route-scoped like any other namespace — a `.svx` page is an
 * ordinary Svelte component by the time the router sees it, so there is
 * nothing special to do for it here.
 */
export const NAMESPACES = [
  { namespace: 'home', routes: ['/'] },
  { namespace: 'guide', routes: ['/guide'] },
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
