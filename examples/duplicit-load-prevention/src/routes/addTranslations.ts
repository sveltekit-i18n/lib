import { addTranslations } from '../lib/translations';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ body }) {
  const { translationProps } = body;

  // add translations on server-side
  addTranslations(...translationProps);

  return {};
}