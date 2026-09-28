export const prerender = true;

// The only `load` of the root layout: every page is prerendered, so there is no
// server `load`, and the locale comes off the path both at build time and in
// the browser.
export { load } from '$lib/translations';
