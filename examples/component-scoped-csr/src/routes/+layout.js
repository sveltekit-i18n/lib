import { loadTranslations } from '$lib/translations';

/** @type {import('@sveltejs/kit').Load} */
export const load = async ({ url }) => {
  const { pathname } = url;

  const initLocale = 'en'; // get from cookie / user session etc...

  await loadTranslations(initLocale, pathname); // keep this just before the `return`

  return {};
};