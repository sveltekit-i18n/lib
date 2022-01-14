// eslint-disable-next-line import/extensions
import { defaultLocale, locales } from '$lib/translations';

const routeRegex = new RegExp(/^\/[^.]*([?#].*)?$/);

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ request, resolve }) => {
  const { pathname } = request.url;

  // If this request is a route request
  if (routeRegex.test(pathname)) {
    // Get defined locales
    const supportedLocales = locales.get();
    // Try to get locale from `pathname`.
    let locale = supportedLocales.find((l) => l === `${pathname.match(/[^/]+?(?=\/|$)/)}`.toLowerCase());

    // If route locale is not supported
    if (!locale) {
      // Get user preferred locale
      locale = `${`${request.headers['accept-language']}`.match(/[a-zA-Z]+?(?=-|_|,|;)/)}`.toLowerCase();

      // Set default locale if user preferred locale does not match
      if (!supportedLocales.includes(locale)) locale = defaultLocale;

      // 301 redirect to appropriate language mutation
      return ({ status: 301, headers: { location: `/${locale}${pathname}` } });
    }

    // Add html `lang` attribute
    const response = await resolve(request);
    return {
      ...response,
      body: `${response.body}`.replace(/<html.*>/, `<html lang="${locale}">`),
    };
  }

  return resolve(request);
};