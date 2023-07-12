import { loadTranslations, translations } from '$lib/translations';

/** @type {import('@sveltejs/kit').ServerLoad} */
export const load = async ({ url }) => {
  const { pathname } = url;

  const initLocale = 'en'; // get from cookie / user session etc...

  await loadTranslations(initLocale, pathname); // keep this just before the `return`

  return {
    i18n: { locale: initLocale, route: pathname },
    translations: translations.get(), // `translations` on server contain all translations loaded by different clients
  };
};