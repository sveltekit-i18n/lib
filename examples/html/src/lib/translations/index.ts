import html from '@sveltekit-i18n/extension-html';
import type { Config } from 'sveltekit-i18n';
import { defineI18n } from 'sveltekit-i18n/kit';

import cs from './cs.json';
import de from './de.json';
import en from './en.json';

export const LOCALES = ['en', 'cs', 'de'] as const;

// `as const` keeps the locales literal, so `locale` and `setLocale()` complete
// them; `satisfies Config` alone would widen them to `string`.
export const config = {
  // A negotiation candidate after the cookie and `Accept-Language`, so a
  // visitor who matches neither still gets a page in a language.
  initLocale: 'en',
  // The shell strings are inline: the error page renders without any `load`
  // having run.
  translations: { en, cs, de },
  loaders: [{
    locale: LOCALES,
    namespace: 'home',
    routes: ['/'],
    loader: async ({ locale }) => (await import(`./home/${locale}.json`)).default,
  }],
  // Adds the `T` component, which renders the markup of a message as elements.
  // What a message could not render is reported here: in the server's log on
  // a server render, in the browser's console as the page hydrates and on
  // each render after.
  extensions: [html({
    onReport: ({ code, locale, key, message }) => console.warn(`[${code}] ${locale} ${key}: ${message}`),
  })],
} as const satisfies Config;

/**
 * One instance per request on the server, one per tab in the browser — never a
 * module-level instance, which every request the server handles would share.
 * `use()` and `get()` hand out each, `T` included.
 */
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
