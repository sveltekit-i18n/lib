import { locales, loadTranslations, translations, defaultLocale } from '$lib/translations';

/** @type {import('@sveltejs/kit').ServerLoad} */
export const load = async ({ url, cookies, request }) => {
  const { pathname } = url;

  // Try to get the locale from cookie
  let locale = (cookies.get('lang') || '').toLowerCase();

	// Get user preferred locale
	if (!locale) {
		const acceptLanguageHeader = request.headers.get('accept-language');
		let match = acceptLanguageHeader.match(/^[a-zA-Z]+(?=[-_])/);

		// If no match, try to get the locale without the region
		if (!match) {
			match = acceptLanguageHeader.match(/^[a-zA-Z]+/);
		}

		if (match) {
			locale = match[0].toLowerCase();
		}
	}

  // Get defined locales
  const supportedLocales = locales.get().map((l) => l.toLowerCase());

  // Use default locale if current locale is not supported
  if (!supportedLocales.includes(locale)) {
    locale = defaultLocale;
  }

  await loadTranslations(locale, pathname); // keep this just before the `return`

  return {
    i18n: { locale, route: pathname },
    translations: translations.get(), // `translations` on server contain all translations loaded by different clients
  };
};
