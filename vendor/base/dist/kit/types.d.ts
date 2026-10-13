import type { I18n } from '../I18n.svelte.js';
import type { Snapshot } from '../types.js';
export declare namespace Kit {
    /** A route param as SvelteKit 3 types it: a string, or what its matcher parsed it to. */
    type ParamValue = string | number | boolean | bigint;
    /**
     * The members of a SvelteKit load or request event the wiring reads. The
     * default `Params` are string params, as SvelteKit 2 hands them; SvelteKit 3
     * hands a param its matcher parsed as it parsed it, and `Kit.T` accepts
     * events of any params. The server-only members are optional, since an app
     * without a server load hands the universal one, which has none.
     */
    type Event<Params extends Partial<Record<string, ParamValue>> = Partial<Record<string, string>>> = {
        url: URL;
        params: Params;
        route: {
            id: string | null;
        };
        cookies?: {
            get: (name: string) => string | undefined;
        };
        request?: Request;
        locals?: Record<string, any>;
    };
    type RequestEvent<Params extends Partial<Record<string, ParamValue>> = Partial<Record<string, string>>> = Event<Params> & Required<Pick<Event<Params>, 'cookies' | 'request'>>;
    type ServerLoadEvent<Params extends Partial<Record<string, ParamValue>> = Partial<Record<string, string>>> = RequestEvent<Params> & {
        isDataRequest: boolean;
    };
    type UniversalLoadEvent<Params extends Partial<Record<string, ParamValue>> = Partial<Record<string, string>>> = Event<Params> & {
        data: Record<string, any> | null;
    };
    type Resolve = (event: any, options?: {
        transformPageChunk?: (input: {
            html: string;
            done: boolean;
        }) => string | undefined;
    }) => Response | Promise<Response>;
    /**
     * What the server branch of `load` returns under `i18n`: the negotiated
     * locale and the route always, the tables and their records on a page
     * render only. Plain data, for `devalue`.
     */
    type Payload = Omit<Snapshot.Envelope, 'translations'> & Partial<Pick<Snapshot.Envelope, 'translations'>> & {
        /**
         * Set on a page render when the URL's translated pathname (on a host
         * `domains` lists, only the locale its pattern pins) or `preferredLocale`
         * gave the locale. A prerendered page's data is that
         * render, so a navigation to one takes its locale only when the build's
         * pathname or `preferredLocale` gave it.
         */
        preferred?: true;
    };
    /** The options of `defineI18n()`, whose `domains` complete the locales `Locale` names. */
    type Options<Locale extends string = string> = {
        /**
         * The visitor's choice, read from the event: a cookie, a route param, a
         * profile in `locals`. It is tried before `Accept-Language` (without a
         * server load, before `navigator.languages`), and a value no configured
         * locale matches is skipped; a custom `sanitizeLocales` is applied to it
         * first. Under SvelteKit 3 a param its matcher parsed reaches the event
         * parsed, whatever the default `Event` type says: annotate the event as
         * `Kit.Event<Partial<Record<string, Kit.ParamValue>>>` to see it, and
         * return a string, since a number is no locale. It runs on every
         * navigation and every preload, so it must be pure: it reads the event
         * and writes nothing.
         * With a server load it runs in the browser only on a root error page
         * rendered without the server's data (an unknown URL a static host answers
         * with its fallback page): a navigation to a prerendered page takes the
         * locale the translated pathname or it gave at build time, and otherwise
         * keeps the tab's.
         *
         * @example
         * preferredLocale: (event) => event.cookies?.get('lang')
         */
        preferredLocale?: (event: Event) => string | null | undefined;
        /**
         * Translated pathnames, as `translatePathnames()` makes them of a table.
         * `reroute` serves a page's localized pathname from the route of its
         * canonical one, and a URL whose pattern belongs to one locale gives the
         * locale, before `preferredLocale`. A value of another kind, or of a version
         * of this package that binds it otherwise, is logged and translates
         * nothing.
         *
         * @example
         * pathnames: translatePathnames({ '/about': { de: '/de/ueber-uns', cs: '/cs/o-nas' } })
         */
        pathnames?: Pathnames;
        /**
         * A locale per domain, as `localeDomains()` makes them of a map. A host
         * the map lists negotiates among its own locales, with its first as the
         * last resort, and `localizeHref` links a locale another host serves
         * with that host's origin. A host it does not list negotiates as without
         * `domains`. A value of another kind, or of a version of this package
         * that binds it otherwise, is logged and serves no locale at a domain.
         *
         * @example
         * domains: localeDomains({ 'https://example.com': ['en', 'de'], 'https://example.cz': 'cs' })
         */
        domains?: Domains<Locale>;
    };
    /**
     * What `translatePathnames()` returns, for `Options['pathnames']`. Opaque:
     * the key is a type-only brand, which no pathname pattern can be, so two
     * copies of the package meet.
     */
    type Pathnames = {
        readonly '~translatePathnames': true;
    };
    /**
     * What `localeDomains()` returns, for `Options['domains']`. Opaque, as
     * `Pathnames` is; the locale it lists types the map's values, and it fits
     * the options of any config whose locales accept it.
     */
    type Domains<Locale extends string = string> = {
        readonly '~localeDomains': true;
        readonly '~locale'?: Locale;
    };
    /** The locale an instance takes: what its `locale` property holds, or any string. */
    type LocaleOf<Instance> = Instance extends {
        locale: infer L;
    } ? (Exclude<L, null | undefined> extends string ? Exclude<L, null | undefined> : string) : string;
    /**
     * What `defineI18n()` returns. Each member is a plain function, so it can be
     * exported on its own. `handle` and `load` take events of `any` params: a
     * member implemented by hand annotates its event to read them typed (for
     * `handle` under SvelteKit 3,
     * `Kit.RequestEvent<Partial<Record<string, Kit.ParamValue>>>`).
     */
    type T<Instance = I18n, Locale extends string = LocaleOf<Instance>> = {
        /** A `handle` hook: fills `%lang%` in the `<html>` tag of `app.html` with the negotiated locale, and `%dir%` with its direction. */
        handle: (input: {
            event: RequestEvent<Partial<Record<string, any>>>;
            resolve: Resolve;
        }) => Promise<Response>;
        /** The root layout's `load`, exported from `+layout.server.js` and `+layout.js` alike. */
        load: {
            (event: ServerLoadEvent<Partial<Record<string, any>>>): Promise<{
                i18n: Payload;
            }>;
            <E extends UniversalLoadEvent<Partial<Record<string, any>>>>(event: E): Promise<Omit<NonNullable<E['data']>, 'i18n'> & {
                i18n: Instance;
            }>;
            (event: UniversalLoadEvent<Partial<Record<string, any>>>): Promise<{
                i18n: Instance;
            }>;
        };
        /**
         * Called once, in the root layout's script, with a getter of its `data`.
         * Provides the instance to every component below, and follows each
         * navigation as it commits. Returns the instance.
         */
        use: (data: () => object | null | undefined) => Instance;
        /** The instance `use()` provided, in any component below the root layout. */
        get: () => Instance;
        /**
         * SvelteKit's `reroute` hook, exported from `src/hooks.ts`: the canonical
         * pathname of a translated one, `basePath` kept, or `undefined` for a
         * pathname `pathnames` does not translate. A page is served only at a
         * pathname `localizePath` gives it, on a host `domains` lists in a locale
         * of that host, so another pathname a pattern takes (`/cs/about` beside
         * `/cs/o-nas`, or `/o-nas` on a host that does not serve `cs`) is left as
         * it is, for `handle` to redirect. A pure function of the URL, as
         * SvelteKit caches it per URL for the life of the tab.
         */
        reroute: (input: {
            url: Pick<URL, 'pathname'> & Partial<Pick<URL, 'hostname'>>;
        }) => string | undefined;
        /**
         * The canonical path of a URL, without `basePath` and with its search and
         * hash, the locale its translated pathname belongs to, when it belongs to
         * one, and the first locale of its host, when `domains` lists the host;
         * there, a pathname the host serves in one of its locales alone belongs
         * to that locale. A
         * search or a hash SvelteKit hides is left out: the search while
         * prerendering, the hash in a `load`. A trailing slash is kept, except on
         * the root, which comes back as `/`.
         *
         * @example
         * delocalize(new URL('https://example.com/de/ueber-uns?q=1')) // { path: '/about?q=1', locale: 'de', domain: 'en' }
         */
        delocalize: (url: Pick<URL, 'pathname' | 'search' | 'hash'> & Partial<Pick<URL, 'hostname'>>) => {
            path: string;
            locale?: Locale;
            domain?: Locale;
        };
        /**
         * The canonical `path` translated to `locale`, without `basePath`,
         * percent-encoded and with its search and hash. A pathname it translates
         * to leads back to the page of `path`: the one of `locale` alone first,
         * then one several locales share. Short of both, a path that is a
         * pathname of its own page comes back as it is, and one another page
         * takes comes back as another locale's pathname of its page, when the
         * page has one. No locale leaves `path` as it is. A pathname of the site is no canonical path: `delocalize` gives the
         * path of a URL.
         *
         * @example
         * localizePath('/about', 'cs') // '/cs/o-nas'
         * localizePath(delocalize(page.url).path, 'cs') // the page shown, in Czech
         */
        localizePath: (path: string, locale: Locale | null | undefined) => string;
        /**
         * The href of `path` in `locale`: `localizePath(path, locale)` with
         * `basePath`, and the origin `domains` gives `locale` when another host
         * serves it. Given the URL of the page it links from in `from`, it adds
         * the origin only where the link leaves that page's host, and none from
         * a host `domains` does not list (a dev server, a preview). A path that
         * does not start with a single `/` comes back as `localizePath` gives it.
         *
         * @example
         * localizeHref('/about', 'cs', page.url) // 'https://example.cz/about' from example.com, '/about' from example.cz
         */
        localizeHref: (path: string, locale: Locale | null | undefined, from?: Pick<URL, 'hostname'> | null) => string;
    };
}
