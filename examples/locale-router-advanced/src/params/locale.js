import { PREFIXED } from '$lib/locale.js';

/**
 * Only the prefixed locales match. The default locale has no segment at all,
 * so accepting it here would give every page two addresses — and accepting
 * anything would let the optional segment swallow `/about`.
 *
 * @type {import('@sveltejs/kit').ParamMatcher}
 */
export const match = (param) => PREFIXED.includes(param);
