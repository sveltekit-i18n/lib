import { defineParams } from '@sveltejs/kit/params';

// `.ts`, not `.js`: the build imports this file with Node itself, which maps
// no `.js` to the `.ts` beside it, and strips types by default only from Node
// 22.18 and 23.6, the floors `engines` states.
import { isProduct } from '#lib/products.ts';

export const params = defineParams({
  // An unknown product is a 404 before any `load` runs, in the locale of its
  // pathname. Returns the param narrowed, so `params.id` is typed as a
  // `Product` in the route.
  product: (param) => (isProduct(param) ? param : undefined),
});
