import { redirect } from '@sveltejs/kit';

import { DEFAULT_LOCALE } from '$lib/locale.js';

/**
 * `/` is not a page of its own — every page lives under a locale. The redirect
 * is prerendered too, so a static host serves it without a server.
 *
 * @type {import('./$types').PageLoad}
 */
export const load = () => {
  redirect(307, `/${DEFAULT_LOCALE}`);
};
