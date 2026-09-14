import { snapshot } from '$lib/rates/translations.js';

/**
 * The component cannot load anything on the server by itself, so the page that
 * uses it does the loading and hands the payload down as a prop.
 *
 * @type {import('./$types').PageServerLoad}
 */
export const load = async ({ locals }) => ({ rates: await snapshot(locals.locale) });
