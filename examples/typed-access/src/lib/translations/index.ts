import typedAccess from '@sveltekit-i18n/extension-typed-access';
import type { Config } from 'sveltekit-i18n';
import { defineI18n } from 'sveltekit-i18n/kit';

import cs from './cs.json';
import de from './de.json';
import en from './en.json';

export const LOCALES = ['en', 'cs', 'de'] as const;

// `as const` keeps the locales literal, so `locale` and `setLocale()` complete
// them, and keeps the extension a tuple the instance's type is folded through;
// `satisfies Config` alone would widen both.
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
  // Hangs the keys off `t` as members, `t.home.title()` beside
  // `t('home.title')`, typed from the schema typegen generates.
  extensions: [typedAccess],
} as const satisfies Config;

/**
 * One instance per request on the server, one per tab in the browser — never a
 * module-level instance, which every request the server handles would share.
 * `use()` and `get()` hand out what the extension makes of each.
 */
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
