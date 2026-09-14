import cs from './cs.json';
import de from './de.json';
import en from './en.json';
import { DEFAULT_LOCALE, LOCALES } from '$lib/docs.js';

/**
 * The config, not an instance: a module is evaluated once per process, so an
 * instance here would be shared by every page being prerendered.
 *
 * The shell strings are inline rather than loaded — the error page renders
 * without any `load` having run, so anything it needs has to be present from
 * construction. The namespaces below are route-scoped to prove the other half.
 */
/** A string route is an exact match, so a whole section needs a pattern while
 *  the landing page is the one route that can be spelled out. */
const NAMESPACES = [
  { key: 'docs', routes: [/^\/docs(\/|$)/] },
  { key: 'home', routes: ['/'] },
  { key: 'playground', routes: ['/playground'] },
];

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  fallbackLocale: DEFAULT_LOCALE,
  translations: { en, cs, de },
  loaders: NAMESPACES.flatMap(({ key, routes }) => LOCALES.map((locale) => ({
    locale,
    key,
    routes,
    loader: async () => (await import(`./${key}/${locale}.json`)).default,
  }))),
};
