import { INDEX_FILE } from '$lib/docs.js';
import { localeOf, prefixOf } from '$lib/locale.js';
import { render } from '$lib/markdown.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async ({ url }) => {
  const prefix = prefixOf(localeOf(url.pathname));

  return { file: INDEX_FILE, ...(await render(INDEX_FILE, { prefix })) };
};
