import type { Config } from 'sveltekit-i18n';
import { defineI18n } from 'sveltekit-i18n/kit';

import { LOCALES, localeOf, pathOf } from '$lib/locale';
import cs from './cs.json';
import de from './de.json';
import en from './en.json';

/**
 * Loaders match the whole pathname, locale segment included, so each
 * namespace lists its route under every locale: `/en/guide`, `/cs/guide`, …
 *
 * `guide` is route-scoped like any other namespace — a `.svx` page is an
 * ordinary Svelte component by the time the router sees it, so there is
 * nothing special to do for it here.
 */
export const NAMESPACES = [
  { namespace: 'home', routes: LOCALES.map((locale) => pathOf('/', locale)) },
  { namespace: 'guide', routes: LOCALES.map((locale) => pathOf('/guide', locale)) },
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
 * The locale comes off the path rather than `params`, which a URL that matched
 * no route has none of: that is what the error page renders with.
 */
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => localeOf(event.url.pathname),
});
