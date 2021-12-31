import { addTranslations } from '../lib/translations';

export async function post({ body }) {
  const { translationProps } = body;

  // add translations on server-side
  addTranslations(...translationProps);

  return {};
}