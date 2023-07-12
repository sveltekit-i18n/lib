import { loadTranslations, translations, defaultLocale } from '$lib/translations';

/** @type {import('@sveltejs/kit').ServerLoad} */
export const load = async ({ url, cookies }) => {
  const { pathname, searchParams } = url;

  const initLocale = searchParams.get('lang') || cookies.get('locale') || defaultLocale;

  cookies.set('locale', initLocale);

  await loadTranslations(initLocale, pathname); // keep this just before the `return`

  return {
    i18n: { locale: initLocale, route: pathname },
    translations: translations.get(),
  };
};