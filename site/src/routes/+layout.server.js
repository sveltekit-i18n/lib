import { I18n } from 'sveltekit-i18n';

import { localeOf, routeOf } from '$lib/locale.js';
import { config } from '$lib/translations';

export const prerender = true;

/** @type {import('./$types').LayoutServerLoad} */
export const load = async ({ url }) => {
  const locale = localeOf(url.pathname);
  const i18n = new I18n(config);

  await i18n.loadTranslations(locale, routeOf(url.pathname, locale));

  return { translations: i18n.snapshot() };
};
