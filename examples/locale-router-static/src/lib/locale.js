export const DEFAULT_LOCALE = 'en';

export const LOCALES = ['en', 'cs', 'de'];

/** The path without its locale segment, which is what the loaders match on. */
export const routeOf = (pathname) => pathname.replace(/^\/[^/]+/, '') || '/';

/**
 * The crawler starts at `/` and follows links. It cannot invent `/cs` or `/de`,
 * so every prerenderable page under `[lang]` names its own entries — that is
 * the difference between a build that ships three languages and one that
 * silently ships one.
 */
export const entries = () => LOCALES.map((lang) => ({ lang }));
