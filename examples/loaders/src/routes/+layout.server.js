import { locales, loadTranslations, translations, defaultLocale } from '$lib/translations';

/** @type {import('@sveltejs/kit').ServerLoad} */
export const load = async ({ url, cookies, request }) => {
  const { pathname, search } = url;

  // Try to get the locale from cookie
  let locale = (cookies.get('lang') || '').toLowerCase();

  // Get user preferred locale
  if (!locale) {
    locale = `${`${request.headers.get('accept-language')}`.match(/[a-zA-Z]+?(?=-|_|,|;)/)}`.toLowerCase();
  }

  // Get defined locales
  const supportedLocales = locales.get().map((l) => l.toLowerCase());

  // Use default locale if current locale is not supported
  if (!supportedLocales.includes(locale)) {
    locale = defaultLocale;
  }

  const route = `${pathname}${search}`;

  await loadTranslations(locale, route); // keep this just before the `return`

  return {
    i18n: { locale, route },
    translations: translations.get(), // `translations` on server contain all translations loaded by different clients
  };
};