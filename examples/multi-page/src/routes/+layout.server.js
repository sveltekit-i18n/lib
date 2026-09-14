import { I18n } from 'sveltekit-i18n';

import { config } from '$lib/translations';

/** @type {import('./$types').LayoutServerLoad} */
export const load = async ({ url, locals }) => {
  // One instance per request. A module-level singleton here would leak one
  // visitor's locale into another visitor's page.
  const i18n = new I18n(config);

  await i18n.loadTranslations(locals.locale, url.pathname);

  return { locale: locals.locale, translations: i18n.snapshot() };
};
