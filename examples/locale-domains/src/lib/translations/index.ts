import type { Config } from 'sveltekit-i18n';
import { defineI18n, localeDomains, translatePathnames } from 'sveltekit-i18n/kit';

import cs from './cs.json';
import de from './de.json';
import en from './en.json';

export const LOCALES = ['en', 'de', 'cs'] as const;

/**
 * Loader `routes` match the canonical pathname, so each namespace names its
 * route once, whatever pathname and host each locale serves it at.
 */
export const NAMESPACES = [
  { namespace: 'home', routes: ['/'] },
  { namespace: 'about', routes: ['/about'] },
];

// `as const` keeps the locales literal, so `setLocale()`, `locale` and
// `localizeHref()` complete them; `satisfies Config` alone would widen them to
// `string`.
export const config = {
  translations: { en, de, cs },
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
 * English and Czech each own their host's pathnames, so neither takes a
 * prefix; German shares its host with English and takes `/de`. The catch-all
 * gives every other pathname a locale too, so the error page of
 * `example.com/de/nic` is German.
 */
export const { handle, load, use, get, reroute, delocalize, localizeHref } = defineI18n(config, {
  pathnames: translatePathnames({
    '/about': { en: '/about', de: '/de/ueber-uns', cs: '/o-nas' },
    '/[...rest]': { en: '/[...rest]', de: '/de/[...rest]', cs: '/[...rest]' },
  }),
  // `example.com` serves English and German, `example.cz` Czech. While
  // `vite dev` runs, `localhost` stands for the first and `cz.localhost` for
  // the second: browsers resolve every `*.localhost` name to this machine, and
  // Vite serves it without `server.allowedHosts`. Each map is a call of its
  // own, so it reads as a map rather than a union of two, and completes the
  // config's locales.
  domains: import.meta.env.DEV
    ? localeDomains({ 'http://localhost:5173': ['en', 'de'], 'http://cz.localhost:5173': 'cs' })
    : localeDomains({ 'https://example.com': ['en', 'de'], 'https://example.cz': 'cs' }),
});
