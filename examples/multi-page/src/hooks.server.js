import { negotiate } from '$lib/locale.js';

/** @type {import('@sveltejs/kit').Handle} */
export const handle = ({ event, resolve }) => {
  const locale = negotiate(event.cookies.get('lang'), event.request.headers.get('accept-language'));

  event.locals.locale = locale;

  return resolve(event, {
    transformPageChunk: ({ html }) => html.replace('%lang%', locale),
  });
};

/**
 * Without a `message` SvelteKit's own fatal-error path renders `undefined`,
 * which hides whatever actually went wrong.
 *
 * @type {import('@sveltejs/kit').HandleServerError}
 */
export const handleError = ({ message }) => ({ message });
