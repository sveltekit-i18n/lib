import { addTranslations, getTranslationProps } from '../lib/translations';

/** @type {import('@sveltejs/kit').RequestHandler} */
export const post = async ({ request }) => {
  const { initLocale, pathname } = await request.json();

  const translationProps = await getTranslationProps(initLocale, pathname);

  // add translations on server-side
  addTranslations(...translationProps);

  return {
    body: {
      translationProps,
    },
  };
};