import { DEFAULT_LOCALE } from '$lib/locale.js';

/**
 * Runs during the prerender as well, so every written page carries its own
 * `<html lang>`.
 *
 * @type {import('@sveltejs/kit').Handle}
 */
export const handle = ({ event, resolve }) => resolve(event, {
  transformPageChunk: ({ html }) => html.replace('%lang%', event.params.lang ?? DEFAULT_LOCALE),
});

/**
 * Without a `message` SvelteKit's own fatal-error path renders `undefined`,
 * which hides whatever actually went wrong.
 *
 * @type {import('@sveltejs/kit').HandleServerError}
 */
export const handleError = ({ message }) => ({ message });
