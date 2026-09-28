import type { HandleServerError } from '@sveltejs/kit';

// Runs during the prerender as well, so every written page carries its own
// `<html lang>` and `dir`.
export { handle } from '$lib/translations';

/**
 * Without a `message` SvelteKit's own fatal-error path renders `undefined`,
 * which hides whatever actually went wrong.
 */
export const handleError: HandleServerError = ({ message }) => ({ message });
