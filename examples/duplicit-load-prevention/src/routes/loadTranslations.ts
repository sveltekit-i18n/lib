// eslint-disable-next-line import/no-extraneous-dependencies
import { getTranslationProps } from '../lib/translations';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ body }) {
  const { initialLocale, path } = body;

  const translationProps = await getTranslationProps(initialLocale, path);

  return {
    body: {
      translationProps,
    },
  };
}