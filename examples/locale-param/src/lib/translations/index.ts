import type { Config } from 'sveltekit-i18n';
import { defineI18n } from 'sveltekit-i18n/kit';

import cs from './cs.json';
import de from './de.json';
import en from './en.json';

export const DEFAULT_LOCALE = 'en';

export const LOCALES = ['en', 'cs', 'de'] as const;

export const NAMESPACES = [
  { namespace: 'home', routes: ['/'] },
  { namespace: 'about', routes: ['/about'] },
];

// `as const` keeps the locales literal, so `setLocale()` and `locale` complete
// them; `satisfies Config` alone would widen them to `string`.
export const config = {
  initLocale: DEFAULT_LOCALE,
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
 * `?lang=` is the visitor's choice, and the bare URL is the default locale's
 * page rather than whatever `Accept-Language` asks for: the same address should
 * not render differently per visitor. A value outside the configured set
 * matches nothing, so `Accept-Language` decides instead, and the default
 * locale (`initLocale`) when that matches nothing either.
 */
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.url.searchParams.get('lang') ?? DEFAULT_LOCALE,
});
