import { localeOf } from '$lib/locale.js';

/** @type {import('@sveltejs/kit').Handle} */
export const handle = ({ event, resolve }) => resolve(event, {
  transformPageChunk: ({ html }) => html.replace('%lang%', localeOf(event.url)),
});

/**
 * Without a `message` SvelteKit's own fatal-error path renders `undefined`,
 * which hides whatever actually went wrong.
 *
 * @type {import('@sveltejs/kit').HandleServerError}
 */
export const handleError = ({ message }) => ({ message });
