import { setLocale, setRoute } from '$lib/translations';

export const prerender = true;

/** @type { import('@sveltejs/kit').Load } */
export const load = async ({ url }) => {
  const { pathname } = url;

  const lang = `${pathname.match(/\w+?(?=\/|$)/) || ''}`;

  const route = pathname.replace(new RegExp(`^/${lang}`), '');

  await setLocale(lang);
  await setRoute(route);

  return { route, lang };
};