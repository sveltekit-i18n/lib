import { addTranslations, getTranslationProps } from '../lib/translations';

export async function post({ body }) {
  const { initialLocale, pathname } = body;

  const translationProps = await getTranslationProps(initialLocale, pathname);

  // add translations on server-side
  addTranslations(...translationProps);

  return {
    body: {
      translationProps,
    },
  };
}