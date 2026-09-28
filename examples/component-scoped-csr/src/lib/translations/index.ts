import type { Config } from 'sveltekit-i18n';
import { defineI18n } from 'sveltekit-i18n/kit';

import cs from './cs.json';
import de from './de.json';
import en from './en.json';

export const LOCALES = ['en', 'cs', 'de'] as const;

/**
 * The shell strings are inline rather than loaded — the error page renders
 * without any `load` having run, so whatever it needs has to be there from
 * construction. The namespaces below are route-scoped to show the other half.
 */
export const NAMESPACES = [
  { namespace: 'home', routes: ['/'] },
  { namespace: 'about', routes: ['/about'] },
];

// `as const` keeps the locales literal, so `setLocale()` and `locale` complete
// them; `satisfies Config` alone would widen them to `string`.
export const config = {
  // A negotiation candidate after the cookie and `Accept-Language`, so a
  // visitor who matches neither still gets a page in a language.
  initLocale: 'en',
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
 * The `lang` cookie the language switcher writes wins over `Accept-Language`.
 */
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
