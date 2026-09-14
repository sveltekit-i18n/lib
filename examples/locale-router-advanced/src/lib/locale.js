export const DEFAULT_LOCALE = 'en';

export const LOCALES = ['en', 'cs', 'de'];

/** The locales that appear in the URL. The default one deliberately does not. */
export const PREFIXED = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

export const prefixOf = (locale) => (locale === DEFAULT_LOCALE ? '' : `/${locale}`);

export const localeOf = (pathname) =>
  PREFIXED.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))
  ?? DEFAULT_LOCALE;

/** The path without its locale prefix, which is what the loaders match on. */
export const routeOf = (pathname, locale) =>
  pathname.replace(prefixOf(locale), '') || '/';
