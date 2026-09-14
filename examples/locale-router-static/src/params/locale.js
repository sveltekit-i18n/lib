import { LOCALES } from '$lib/locale.js';

/** @type {import('@sveltejs/kit').ParamMatcher} */
export const match = (param) => LOCALES.includes(param);
