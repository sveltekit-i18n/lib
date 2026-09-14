import { browser } from '$app/environment';
import { I18n } from 'sveltekit-i18n';

import { DEFAULT_LOCALE, LOCALES, routeOf } from '$lib/locale.js';
import { config } from '$lib/translations';

export const prerender = true;

// Assigned in the browser only — on the server this module-level binding would
// be shared by every page being prerendered.
let client;

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ url }) => {
  const i18n = client ?? new I18n(config);

  if (browser) client = i18n;

  const [segment] = url.pathname.split('/').slice(1);
  const locale = LOCALES.includes(segment) ? segment : DEFAULT_LOCALE;

  await i18n.loadTranslations(locale, routeOf(url.pathname));

  return { i18n, locale };
};
