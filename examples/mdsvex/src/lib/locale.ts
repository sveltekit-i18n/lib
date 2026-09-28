export const DEFAULT_LOCALE = 'en';

export const LOCALES = ['en', 'cs', 'de'] as const;

export type Locale = (typeof LOCALES)[number];

export const isLocale = (value: string | undefined): value is Locale => (
  (LOCALES as readonly (string | undefined)[]).includes(value)
);

/**
 * A URL that matched no route carries no `params`, so the locale has to come
 * off the path itself — that is what the error page renders with.
 */
export const localeOf = (pathname: string): Locale => {
  const [segment] = pathname.split('/').slice(1);

  return isLocale(segment) ? segment : DEFAULT_LOCALE;
};

/** The path without its locale segment, which a link puts under another locale. */
export const routeOf = (pathname: string): string => pathname.replace(/^\/[^/]+/, '') || '/';

/** `route` under `locale`'s segment: `/cs/about`, and `/cs` for `/`. */
export const pathOf = (route: string, locale: string): string => `/${locale}${route === '/' ? '' : route}`;

/**
 * The crawler starts at `/` and follows links. It cannot invent `/cs` or `/de`,
 * so every prerenderable page under `[lang]` names its own entries — that is
 * the difference between a build that ships three languages and one that
 * silently ships one.
 */
export const entries = () => LOCALES.map((lang) => ({ lang }));
