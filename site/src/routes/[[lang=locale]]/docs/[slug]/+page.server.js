import { error } from '@sveltejs/kit';

import { PAGES } from '$lib/docs.js';
import { localeOf, prefixOf } from '$lib/locale.js';
import { render } from '$lib/markdown.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ params, url }) => {
  const file = PAGES[params.slug];

  if (!file) error(404);

  const prefix = prefixOf(localeOf(url.pathname));

  return { file, ...(await render(file, { prefix })) };
};
