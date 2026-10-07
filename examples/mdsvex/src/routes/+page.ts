import { redirect } from '@sveltejs/kit';

import { DEFAULT_LOCALE } from '#lib/locale.js';

import type { PageLoad } from './$types';

/**
 * `/` is not a page of its own — every page lives under a locale. The redirect
 * is prerendered too, so a static host serves it without a server.
 */
export const load: PageLoad = () => {
  redirect(307, `/${DEFAULT_LOCALE}`);
};
