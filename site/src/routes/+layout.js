import { browser } from '$app/environment';
import { I18n } from 'sveltekit-i18n';

import { localeOf, prefixOf, routeOf } from '$lib/locale.js';
import { config } from '$lib/translations';

// Assigned in the browser only — on the server this module-level binding
// would be the shared state we are avoiding.
let client;

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ data, url }) => {
  // `data` is null when no route matched: the error page renders through this
  // load too, and on a static host that is every unknown URL.
  const i18n = client ?? new I18n({
    ...config,
    translations: { ...config.translations, ...data?.translations },
  });

  if (browser) client = i18n;

  const locale = localeOf(url.pathname);

  await i18n.loadTranslations(locale, routeOf(url.pathname, locale));

  return { i18n, locale, prefix: prefixOf(locale) };
};
