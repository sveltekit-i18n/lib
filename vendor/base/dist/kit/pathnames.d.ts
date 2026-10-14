import type { Kit } from './types.js';
/**
 * The translated pathnames of `table`, for `defineI18n()`'s `pathnames`: per
 * canonical pathname, the pathname each locale serves it at. Both are
 * written without `basePath`, in SvelteKit's route syntax limited to static
 * segments, `[param]` and a trailing `[...rest]`; every pattern of an entry
 * names the same params. A localized pattern is the whole pathname, so it
 * carries the locale's prefix when it has one. A pathname matches its most
 * specific pattern, as SvelteKit ranks its routes, whatever the table's
 * order, and a locale an entry leaves out falls through to the next pattern
 * that matches. A pathname the table does not name passes through unchanged.
 * `reroute` serves a page only at the pathnames `localizePath` gives it, on a
 * host `domains` lists in a locale of that host, and passes any other
 * through, which `delocalize` and the negotiation still read as the
 * pattern's page; on such a host, a pathname it serves in one of the host's
 * locales alone belongs to that locale. On the server, the compile warns of a localized
 * pattern that takes a canonical pathname of another page, which `delocalize`
 * then reads as the pattern's, and of a pattern several locales share that
 * `localizePath` ranks below a pattern of one of them alone, on a canonical
 * pathname both their entries match, and of a pattern with a rest a pathname
 * of which a pattern ranked above it reads, which `localizePath` then never
 * gives its page.
 *
 * The table is read when `defineI18n()`'s wiring first needs it, and
 * compiled then, once per `defineI18n()`. A pathname is visitor input: no
 * function of the wiring throws on one, `delocalize` runs no regex on it and
 * walks the localized trie, `localizePath` only regexes of one character
 * class, which are linear, walks the canonical trie twice at most and the
 * localized one once more per pathname it tries, and `reroute` walks the
 * localized trie and the canonical one once each, and only where another
 * entry that matches the canonical pathname translates to the locales of the
 * pattern that read it, walks the localized trie once more and runs
 * `localizePath` without a regex in each locale of the patterns that match the
 * pathname, and once more for a locale without a pathname of its own; on a
 * host `domains` lists, in each locale of the host instead. There,
 * `delocalize` and the negotiation walk the canonical trie once more at most
 * for a pathname a pattern reads, and, unless the host serves it in the locale the
 * pattern pins, run `localizePath` without a regex in each locale of the host.
 *
 * @example
 * defineI18n(config, {
 *   pathnames: translatePathnames({
 *     '/about': { de: '/de/ueber-uns', cs: '/cs/o-nas' },
 *     '/products/[id]': { de: '/de/produkte/[id]', cs: '/cs/produkty/[id]' },
 *     '/[...rest]': { en: '/[...rest]', de: '/de/[...rest]', cs: '/cs/[...rest]' },
 *   }),
 * });
 */
export declare const translatePathnames: (table: Record<string, Partial<Record<string, string>>>) => Kit.Pathnames;
