import type { Config } from 'sveltekit-i18n';
import { defineI18n, translatePathnames } from 'sveltekit-i18n/kit';

import cs from './cs.json';
import de from './de.json';
import en from './en.json';

export const LOCALES = ['en', 'cs', 'de'] as const;

/**
 * Loader `routes` match the canonical pathname, so each namespace names its
 * route once, whatever pathname each locale serves it at.
 */
export const NAMESPACES = [
  { namespace: 'home', routes: ['/'] },
  { namespace: 'about', routes: ['/about'] },
  // The home page lists the products by name, so it loads them too.
  { namespace: 'products', routes: ['/', /^\/products\/[^/]+$/] },
];

// `as const` keeps the locales literal, so `setLocale()`, `locale` and
// `localizePath()` complete them; `satisfies Config` alone would widen them to
// `string`.
export const config = {
  translations: { en, cs, de },
  loaders: NAMESPACES.map(({ namespace, routes }) => ({
    locale: LOCALES,
    namespace,
    routes,
    loader: async ({ locale, namespace }) => (await import(`./${namespace}/${locale}.json`)).default,
  })),
} as const satisfies Config;

/**
 * One instance per request on the server, one per tab in the browser — never a
 * module-level instance, which every request the server handles would share.
 *
 * English is served without a prefix, Czech and German under their own, and
 * each page at a pathname of its own per locale. The catch-all gives every
 * other pathname a locale too, so the error page of `/cs/nic` is Czech.
 */
export const { handle, load, use, get, reroute, delocalize, localizePath } = defineI18n(config, {
  pathnames: translatePathnames({
    '/about': { en: '/about', cs: '/cs/o-nas', de: '/de/ueber-uns' },
    '/products/[id]': { en: '/products/[id]', cs: '/cs/produkty/[id]', de: '/de/produkte/[id]' },
    '/[...rest]': { en: '/[...rest]', cs: '/cs/[...rest]', de: '/de/[...rest]' },
  }),
});
