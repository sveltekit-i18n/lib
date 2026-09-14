import { DEFAULT_LOCALE } from '$lib/docs.js';

export const handle = ({ event, resolve }) => resolve(event, {
  transformPageChunk: ({ html }) => html.replace('%lang%', event.params.lang ?? DEFAULT_LOCALE),
});
