/**
 * The keys a `translatePathnames()` and a `localeDomains()` value hold their
 * binding under: registry-wide, so two copies of the package meet, and
 * versioned, so a binding of another shape is no binding. Bump one whenever
 * what it binds to (`Translation`, `Hosting`) changes, and both whenever
 * `Setup`, which they share, does.
 */
export const TRANSLATION = Symbol.for('@sveltekit-i18n/base/kit/translation@1');
export const HOSTING = Symbol.for('@sveltekit-i18n/base/kit/domains@1');
