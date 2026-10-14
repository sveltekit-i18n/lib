import { getContext, setContext, untrack } from 'svelte';
import { BROWSER } from '#kit-env';
import { serverHalf } from '#kit-server';
import { I18n } from '../I18n.svelte.js';
import { logError, logger, loggerFactory, setLogger } from '../logger.js';
import { configLocales, matchLocale, paramsSignature, quietlySanitized, resolveLoaders, routeParams, sanitizeLocales, sanitizerFactory, textDirection, withoutBasePath } from '../utils.js';
import { HOSTING, TRANSLATION } from './internal.js';
// Registry-wide, so two copies of this package meet: the context key, and the
// key of the pass the universal branch hands `use()` in `data`.
const KEY = Symbol.for('@sveltekit-i18n/base/kit');
const passOf = (data) => data?.[KEY];
const UNTRANSLATED = { canonical: (pathname) => ({ pathname }), served: (pathname) => pathname, localizePath: (path) => path };
const UNHOSTED = { locales: () => undefined, origin: () => undefined };
/** `url[property]`, or nothing where SvelteKit hides it: the search while prerendering, the hash in a `load`. */
const visible = (url, property) => {
    try {
        return url[property];
    }
    catch {
        return '';
    }
};
const isServerEvent = (event) => 'cookies' in event;
/**
 * Wires SvelteKit to an instance of `config`: a `handle` hook, the root
 * layout's `load`, `use()` / `get()` for components, the translated
 * pathnames of `options.pathnames` and the domains of `options.domains`. The
 * server builds an instance per request; the browser keeps one per tab.
 */
export const defineI18n = (config, options = {}) => {
    // The constructor would start an `initLocale` load of its own, next to the
    // negotiated one; here `initLocale` is a negotiation candidate instead. The
    // wiring drives the core itself, whatever the extensions make of it.
    const create = () => new I18n({ ...config, initLocale: undefined, extensions: undefined });
    const pipe = (i18n) => (config.extensions ?? []).reduce((acc, extension) => extension(acc), i18n);
    const sanitize = sanitizerFactory(config.sanitizeLocales);
    const sanitized = (locale) => (locale ? sanitize(locale)[0] : undefined);
    let configured;
    // `initLocale` and `fallbackLocale`, spelled as the config's locales are and
    // so sanitized alike.
    let defaults = [];
    // Resolved on first use, never at import, and once: resolving the loaders
    // and sanitizing reports what is wrong with them.
    const resolved = () => {
        if (configured)
            return configured;
        if (config.log)
            setLogger(loggerFactory(config.log));
        try {
            const loaders = resolveLoaders(config.loaders, config.sanitizeLocales);
            configured = { locales: configLocales(config, loaders), handOver: !loaders.some(({ cache }) => cache === false), loaders };
        }
        catch {
            // The instance reports a malformed config itself.
            configured = { locales: [], handOver: false, loaders: [] };
        }
        defaults = [sanitized(config.initLocale), sanitized(config.fallbackLocale)];
        return configured;
    };
    const locales = () => resolved().locales;
    let reported = false;
    const preferred = (event) => {
        try {
            // Typed for string params; a param a matcher parsed misses as no locale.
            return options.preferredLocale?.(event);
        }
        catch (error) {
            if (!reported)
                logError('`preferredLocale` failed. Negotiating without it.', error);
            reported = true;
            return undefined;
        }
    };
    // What `preferredLocale` returns is the visitor's, so it goes through a
    // custom sanitizer silently — a value it rejects is matched as it is — and
    // never through the default one, which warns on every tag `Intl` does not
    // know: either would turn a visitor's cookie into a report per request.
    const visitorSanitized = (locale) => {
        const { sanitizeLocales: custom } = config;
        if (!locale || typeof custom !== 'function')
            return locale;
        try {
            const result = custom(`${locale}`);
            return result ? `${result}` : locale;
        }
        catch {
            return locale;
        }
    };
    const setup = (name) => ({
        basePath: config.basePath,
        sanitize: (locale) => sanitize(locale)[0] ?? locale,
        normalize: (locale) => (sanitize === sanitizeLocales ? quietlySanitized(locale) : visitorSanitized(locale) ?? locale),
        served: locales,
        warn: (message) => logger.warn(`\`${name}\` ${message}.`),
    });
    // What a factory of this package made for `options[name]`, bound on first
    // use, after the config's logger is set, so what is wrong with it reports
    // through it.
    const binding = (name, key, members, none, fallback) => {
        let bound;
        return () => {
            if (bound)
                return bound;
            const value = options[name];
            if (value === undefined || value === null)
                return (bound = none);
            locales();
            const given = setup(name);
            try {
                const bind = typeof value === 'object' ? value[key] : undefined;
                const result = typeof bind === 'function' ? bind(given) : undefined;
                if (result && members.every((member) => typeof result[member] === 'function'))
                    return (bound = result);
            }
            catch { /* reported below */ }
            given.warn(fallback);
            return (bound = none);
        };
    };
    const translation = binding('pathnames', TRANSLATION, ['canonical', 'served', 'localizePath'], UNTRANSLATED, 'takes what `translatePathnames(table)` of a compatible version of the package returns. No pathname is translated');
    const hosting = binding('domains', HOSTING, ['locales', 'origin'], UNHOSTED, 'takes what `localeDomains(map)` of a compatible version of the package returns. No locale is served at a domain');
    const negotiate = (event, ranges) => {
        // First: it sets the config's logger, which `preferred`, the pathnames
        // and the domains report through.
        const served = locales();
        // A host `domains` lists serves its own locales alone, and falls back to
        // its first, which no visitor chose: it never counts as `preferred`.
        const hosted = hosting().locales(event.url.hostname);
        const available = hosted ?? served;
        // A translated pathname of one locale is the visitor's choice of it. One
        // the host serves in another of its locales is that locale's page there,
        // but no visitor's choice: a prerendered file answers on every host.
        const read = translation().canonical(event.url.pathname, hosted).locale;
        const pageLocale = read === undefined ? undefined : matchLocale(read, available);
        if (pageLocale !== undefined)
            return { locale: pageLocale, preferred: !hosted || read === translation().canonical(event.url.pathname).locale };
        const chosen = matchLocale(visitorSanitized(preferred(event)), available);
        if (chosen !== undefined)
            return { locale: chosen, preferred: true };
        return {
            // Last, the host's first locale, or the first locale served: a config
            // that serves one never renders a page without a locale.
            locale: (hosted ? [ranges] : [ranges, ...defaults]).reduce((found, candidate) => found ?? matchLocale(candidate, available), undefined) ?? available[0],
            preferred: false,
        };
    };
    // The locales of the URL's host, which a translated pathname is read
    // among; no hostname is read without `domains`.
    const hostOf = (url) => {
        const hosted = hosting();
        return hosted !== UNHOSTED && typeof url.hostname === 'string' ? hosted.locales(url.hostname) : undefined;
    };
    // The pathname `reroute` serves, so the core loads the route rendered.
    const canonical = (url) => {
        const translated = translation();
        return translated === UNTRANSLATED ? url.pathname : translated.served(url.pathname, hostOf(url));
    };
    const server = serverHalf({ create, negotiate, locales, basePath: config.basePath, canonical, handOver: () => resolved().handOver });
    // Browser only: the tab's instance, the server's answer at the last commit,
    // the switch under way, what the last commit waits on, how many commits
    // there were, which only `use()` writes, and the tables the pass that built
    // the instance left when it activated it without a hand-off for a config
    // with a `cache: false` loader, until the first commit reads them. None of
    // it lives in `data`, which the app may hold in deep state. A server keeps
    // nothing between requests.
    const tab = { commits: 0 };
    // The wiring's own switch, while the locale has not moved from where it
    // started: that switch is no client change, while a locale that moved is.
    const underway = (i18n) => (tab.switching?.from === untrack(() => i18n.locale) ? tab.switching : undefined);
    // The locale the tab shows once the wiring's own switch lands.
    const heading = (i18n) => underway(i18n)?.to ?? untrack(() => i18n.locale);
    // The records an activation of `locale` on `route` leaves once every loader
    // it selects delivered, in `loaders` order as `snapshot()` lists them, or
    // `undefined` when none of them has `cache: false`, so the commit runs
    // nothing again, or one of them has no id, whose record no snapshot shows.
    const records = (locale, route) => {
        const selected = resolved().loaders.flatMap((loader) => {
            const params = loader.locale === locale || loader.locale === defaults[1] ? routeParams(loader.routes, route) : undefined;
            return params ? [{ id: loader.id, signature: paramsSignature(params), cache: loader.cache }] : [];
        });
        if (!selected.some(({ cache }) => cache === false))
            return undefined;
        const listed = selected.flatMap(({ id, signature }) => (id === null ? [] : [signature ? { id, signature } : { id }]));
        return listed.length === selected.length ? listed : undefined;
    };
    // Whether an instance still stands where the activation of `locale` on
    // `route` left it, with `tables`: nothing loading or landed since, its
    // records whole and every loader delivered, which a failed loader, another
    // load, a reconfiguration and an invalidation of what it loaded each undo.
    const stands = (i18n, locale, route, tables) => untrack(() => {
        if (i18n.loading || i18n.locale !== locale || i18n.rawTranslations !== tables)
            return false;
        const path = withoutBasePath(route, config.basePath);
        const expected = records(locale, path);
        if (!expected)
            return false;
        const envelope = i18n.snapshot({ records: true });
        return envelope.route === path && JSON.stringify(envelope.records) === JSON.stringify(expected);
    });
    const fallBack = (commit, switching) => {
        const lapse = { commit, switching };
        tab.lapse = lapse;
        void Promise.all([switching.landed, ...switching.stays]).then((outcomes) => { lapse.outcomes = outcomes; });
    };
    // The answer of the last commit. Once its switch and every stay committed
    // while that switch was under way settled, a failure that left the tab
    // short of the locale switched to leaves the answer to the next commit:
    // short, as long as the tab has not shown that locale since the switch
    // started, whoever's call landed it. A switch to the locale it started from
    // fell short unless a call landed.
    const answered = (i18n) => {
        const { lapse } = tab;
        if (!lapse?.outcomes || lapse.commit !== tab.commits || lapse.outcomes.every(Boolean))
            return tab.answer;
        const { outcomes, switching } = lapse;
        const { from, to, previous } = switching;
        if (untrack(() => i18n.locale) === to)
            switching.reached = true;
        return (from === to ? !outcomes.some(Boolean) : !switching.reached) ? previous : tab.answer;
    };
    const universalLoad = async (event) => {
        const route = canonical(event.url);
        const payload = event.data?.i18n;
        // A page render's own instance: the server branch loaded it for this very
        // payload, which SvelteKit hands over as it was returned.
        const rendered = BROWSER ? undefined : server.take(payload);
        const fresh = !BROWSER || !tab.i18n;
        const i18n = rendered ?? (fresh ? create() : tab.i18n);
        const surface = fresh ? pipe(i18n) : tab.surface;
        const via = underway(i18n);
        const seen = via?.to ?? untrack(() => i18n.locale);
        // A live server sends the tables on a page render only, so a later pass
        // that carries them read a prerendered file, whose locale was negotiated
        // at build time, without the visitor: it counts only when the build's
        // `preferredLocale` gave it. Node and Deno define `navigator.languages`
        // too, from the server's own environment.
        const prerendered = !fresh && payload?.translations;
        const follows = Boolean(prerendered && !payload.preferred);
        const answer = follows
            ? answered(i18n)
            : payload ? payload.locale : negotiate(event, BROWSER ? navigator.languages : undefined).locale;
        if (BROWSER)
            Object.assign(tab, { i18n, surface });
        let preloaded;
        if (fresh) {
            if (!rendered && payload?.translations)
                i18n.hydrate({ ...payload, translations: payload.translations });
            // No preload runs before the first navigation completes, so the pass
            // that builds the instance may activate it.
            await (answer ? i18n.loadTranslations(answer, route) : i18n.setRoute(route));
        }
        else {
            // The request of a navigation that may never commit, a hover's
            // included: it activates nothing, and its token lets the commit show
            // what it fetched. The commit switches to a changed answer, or else
            // stays.
            const target = (answer !== answered(i18n) ? answer : undefined) ?? heading(i18n);
            if (target)
                preloaded = await i18n.preload(target, route);
        }
        // Unless a hand-off holds it back, the commit would run a loader with
        // `cache: false` again for the very request this pass activated.
        if (BROWSER && fresh && !payload?.translations && !resolved().handOver)
            tab.activated = untrack(() => i18n.rawTranslations);
        const pass = { i18n, surface, locale: answer, follows, route, seen, via, preloaded };
        return { ...event.data, i18n: surface, [KEY]: pass };
    };
    const load = ((event) => (isServerEvent(event) ? server.load(event) : universalLoad(event)));
    const use = (data) => {
        const first = passOf(data());
        if (!first)
            throw new Error('[i18n]: `use()` found no data from `load`. Export `load` from the root `+layout.js`.');
        const { i18n, surface } = first;
        setContext(KEY, surface);
        // `data` moves only when a navigation commits; a preload leaves it. The
        // answer is compared with the last commit's, so a client `setLocale()`
        // stands until the server answers differently, and an answer given before
        // the active locale changed is stale.
        $effect.pre(() => {
            const pass = passOf(data());
            if (!pass)
                return;
            const first = !tab.commits;
            const { activated } = tab;
            // Read by the first commit alone: the tables would outlive their
            // replacement for the life of the tab.
            tab.activated = undefined;
            tab.answer = answered(pass.i18n);
            const commit = ++tab.commits;
            const now = heading(pass.i18n);
            // A switch that failed before this commit may have headed nowhere: its
            // undo puts back the locale it started from or the one the tab was
            // heading for, unless a later call landed the one it headed for.
            const current = now === pass.seen || (pass.via?.failed === true && (now === pass.via.from || now === pass.via.back));
            // A pass that takes the tab's answer never switches.
            const locale = pass.follows ? tab.answer : pass.locale;
            if (first || (locale !== tab.answer && current)) {
                const previous = tab.answer;
                tab.answer = locale;
                if (locale !== undefined) {
                    // The pass that built the instance activated it for this request:
                    // while it stands there, that activation is the commit's.
                    const taken = first && activated !== undefined && stands(pass.i18n, locale, pass.route, activated);
                    const switching = {
                        from: untrack(() => pass.i18n.locale),
                        back: now,
                        to: locale,
                        previous,
                        failed: false,
                        stays: [],
                        reached: false,
                        landed: (taken ? Promise.resolve() : pass.i18n.loadTranslations(locale, pass.route, { preloaded: pass.preloaded })).then(() => true, () => {
                            switching.failed = true;
                            return false;
                        }),
                    };
                    tab.switching = switching;
                    void switching.landed.then(() => {
                        if (tab.switching === switching)
                            tab.switching = undefined;
                    });
                    fallBack(commit, switching);
                    return;
                }
            }
            // A stay committed while what the previous commit waits on is under way
            // carries it on, unless the locale moved from where the switch started.
            const { lapse } = tab;
            const switching = lapse && !lapse.outcomes && lapse.commit === commit - 1 && lapse.switching.from === untrack(() => pass.i18n.locale)
                ? lapse.switching
                : undefined;
            const stayed = pass.i18n.setRoute(pass.route, { preloaded: pass.preloaded }).then(() => true, () => false);
            if (!switching)
                return;
            switching.stays = [...switching.stays, stayed];
            fallBack(commit, switching);
        });
        $effect(() => {
            const { locale } = i18n;
            if (!locale)
                return;
            const switching = tab.lapse?.switching;
            if (switching?.to === locale)
                switching.reached = true;
            document.documentElement.lang = locale;
            document.documentElement.dir = textDirection(locale);
        });
        return surface;
    };
    const get = () => {
        const surface = getContext(KEY);
        if (!surface)
            throw new Error('[i18n]: `get()` found no instance. Call `use(() => data)` in the root `+layout.svelte`.');
        return surface;
    };
    const reroute = ({ url }) => {
        const pathname = canonical(url);
        return pathname === url.pathname ? undefined : pathname;
    };
    const delocalize = (url) => {
        const hosted = hostOf(url);
        const { pathname, locale } = translation().canonical(url.pathname, hosted);
        const path = `${withoutBasePath(pathname, config.basePath)}${visible(url, 'search')}${visible(url, 'hash')}`;
        const domain = hosted?.[0];
        if (domain === undefined)
            return locale === undefined ? { path } : { path, locale };
        return locale === undefined ? { path, domain } : { path, locale, domain };
    };
    const localizePath = (path, locale) => translation().localizePath(path, locale);
    const base = typeof config.basePath === 'string' ? config.basePath.replace(/\/+$/, '') : '';
    const localizeHref = (path, locale, from) => {
        const localized = localizePath(path, locale);
        if (typeof localized !== 'string' || localized[0] !== '/' || localized[1] === '/')
            return localized;
        const origin = typeof locale === 'string' ? hosting().origin(locale, from === undefined || from === null ? undefined : from.hostname) : undefined;
        return `${origin ?? ''}${base}${localized}`;
    };
    return { handle: server.handle, load, use, get, reroute, delocalize, localizePath, localizeHref };
};
