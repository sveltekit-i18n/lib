import { I18n } from 'sveltekit-i18n';

import { localeOf } from '$lib/locale.js';
import { config } from '$lib/translations';

/** @type {import('./$types').LayoutServerLoad} */
export const load = async ({ url }) => {
  // One instance per request. A module-level singleton here would leak one
  // visitor's locale into another visitor's page.
  const i18n = new I18n(config);
  const locale = localeOf(url);

  await i18n.loadTranslations(locale, url.pathname);

  return { locale, translations: i18n.snapshot() };
};
