import { loadTranslations } from '$lib/translations';

/** @type {import('@sveltejs/kit').Load} */
export const load = async () => {

  const initialLocale = 'en'; // get from cookie / url / fetch from server...

  await loadTranslations(initialLocale); // keep this just before the `return`

  return {};
};