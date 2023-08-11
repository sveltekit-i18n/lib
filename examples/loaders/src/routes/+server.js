import { defaultLocale } from '$lib/translations';
import { json } from '@sveltejs/kit';

import { default as cs } from '$lib/translations/cs/home.json';
import { default as en } from '$lib/translations/en/home.json';

const translations = { cs, en };

/** @type {import('./home/$types').RequestHandler} */
export async function GET(event) {
  const { lang = defaultLocale } = event.url.searchParams;

  const translation = translations[lang];

  return json(translation);
}