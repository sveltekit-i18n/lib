import { setLocale, setRoute } from '$lib/translations';

/** @type {import('@sveltejs/kit').Load} */
export const load = async ({ params }) => {
  const { error, lang } = params;

  let status = parseInt(error);

  if (Number.isNaN(status)) status = 404;

  await setLocale(lang);
  await setRoute('error');

  return {
    status,
  };
};