import type { Config, Modifier } from 'sveltekit-i18n';
import { defineI18n } from 'sveltekit-i18n/kit';

import ar from './ar.json';
import cs from './cs.json';
import de from './de.json';
import en from './en.json';

// Arabic is written right to left: `%dir%` in `app.html` and `use()` follow it.
export const LOCALES = ['en', 'cs', 'de', 'ar'] as const;

/**
 * The shell strings are inline rather than loaded — the error page renders
 * without any `load` having run, so whatever it needs has to be there from
 * construction. The namespaces below are route-scoped to show the other half.
 */
export const NAMESPACES = [
  { namespace: 'home', routes: ['/'] },
  { namespace: 'about', routes: ['/about'] },
];

/**
 * `{{count:plural; one:…; few:…; default:…;}}` picks the option named by the
 * locale's plural category (`zero`, `one`, `two`, `few`, `many`), and the
 * fallback for `other`. The format's own comparisons match the whole number,
 * while Arabic picks `few` and `many` by the last two digits (`103` is `few`).
 */
const plural: Modifier.T = ({ value, options, locale }) => {
  const category = new Intl.PluralRules(locale).select(Number(value));

  return options.find(({ key }) => key === category)?.value;
};

// `as const` keeps the locales literal, so `setLocale()` and `locale` complete
// them; `satisfies Config` alone would widen them to `string`.
export const config = {
  // A negotiation candidate after the cookie and `Accept-Language`, so a
  // visitor who matches neither still gets a page in a language.
  initLocale: 'en',
  parserOptions: { customModifiers: { plural } },
  translations: { en, cs, de, ar },
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
