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

    // The server's snapshot arrives as ordinary translations, so the loaders
    // behind it do not run a second time in the browser. It is applied on top
    // of the config rather than assigned to it: the payload is a subset of
    // what the server held, so the config's own translations survive.
    i18n.addTranslations(data?.translations);

    if (browser) client = i18n;
  }

  // The instance owns the locale once it exists: the server negotiates the
  // first request and nothing after it, so a cookie that never persisted —
  // a cross-site iframe, blocked third-party cookies — cannot reset the tab.
  await i18n.loadTranslations(i18n.locale ?? data?.locale ?? DEFAULT_LOCALE, url.pathname);

  return { i18n };
};
