import stores from '@sveltekit-i18n/extension-stores';
import type { Config } from 'sveltekit-i18n';
import { defineI18n } from 'sveltekit-i18n/kit';

import cs from './cs.json';
import de from './de.json';
import en from './en.json';

export const LOCALES = ['en', 'cs', 'de'] as const;

// `as const` keeps the locales literal, so `$locale` and `setLocale()` complete
// them; `satisfies Config` alone would widen them to `string`.
export const config = {
  // A negotiation candidate after the cookie and `Accept-Language`, so a
  // visitor who matches neither still gets a page in a language.
  initLocale: 'en',
  // Loaded next to the active locale, so a missing key falls back to it and
  // `$l('en', …)` has English to read.
  fallbackLocale: 'en',
  // The shell strings are inline: the error page renders without any `load`
  // having run.
  translations: { en, cs, de },
  loaders: [{
    locale: LOCALES,
    namespace: 'home',
    routes: ['/'],
    loader: async ({ locale }) => (await import(`./home/${locale}.json`)).default,
  }],
  // Turns the surface `data.i18n`, `use()` and `get()` hand out into stores.
  // The wiring keeps driving the instance underneath.
  extensions: [stores],
} as const satisfies Config;

/**
 * One instance per request on the server, one per tab in the browser. The
 * stores belong to that instance, so they are taken from `use()` and `get()`
 * inside components — never destructured from a module-level instance, which
 * every request the server handles would share.
 */
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
