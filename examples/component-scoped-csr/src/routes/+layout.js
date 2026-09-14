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
  const i18n = client ?? new I18n({
    ...config,
    // The server's snapshot arrives as ordinary translations, so the loaders
    // behind it do not run a second time in the browser.
    translations: { ...config.translations, ...data?.translations },
  });

  if (browser) client = i18n;

  await i18n.loadTranslations(data?.locale ?? DEFAULT_LOCALE, url.pathname);

  return { i18n };
};
