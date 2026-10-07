// Runs during the prerender, so every written page carries its own
// `<html lang>` and `dir`. The fallback shell is written once and cannot,
// which is why `use()` sets both again after hydration.
export { handle } from '#lib/translations/index.js';
