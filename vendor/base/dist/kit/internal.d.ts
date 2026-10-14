import type { I18n } from '../I18n.svelte.js';
import type { Kit } from './types.js';
/** The params of an event the wiring reads: SvelteKit 3 hands a param its matcher parsed as it parsed it. */
export type Params = Partial<Record<string, Kit.ParamValue>>;
/** The negotiated locale, and whether the visitor chose it: `Kit.Payload['preferred']`. */
export type Negotiated = {
    locale: string | undefined;
    preferred: boolean;
};
/** What the server half needs from the factory. */
export type Shared = {
    create: () => I18n;
    negotiate: (event: Kit.Event<Params>, ranges: string | readonly string[] | null | undefined) => Negotiated;
    /** The locales the config serves. */
    locales: () => string[];
    basePath: string | undefined;
    /** The canonical pathname `reroute` serves for `url`, `basePath` kept. */
    canonical: (url: Pick<URL, 'pathname'> & Partial<Pick<URL, 'hostname'>>) => string;
    /**
     * Whether the universal branch of a page render may take over the instance
     * the server branch loaded: not while a loader has `cache: false`, which only
     * a hand-off holds back for the rest of the render.
     */
    handOver: () => boolean;
};
export type ServerHalf = {
    handle: Kit.T['handle'];
    load: (event: Kit.ServerLoadEvent<Params>) => Promise<{
        i18n: Kit.Payload;
    }>;
    /** The instance a page render loaded for `payload`, handed out once. */
    take: (payload: Kit.Payload | undefined) => I18n | undefined;
};
/**
 * The keys a `translatePathnames()` and a `localeDomains()` value hold their
 * binding under: registry-wide, so two copies of the package meet, and
 * versioned, so a binding of another shape is no binding. Bump one whenever
 * what it binds to (`Translation`, `Hosting`) changes, and both whenever
 * `Setup`, which they share, does.
 */
export declare const TRANSLATION: unique symbol;
export declare const HOSTING: unique symbol;
/**
 * A canonical pathname, the base path kept, and the locale the pathname
 * gives: the one its localized pattern pins, if any, unless a host
 * `domains` lists serves the pathname in other locales of its own alone;
 * there, the one of them when it is one, and none when it is several.
 */
export type Canonical = {
    pathname: string;
    locale?: string;
};
/** What `defineI18n()` hands the binding of `options.pathnames` and of `options.domains`. */
export type Setup = {
    basePath: string | undefined;
    /** The config's sanitizer, which the table's locales go through. */
    sanitize: (locale: string) => string;
    /** A locale the app hands `localizePath` that the table does not name as it is spelled, sanitized silently. */
    normalize: (locale: string) => string;
    /** The locales the config serves. */
    served: () => string[];
    /** Reports what is wrong with the table, through the config's logger. */
    warn: (message: string) => void;
};
/**
 * The translated pathnames one `defineI18n()` wires: the canonical pathname
 * of a URL's, which `delocalize` and the negotiation read, the pathname
 * `reroute` serves, and `localizePath`. Given the locales of a host
 * `domains` lists, a pathname is read among them.
 */
export type Translation = {
    canonical: (pathname: string, locales?: readonly string[]) => Canonical;
    /** The canonical pathname, `basePath` kept, where `localizePath` gives the page the pathname, and the pathname itself otherwise. */
    served: (pathname: string, locales?: readonly string[]) => string;
    localizePath: Kit.T['localizePath'];
};
/** The domains one `defineI18n()` wires. */
export type Hosting = {
    /** The locales the host of `hostname` serves, its own first, or `undefined` for a host the map does not list. */
    locales: (hostname: string) => string[] | undefined;
    /**
     * The origin of the host that serves `locale`, or `undefined` for a locale
     * the map does not list, and, given the hostname of a link's page in
     * `from`, for a link that stays on that host or leaves a host the map does
     * not list.
     */
    origin: (locale: string, from?: unknown) => string | undefined;
};
