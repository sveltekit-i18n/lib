export const DEFAULT_LOCALE = 'en';

export const LOCALES = ['en', 'cs', 'de'];

/**
 * `?lang=` is visitor-controlled, so a value that is not one of ours is
 * dropped rather than passed on to the instance.
 */
export const localeOf = (url) => {
  const requested = url.searchParams.get('lang');

  return LOCALES.includes(requested) ? requested : DEFAULT_LOCALE;
};
