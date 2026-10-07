import { snapshot } from '#lib/rates/translations.js';

import type { PageServerLoad } from './$types';

/**
 * The component cannot load anything on the server by itself, so the page that
 * uses it does the loading and hands the payload down as a prop. The locale is
 * the one the root layout negotiated: in a server `parent()`, `i18n` is plain
 * data, of which `locale` is the part to read.
 */
export const load: PageServerLoad = async ({ parent }) => {
  const { i18n } = await parent();

  return { rates: await snapshot(i18n.locale) };
};
