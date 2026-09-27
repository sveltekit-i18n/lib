import { browser } from '$app/environment';
import { I18n } from 'sveltekit-i18n';

import { DEFAULT_LOCALE } from '$lib/locale.js';
import { config } from '$lib/translations';

// Assigned in the browser only — on the server this module-level binding would
// be the shared state the per-request instance exists to avoid.
let client;

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ data, url }) => {
  // `data` is null when no route matched: the error page renders through this
  // load too.
  let i18n = client;

  if (!i18n) {
    i18n = new I18n(config);

    // The server's snapshot is handed over rather than seeded: `hydrate()`
    // records the namespaces it names, so the loaders behind it do not run a
    // second time in the browser. It lands on top of the config's own
    // translations, which the payload, a subset of the server's, leaves alone.
    if (data) i18n.hydrate({ translations: data.translations });

    if (browser) client = i18n;
  }

  const locale = data?.locale ?? DEFAULT_LOCALE;

  await i18n.loadTranslations(locale, url.pathname);

  return { i18n, locale };
};
