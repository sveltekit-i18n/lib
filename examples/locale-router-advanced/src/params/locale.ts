import { isPrefixed, type Locale } from '$lib/locale';

/**
 * Only the prefixed locales match. The default locale has no segment at all,
 * so accepting it here would give every page two addresses — and accepting
 * anything would let the optional segment swallow `/about`. A type guard, so
 * `params.lang` is typed as a `Locale` in the routes.
 */
export const match = (param: string): param is Locale => isPrefixed(param);
