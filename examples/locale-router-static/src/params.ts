import { defineParams } from '@sveltejs/kit/params';

// `.ts`, not `.js`: the build imports this file with Node itself, which maps
// no `.js` to the `.ts` beside it, and strips types by default only from Node
// 22.18 and 23.6, the floors `engines` states.
import { isLocale } from '#lib/locale.ts';

export const params = defineParams({
  // Returns the param narrowed, so `params.lang` is typed as a `Locale` in the
  // routes.
  locale: (param) => (isLocale(param) ? param : undefined),
});
