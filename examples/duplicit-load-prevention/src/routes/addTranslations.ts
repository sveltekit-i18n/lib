import { addTranslations } from '../lib/translations';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ body }) {
  addTranslations(body.translations);
  return {};
}