import { PREFIXED } from '$lib/locale.js';

/** @type {import('@sveltejs/kit').ParamMatcher} */
export const match = (param) => PREFIXED.includes(param);
