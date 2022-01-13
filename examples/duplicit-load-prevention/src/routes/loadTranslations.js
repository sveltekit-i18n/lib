import { addTranslations, getTranslationProps } from '../lib/translations';

export async function post({ body }) {
  const { initLocale, pathname } = body;

  const translationProps = await getTranslationProps(initLocale, pathname);

  // add translations on server-side
  addTranslations(...translationProps);

  return {
    body: {
      translationProps,
    },
  };
}