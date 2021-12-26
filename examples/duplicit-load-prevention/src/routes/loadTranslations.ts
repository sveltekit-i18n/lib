// eslint-disable-next-line import/no-extraneous-dependencies
import { get } from 'svelte/store';
import { loadTranslations, translations } from '../lib/translations';

/** @type {import('@sveltejs/kit').RequestHandler} */
export async function post({ body }) {
  const { initialLocale, path } = body;

  await loadTranslations(initialLocale, path);
  const $translations = get(translations);

  return {
    body: {
      translations: $translations,
    },
  };
}