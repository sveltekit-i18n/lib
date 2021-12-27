import { addTranslations, getTranslationProps } from '../lib/translations';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ body }) {
  const { initialLocale, path } = body;

  const translationProps = await getTranslationProps(initialLocale, path);
  addTranslations(...translationProps); // add translations on server

  return {
    body: {
      translationProps,
    },
  };
}