import { addTranslations } from '../lib/translations';

/** @type {import('@sveltejs/kit').RequestHandler} */
export const post = async ({ request }) => {
  const { translationProps } = await request.json();

  // add translations on server-side
  addTranslations(...translationProps);

  return {};
};