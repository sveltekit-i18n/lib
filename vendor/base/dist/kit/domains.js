import { HOSTING } from './internal.js';
/** A hostname as the map keys it: lowercased, and without the one trailing dot a fully qualified name may carry. */
const keyOf = (hostname) => {
    const lowered = hostname.toLowerCase();
    return lowered.endsWith('.') ? lowered.slice(0, -1) : lowered;
};
// `String()` of an object runs its own conversion, which can throw.
const quoted = (value) => `'${value !== null && (typeof value === 'object' || typeof value === 'function') ? Object.prototype.toString.call(value) : String(value)}'`;
/** `key` read as an origin: an `http` or `https` URL with nothing after its host and port. */
const originOf = (key) => {
    try {
        const url = new URL(key);
        return (url.protocol === 'http:' || url.protocol === 'https:') && url.href === `${url.origin}/` ? url : undefined;
    }
    catch {
        return undefined;
    }
};
const compile = (map, { sanitize, served, warn }) => {
    const hosts = new Map();
    const locales = new Map();
    // The config's spelling of each locale it serves, by its lowercased name.
    const available = new Map(served().map((locale) => [locale.toLowerCase(), locale]));
    const unserved = new Set();
    if (!map || typeof map !== 'object')
        warn('is not an object. No locale is served at a domain');
    for (const [key, value] of map && typeof map === 'object' ? Object.entries(map) : []) {
        const url = originOf(key);
        // A spread reads a hole as `undefined`, which `some()` would skip.
        const listed = typeof value === 'string' ? [value] : Array.isArray(value) ? [...value] : undefined;
        if (!url || !listed?.length || listed.some((locale) => !locale || typeof locale !== 'string')) {
            warn(`skips ${quoted(key)}: ${url ? 'its value is no locale or list of locales' : 'it is no origin'}`);
            continue;
        }
        const hostname = keyOf(url.hostname);
        const taken = hosts.get(hostname);
        if (taken) {
            warn(`skips ${quoted(key)}: ${quoted(taken.origin)} serves its host`);
            continue;
        }
        const host = { origin: url.origin, locales: [] };
        for (const locale of listed) {
            const name = sanitize(locale);
            const lowered = name.toLowerCase();
            const spelled = available.get(lowered);
            const other = locales.get(lowered);
            if (other) {
                warn(`skips ${quoted(locale)} at ${quoted(key)}: ${quoted(other.origin)} serves it`);
            }
            else if (spelled === undefined) {
                unserved.add(name);
            }
            else {
                host.locales.push(spelled);
                locales.set(lowered, host);
            }
        }
        // A host left with no locale the config serves is a host the map does not list.
        if (host.locales.length)
            hosts.set(hostname, host);
    }
    if (unserved.size)
        warn(`lists ${[...unserved].map(quoted).join(', ')}, which the config serves no translations for`);
    const missing = [...available.entries()].filter(([lowered]) => !locales.has(lowered)).map(([, locale]) => locale);
    if (hosts.size && missing.length)
        warn(`leaves out ${missing.map(quoted).join(', ')}, which no domain serves`);
    return { hosts, locales };
};
const hosting = (map, { sanitize, normalize, served, warn }) => {
    let compiled;
    // Compiled once even when the map throws as it is read, so no call pays for
    // a compile again.
    const read = () => {
        if (!compiled) {
            try {
                compiled = compile(map, { sanitize, served, warn });
            }
            catch {
                warn('cannot be read. No locale is served at a domain');
                compiled = { hosts: new Map(), locales: new Map() };
            }
        }
        return compiled;
    };
    return {
        locales: (hostname) => (typeof hostname === 'string' ? read().hosts.get(keyOf(hostname))?.locales : undefined),
        origin: (locale, from) => {
            if (typeof locale !== 'string')
                return undefined;
            const { hosts, locales } = read();
            // A locale the map names is taken in any case; only another spelling of
            // one goes through the sanitizer.
            const host = locales.get(locale.toLowerCase()) ?? locales.get(normalize(locale).toLowerCase());
            if (!host || from === undefined)
                return host?.origin;
            // From a host the map does not list (a dev server, a preview), a link
            // stays there.
            const at = typeof from === 'string' ? hosts.get(keyOf(from)) : undefined;
            return at && at !== host ? host.origin : undefined;
        },
    };
};
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
export const localeDomains = (map) => Object.freeze({ [HOSTING]: (setup) => hosting(map, setup) });
