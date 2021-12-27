import { addTranslations, getTranslationProps } from '../lib/translations';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ body }) {
  const { initialLocale, path } = body;

  const translationProps = await getTranslationProps(initialLocale, path);

  // add translations on server-side
  addTranslations(...translationProps);

  return {
    body: {
      translationProps,
    },
  };
}