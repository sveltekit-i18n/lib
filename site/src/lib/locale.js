import { DEFAULT_LOCALE, LOCALES } from './docs.js';

export const PREFIXED = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

/** The error page renders with no route matched, so `params` carries nothing:
 *  the locale has to come from the path itself. */
export const localeOf = (pathname) => PREFIXED.find(
  (locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`),
) ?? DEFAULT_LOCALE;

export const prefixOf = (locale) => (locale === DEFAULT_LOCALE ? '' : `/${locale}`);
