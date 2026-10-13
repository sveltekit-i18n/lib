import type { Kit } from './types.js';
/** `T`, kept out of inference, so the locale comes from where the result goes: `defineI18n()`'s config. */
type Deferred<T> = [T][T extends any ? 0 : never];
/**
 * The domains of `map`, for `defineI18n()`'s `domains`: per origin, the
 * locale or the locales its host serves, its own first. A locale belongs to
 * one origin. A host the map lists negotiates among its own locales and
 * falls back to its first; a host it does not list (a dev server, a
 * preview, the prerendering origin) negotiates among every locale the config
 * serves, as without `domains`. A host is matched by its name alone, so
 * neither the scheme nor the port of a request decides it, and a link to
 * another host's locale takes the origin the map spells, never the
 * request's.
 *
 * The map is read when `defineI18n()`'s wiring first needs it, and checked
 * then, once per `defineI18n()`: a key that is no origin, a host two keys
 * name, a locale two hosts list, and a locale the config serves no
 * translations for are logged and skipped.
 *
 * @example
 * defineI18n(config, {
 *   domains: localeDomains({
 *     'https://example.com': ['en', 'de'],
 *     'https://example.cz': 'cs',
 *   }),
 * });
 */
export declare const localeDomains: <Locale extends string = string>(map: Record<string, Deferred<Locale> | readonly Deferred<Locale>[]>) => Kit.Domains<Locale>;
export {};
