export const DEFAULT_LOCALE = 'en';

export const LOCALES = ['en', 'cs', 'de'];

/**
 * The cookie wins, then the browser's `Accept-Language`, then the default.
 * Both inputs are visitor-controlled, so a value that is not one of ours is
 * dropped rather than passed on to the instance.
 */
export const negotiate = (cookie, acceptLanguage) => {
  if (LOCALES.includes(cookie)) return cookie;

  const preferred = `${acceptLanguage ?? ''}`
    .split(',')
    .map((part) => part.split(';')[0].trim().split('-')[0].toLowerCase())
    .find((tag) => LOCALES.includes(tag));

  return preferred ?? DEFAULT_LOCALE;
};
