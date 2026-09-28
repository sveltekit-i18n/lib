import { defineI18n } from 'sveltekit-i18n/kit';

import cs from './cs.json';
import de from './de.json';
import en from './en.json';
import { DEFAULT_LOCALE, LOCALES } from '$lib/docs.js';
import { PREFIXED, localeOf, prefixOf } from '$lib/locale.js';

/**
 * The shell strings are inline rather than loaded — the error page renders
 * without any `load` having run, so anything it needs has to be present from
 * construction. The namespaces below are route-scoped to prove the other half.
 */
/** Routes match the whole pathname, locale prefix included. A string route is
 *  an exact match, so a whole section needs a pattern. */
const NAMESPACES = [
  { namespace: 'docs', routes: [new RegExp(`^(?:/(?:${PREFIXED.join('|')}))?/docs(?:/|$)`)] },
  { namespace: 'examples', routes: LOCALES.map((locale) => `${prefixOf(locale)}/examples`) },
  { namespace: 'home', routes: LOCALES.map((locale) => prefixOf(locale) || '/') },
  { namespace: 'playground', routes: LOCALES.map((locale) => `${prefixOf(locale)}/playground`) },
];

/** @type {import('sveltekit-i18n').Config} */
const config = {
  fallbackLocale: DEFAULT_LOCALE,
  translations: { en, cs, de },
  loaders: NAMESPACES.map(({ namespace, routes }) => ({
    locale: LOCALES,
    namespace,
    routes,
    loader: async ({ locale }) => (await import(`./${namespace}/${locale}.json`)).default,
  })),
};

/** The locale is the URL's, the unprefixed pages included, so a prerendered
 *  page hands its locale to a client navigation. */
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: ({ url }) => localeOf(url.pathname),
});
