import { defineParams } from '@sveltejs/kit/params';

// `.ts`, not `.js`: the build imports this file with Node itself, which maps
// no `.js` to the `.ts` beside it, and strips types by default only from Node
// 22.18 and 23.6, the floors `engines` states.
import { isPrefixed } from '#lib/locale.ts';

export const params = defineParams({
  // Only the prefixed locales match. The default locale has no segment at all,
  // so accepting it here would give every page two addresses — and accepting
  // anything would let the optional segment swallow `/about`. Returns the param
  // narrowed, so `params.lang` is typed as a `Locale` in the routes.
  locale: (param) => (isPrefixed(param) ? param : undefined),
});
