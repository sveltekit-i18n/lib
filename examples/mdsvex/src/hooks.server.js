import { localeOf } from '$lib/locale.js';

/**
 * Runs during the prerender as well, so every written page carries its own
 * `<html lang>`. Read off the path rather than `params`, which an error
 * response has none of.
 *
 * @type {import('@sveltejs/kit').Handle}
 */
export const handle = ({ event, resolve }) => resolve(event, {
  transformPageChunk: ({ html }) => html.replace('%lang%', localeOf(event.url.pathname)),
});

/**
 * Without a `message` SvelteKit's own fatal-error path renders `undefined`,
 * which hides whatever actually went wrong.
 *
 * @type {import('@sveltejs/kit').HandleServerError}
 */
export const handleError = ({ message }) => ({ message });
