// JavaScript, typed through JSDoc: `svelte.config.js` imports this module, and
// Node loads that config without a bundler to compile TypeScript for it.

export const DEFAULT_LOCALE = 'en';

export const LOCALES = /** @type {const} */ (['en', 'cs', 'de']);

/** @typedef {(typeof LOCALES)[number]} Locale */

/** The locales that appear in the URL. The default one deliberately does not. */
export const PREFIXED = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

/** @type {(value: string) => value is Locale} */
export const isPrefixed = (value) => /** @type {readonly string[]} */ (PREFIXED).includes(value);

/** @param {string} locale */
export const prefixOf = (locale) => (locale === DEFAULT_LOCALE ? '' : `/${locale}`);

/**
 * @param {string} pathname
 * @returns {Locale}
 */
export const localeOf = (pathname) =>
  PREFIXED.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))
  ?? DEFAULT_LOCALE;

/**
 * The path without its locale prefix, which a link puts under another locale.
 *
 * @param {string} pathname
 * @param {string} locale
 */
export const routeOf = (pathname, locale) =>
  pathname.replace(prefixOf(locale), '') || '/';

/**
 * `route` under `locale`'s prefix: `/cs/about`, and `/about` in the default locale.
 *
 * @param {string} route
 * @param {string} locale
 */
export const pathOf = (route, locale) =>
  `${prefixOf(locale)}${route === '/' ? '' : route}` || '/';
