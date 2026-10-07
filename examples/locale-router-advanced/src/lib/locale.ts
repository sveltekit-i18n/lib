export const DEFAULT_LOCALE = 'en';

export const LOCALES = ['en', 'cs', 'de'] as const;

export type Locale = (typeof LOCALES)[number];

/** The locales that appear in the URL. The default one deliberately does not. */
export const PREFIXED = LOCALES.filter((locale) => locale !== DEFAULT_LOCALE);

export const isPrefixed = (value: string): value is Locale => (PREFIXED as readonly string[]).includes(value);

export const prefixOf = (locale: string): string => (locale === DEFAULT_LOCALE ? '' : `/${locale}`);

export const localeOf = (pathname: string): Locale =>
  PREFIXED.find((locale) => pathname === `/${locale}` || pathname.startsWith(`/${locale}/`))
  ?? DEFAULT_LOCALE;

/** The path without its locale prefix, which a link puts under another locale. */
export const routeOf = (pathname: string, locale: string): string =>
  pathname.replace(prefixOf(locale), '') || '/';

/** `route` under `locale`'s prefix: `/cs/about`, and `/about` in the default locale. */
export const pathOf = (route: string, locale: string): string =>
  `${prefixOf(locale)}${route === '/' ? '' : route}` || '/';
