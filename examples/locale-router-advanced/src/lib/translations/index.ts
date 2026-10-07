import type { Config } from 'sveltekit-i18n';
import { defineI18n } from 'sveltekit-i18n/kit';

import { LOCALES, localeOf, pathOf } from '#lib/locale.js';
import cs from './cs.json';
import de from './de.json';
import en from './en.json';

/**
 * Loaders match the whole pathname, prefix included, so each namespace lists
 * its route under every locale: `/about`, `/cs/about`, `/de/about`.
 */
export const NAMESPACES = [
  { namespace: 'home', routes: LOCALES.map((locale) => pathOf('/', locale)) },
  { namespace: 'about', routes: LOCALES.map((locale) => pathOf('/about', locale)) },
];

// `as const` keeps the locales literal, so `setLocale()` and `locale` complete
// them; `satisfies Config` alone would widen them to `string`.
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
 * One instance per page being prerendered, one per tab in the browser — never a
 * module-level instance, which every page of the prerender would share.
 *
 * The locale comes off the path, not off the route params: the fallback shell
 * renders for URLs that matched no route at all. An unprefixed path is the
 * default locale's, whatever `Accept-Language` or the browser asks for.
 */
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => localeOf(event.url.pathname),
});
