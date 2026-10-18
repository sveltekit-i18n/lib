import { untrack } from 'svelte';
import { capturesParams, dotNotates, fetchTranslation, hasOwn, loaderName, maskOutputKeys, maskTranslations, mergeFetched, mergeTranslations, omitProtoKeys, paramsSignature, read, resolveLoaders, routeParams, sanitizerFactory, sanitizeTranslationLocales, serialize, servedLocales, toDotNotation, translate, unique, withoutBasePath } from './utils.js';
import { logError, logger, loggerFactory, setLogger } from './logger.js';
const defaultCache = Number.POSITIVE_INFINITY;
const unasked = { config: undefined, signatures: new Map() };
const noLoaders = [];
/**
 * A top-level key holding part of `namespace` — the namespace itself or a key
 * flattened out of it. Keys are strings, so an off-contract namespace that is
 * not one holds none of them.
 */
const isNamespaceKey = (key, namespace) => typeof namespace === 'string' && (key === namespace || key.startsWith(`${namespace}.`));
/** What the log says of a load of `locale` on `route` whose data could not be applied. */
const loadFailure = (locale, route) => `Failed to load translations for '${locale}' locale${route ? ` and '${route}' route` : ''}.`;
class I18nCore {
    // -- reactive state ---------------------------------------------------------
    /**
     * Raw, as are the tables: each is replaced whole, never changed in place,
     * and deep state would hand back proxies of what it holds in the browser —
     * loaders no key of `#deliveries` or the records matches, and tables a
     * structured clone rejects.
     */
    #config = $state.raw(undefined);
    /** The ACTIVE locale — advances only after its translations resolved. */
    #locale = $state(undefined);
    /**
     * The locale the next trigger loads: the one most recently asked for, unless
     * control flow failed that call and put back what it replaced. Loads fire
     * once a route exists too.
     */
    #requestedLocale = $state(undefined);
    #route = $state(undefined);
    #rawTranslations = $state.raw({});
    #translations = $state.raw({});
    /** Replaced immutably on every change so `loading` recomputes. */
    #pending = $state(new Set());
    /** Locale normalization, as `config.sanitizeLocales` asks for it. */
    #sanitize = $derived(sanitizerFactory(this.#config?.sanitizeLocales));
    // -- plain internal state ---------------------------------------------------
    // Load records keep a loader from running twice. A loader's own record holds
    // the params signature it last delivered for; a namespace record stands for
    // a namespace a plain hand-off delivered, and keeps its loaders from fetching
    // it again unless their params ask for other data. Seeded data records
    // nothing.
    #loaderRecords = new Map();
    // Null prototype: these tables are indexed by user-supplied locales, and a
    // plain object would resolve a '__proto__' assignment via the setter.
    #namespaceRecords = Object.create(null);
    // What each source last put into a namespace, so a loader whose params
    // changed can replace its own part and leave its siblings' in place. Kept
    // apart from the records: invalidation drops those, not what is displayed,
    // and a reconfiguration hands them on to the same loaders of the new config.
    #deliveries = new Map();
    // The delivery each seed's masked copy in `#deliveries` stands for: a seed is
    // no replacement, so what counts on a delivery counts on its copy.
    #maskedFrom = new WeakMap();
    #externalTranslations = {};
    // The params signature the next trigger asks each loader for:
    // the one the most recent call asked for, unless a failed call put an
    // earlier one's back, and `null` for a loader its route does not select.
    // Loads settle out of order, and a delivery for params the route no longer
    // asks for must not replace what it displays; a warm load asks for nothing.
    // Replaced whole, never changed in place, so a call keeps what it replaced
    // by reference.
    #wanted = unasked;
    // What `#localeLoaders` found for each locale, under the config it read.
    #byLocale = { config: undefined, loaders: new Map() };
    // The latest delivery of each loader for params nothing wanted yet — a warm
    // load of another route's params, typically a preload — so the trigger that
    // wants them applies it instead of fetching again. One per loader, as a
    // router keeps one preload. It starts its locale's `cache` window, and
    // invalidation drops it with the records.
    #parked = new Map();
    // What a hand-off delivered for the loaders with `cache: false`, whose
    // records keep no trigger that selects them from running them. It serves the
    // pass it arrived with: until an activating trigger asks for another locale
    // or route than the hand-off named, or than the first activating trigger
    // after it where the hand-off named none, or until a preload, the request
    // of a navigation.
    #handedOff = new Map();
    #handOffPass = {};
    /** When each locale first received data — drives the `cache` expiry. */
    #loadedAt = Object.create(null);
    /**
     * Loads in flight, each under the key of what its trigger selected; a
     * trigger with the same key shares the promise of one that delivers all it
     * has to fetch. `calls` holds the activating calls that share it, so a
     * warm load joined by one activates when it settles, or fails them as an
     * activating load does. `unparked` holds the parked deliveries its calls
     * claimed, which it applies when it settles. `severed` holds the loaders, of
     * either kind, an invalidation cut off while the load was in flight.
     */
    #inflight = new Set();
    // The loaders' fetches in flight, which loads from the same route share
    // wherever their selections differ.
    #fetches = new Set();
    // The control flow of a shared fetch already reported: every load it
    // rejects gets it, and it was thrown once.
    #reported = new WeakSet();
    /**
     * The activating calls since the last one whose load resolved without
     * failing, oldest first. A failed call is undone while it is the last, so a
     * call that came later and has not failed keeps what it asked for.
     */
    #calls = [];
    // Moved by `invalidate()` and by a reconfiguration: a preload's answers
    // predate one that moved it. Expiry leaves it: a preload judged the window
    // at its own request, and a later request's judgement is no newer for it.
    #epoch = 0;
    // What each token of `preload()` stands for, until a call reads it.
    #preloads = new WeakMap();
    #destroyed = false;
    constructor(config) {
        if (config)
            void this.loadConfig(config);
        // A constructor may return a substitute object: the instance is folded
        // through `config.extensions` left to right, so `new I18n(config)`
        // evaluates to the last extension's output. The extensions run after the
        // synchronous part of the config load — they receive a configured instance.
        return (config?.extensions ?? []).reduce((acc, extension) => extension(acc), this);
    }
    // -- reactive reads ---------------------------------------------------------
    /**
     * The active locale. Reading it is reactive; assigning it is a shorthand for
     * a fire-and-forget `setLocale()` — the value therefore updates once the
     * locale's translations resolved, not synchronously on assignment. It does
     * not advance when a loader throws SvelteKit's `redirect()` or an `error()`
     * below 500, which an assignment only logs.
     */
    get locale() {
        return this.#locale;
    }
    set locale(value) {
        if (value)
            void this.setLocale(value);
    }
    get translations() {
        return this.#translations;
    }
    get rawTranslations() {
        return this.#rawTranslations;
    }
    loading = $derived(this.#pending.size > 0);
    locales = $derived.by(() => {
        if (!this.#config)
            return [];
        // Loader locales are sanitized once, when the config resolves them, and
        // table locales once, when their data arrives; a custom `sanitizeLocales`
        // need not be idempotent.
        return this.#served();
    });
    // Svelte memoizes a server `$derived` only when it is created during a
    // render, which an instance is not, so `locales` is not memoized there.
    #loaderLocales = { loaders: noLoaders, locales: [] };
    /**
     * The locales the config and the tables serve, as a fresh array. The
     * loaders' are read once per loader list, the tables' on every call: a
     * navigation to new params replaces the tables, so a memo keyed by them
     * would miss on each one, adding a lookup and an entry per navigation,
     * held until a later collection.
     */
    #served() {
        if (!this.#config)
            return [];
        const { loaders = noLoaders } = this.#config;
        if (this.#loaderLocales.loaders !== loaders)
            this.#loaderLocales = { loaders, locales: servedLocales(loaders, {}) };
        return unique([...this.#loaderLocales.locales, ...Object.keys(this.#translations)]);
    }
    initialized = $derived(this.#locale !== undefined && this.#route !== undefined && Object.keys(this.#translations).length > 0);
    /**
     * Translates `key` for the active locale. Reactive on two levels: the
     * returned function reads the tables at CALL time, so a destructured `t`
     * keeps translating against live state, and its identity is refreshed
     * whenever the config, the tables or the locale change, so merely holding
     * the reference is tracked too.
     */
    t = $derived.by(() => {
        void this.#config;
        void this.#translations;
        void this.#locale;
        return (key, ...params) => this.#translate(this.#locale, key, params);
    });
    /** Like `t`, for an explicit locale. */
    l = $derived.by(() => {
        void this.#config;
        void this.#translations;
        return (locale, key, ...params) => {
            const [sanitizedLocale = locale] = this.#sanitize(locale);
            return this.#translate(sanitizedLocale, key, params);
        };
    });
    // -- configuration ----------------------------------------------------------
    /** Applies a config and returns the `initLocale` load. The public entry is `loadConfig`. */
    #configLoader(config) {
        if (!config) {
            logger.error('No config provided!');
            return Promise.resolve();
        }
        // `extensions` is a construction-time directive, not configuration state —
        // it is consumed by the constructor and must not land in `#config`.
        const { initLocale, fallbackLocale, translations, log, extensions, ...rest } = config;
        if (log)
            setLogger(loggerFactory(log));
        const sanitize = sanitizerFactory(rest.sanitizeLocales);
        const [sanitizedInitLocale] = sanitize(initLocale);
        const [sanitizedFallbackLocale] = sanitize(fallbackLocale);
        const loaders = resolveLoaders(rest.loaders, rest.sanitizeLocales);
        logger.debug('Setting config.');
        this.#config = {
            initLocale: sanitizedInitLocale,
            fallbackLocale: sanitizedFallbackLocale,
            translations,
            ...rest,
            loaders,
        };
        // Report-only: the loader still runs, but `.` is the dot-notation
        // separator, so a dotted namespace collides with the flattened one.
        // `String` rather than a template literal — interpolating a Symbol throws,
        // and a config-time report must not abort the rest of the config load.
        loaders.forEach(({ namespace }) => {
            const name = namespace == null ? '' : String(namespace);
            if (name.includes('.')) {
                logger.error(`Invalid '${name}' loader namespace. It shouldn't include the '.' character.`);
            }
        });
        // A reconfiguration can swap loaders or cache policy — bookkeeping from
        // the previous config must not suppress the new loaders.
        this.invalidate();
        this.#handOnDeliveries(loaders);
        if (translations)
            this.addTranslations(translations);
        return sanitizedInitLocale ? this.loadTranslations(initLocale) : Promise.resolve();
    }
    /**
     * Public entry for (re)configuration. It returns the promise of the
     * `initLocale` load, which reports its own failure; a config that fails to
     * apply is reported here. Either way the promise is marked handled, so a
     * fire-and-forget call cannot become an unhandled rejection; an awaiting
     * caller still receives it.
     */
    loadConfig = (config) => untrack(() => {
        if (this.#inert('loadConfig'))
            return Promise.resolve();
        // Not async: the `initLocale` load's own promise is returned as it is, and
        // a config that throws is caught here instead of escaping the constructor.
        try {
            return this.#configLoader(config);
        }
        catch (error) {
            logError('Failed to load the i18n config.', error);
            // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- passed on as thrown
            const promise = Promise.reject(error);
            promise.catch(() => undefined);
            return promise;
        }
    });
    // -- loading ----------------------------------------------------------------
    // The loading calls — these, `loadNamespace()` and `loadConfig()` — and
    // `addTranslations()` and `hydrate()` read the state they write, untracked:
    // called from an effect, they must not make it depend on that state, or the
    // effect runs them again whenever a later call, a load or an undo changes it.
    setLocale = (locale) => untrack(() => {
        if (!locale || this.#inert('setLocale') || this.#unserved(locale))
            return Promise.resolve();
        const call = this.#ask({ locale, route: this.#route });
        if (locale !== this.#requestedLocale) {
            logger.debug(`Setting '${locale}' locale.`);
            this.#requestedLocale = locale;
        }
        // Delegated even for a repeated value — the caller awaits "this locale is
        // loaded", which may mean joining a load already in flight.
        return this.#stand(call, this.#route !== undefined ? this.#load(locale, this.#route, call) : Promise.resolve());
    });
    /**
     * With `{ preloaded }`, the token of a `preload()` for the requested locale
     * and this route, it shows what that preload fetched — see
     * `loadTranslations()`.
     */
    setRoute = (input, options) => untrack(() => {
        if (this.#inert('setRoute'))
            return Promise.resolve();
        const route = withoutBasePath(input, this.#config?.basePath);
        const call = this.#ask({ locale: this.#requestedLocale, route });
        if (route !== this.#route) {
            logger.debug(`Setting '${route}' route.`);
            this.#route = route;
        }
        return this.#stand(call, this.#requestedLocale !== undefined ? this.#load(this.#requestedLocale, route, call, undefined, options?.preloaded) : Promise.resolve());
    });
    /**
     * `{ activate: false }` only fills the tables: it leaves the requested
     * locale, the route and `locale` untouched and does not count towards
     * `loading` — what is rendered does not change: data of a loader whose route
     * params differ from the ones the current route asks for is kept aside, the
     * latest per loader, and the activating trigger that asks for them applies
     * it. It
     * leaves `cache` expiry to the next activating trigger. A loader's
     * `redirect()` or `error()` below 500 rejects it all the same.
     *
     * `{ preloaded }` hands an activating call the token of a `preload()` for
     * the same locale and route. The call then evaluates no `cache` window — the
     * preload did — and shows what the preload fetched instead of fetching it
     * again, at once when nothing else is left to fetch, and otherwise with the
     * rest, in one go. It fetches what the preload did not deliver, and what it
     * delivered to a loader that shows something else since — a seed or
     * another delivery replaced what it showed — wherever the call has that
     * loader to load anyway (one with `cache: false`, or one whose record an
     * expiry dropped, say). A token serves one call: the first activating call
     * that reads it spends it, whether or not it serves that call, even with
     * nothing left to fetch; a call left without a locale to show — handed an
     * empty one or one nothing serves, say — reads none. Another instance's,
     * one of another locale or route, one spent already and one older than a
     * `loadConfig()` or an `invalidate()` are ignored, as is any with
     * `{ activate: false }`, which leaves it unspent. A window a later request
     * found elapsed does not void it: the preload judged the window at its own
     * request.
     */
    loadTranslations = (locale, route, { activate = true, preloaded } = {}) => untrack(() => {
        if (!locale || this.#inert('loadTranslations') || this.#unserved(locale))
            return Promise.resolve();
        const target = route === undefined ? this.#route ?? '' : withoutBasePath(route, this.#config?.basePath);
        if (!activate)
            return this.#load(locale, target);
        const call = this.#ask({ locale, route: target });
        this.#requestedLocale = locale;
        this.#route = target;
        return this.#stand(call, this.#load(locale, target, call, undefined, preloaded));
    });
    /**
     * A request for `locale` on `route` (the current route by default) that
     * shows nothing new by itself: what a router's `load` runs ahead of a
     * navigation, a hover's included. Like an activating call it evaluates the
     * `cache` window, ends the pass a hand-off serves, and runs a loader with
     * `cache: false` — sharing a fetch of it for the same params and route
     * already in flight. Like `{ activate: false }` it writes neither the locale
     * nor the route, does not count towards `loading`, and lands what it fetched
     * as a warm load does. It resolves to a token for the next activating call of
     * that locale and route, which shows what it fetched (see
     * `loadTranslations()`), and to `undefined` once the instance was destroyed
     * or when nothing serves the locale. A loader's `redirect()` or `error()`
     * below 500 rejects it, unless it shares its load with an activating call,
     * whose outcome it then gets; one nobody awaits never becomes an unhandled
     * rejection.
     */
    preload = (locale, route) => untrack(() => {
        const resolved = !locale || this.#inert('preload') || this.#unserved(locale) ? undefined : this.#resolveLocale(locale);
        if (!resolved)
            return Promise.resolve(undefined);
        const target = route === undefined ? this.#route ?? '' : withoutBasePath(route, this.#config?.basePath);
        this.#invalidateExpired(resolved, this.#config?.fallbackLocale);
        this.#handedOff.clear();
        const config = this.#config;
        const epoch = this.#epoch;
        const matching = this.#matchLoaders(resolved, target);
        const key = this.#inflightKey(resolved, target, matching);
        const requests = this.#unloaded(matching);
        const fresh = requests.filter(({ loader }) => loader.cache === false);
        const fetching = new Set(this.#fetches);
        const isFresh = ({ request }) => fresh.some(({ loader, signature }) => request.loader === loader && request.signature === signature);
        const earlier = Array.from(this.#inflight).filter(({ fetches }) => fetches.some((fetch) => fetch.route !== target && isFresh(fetch)));
        // A fetch of a loader with `cache: false` that delivered before the request
        // is no answer to it, so a load that holds one is not joined.
        const joinable = requests.length ? this.#joinable(key, requests) : undefined;
        const joined = joinable?.fetches.filter(isFresh).every((fetch) => this.#fetches.has(fetch)) ? joinable : undefined;
        const entry = joined ?? (requests.length ? this.#start(resolved, target, key, requests, [], []) : undefined);
        const fetches = entry?.fetches ?? [];
        const preloaded = (entry?.promise ?? Promise.resolve()).then(() => Promise.all(fetches.map(({ outcome }) => outcome))).then((fetched) => {
            if (this.#destroyed)
                return undefined;
            const answers = requests.flatMap(({ loader, signature }) => {
                const index = fetches.findIndex(({ request }) => request.loader === loader && request.signature === signature);
                const [delivery] = fetched[index]?.deliveries ?? [];
                const shared = loader.cache === false && (joined !== undefined || fetching.has(fetches[index]));
                return delivery ? [{ delivery, shown: this.#deliveries.get(loader), shared }] : [];
            });
            const token = Object.freeze(Object.create(null));
            this.#preloads.set(token, { config, epoch, locale: resolved, route: target, answers, earlier: earlier.filter((load) => this.#inflight.has(load)) });
            return token;
        });
        preloaded.catch(() => undefined);
        return preloaded;
    });
    /**
     * Loads one namespace for the active locale (or `locale`), whatever the
     * routes of its loaders say — for what an interaction needs rather than a
     * route: a modal, a panel, an editor. Warm, like `{ activate: false }`: it
     * changes neither the locale nor `loading`, and it leaves `cache` expiry to
     * the next activating trigger. It honours the load records, so calling it
     * on every interaction fetches once — a loader with `cache: false` runs each
     * time on its routes — and what it loads stays loaded across routes. A
     * loader's `redirect()` or `error()` below 500 rejects it.
     */
    loadNamespace = (namespace, locale) => untrack(() => {
        if (this.#inert('loadNamespace'))
            return Promise.resolve();
        const target = locale ?? this.#locale;
        if (!target)
            return Promise.resolve();
        return this.#load(target, this.#route ?? '', undefined, namespace);
    });
    /**
     * Marks loaded translations stale — for one locale or all of them, and for
     * one namespace or all of them. Loaders run again on the NEXT load trigger;
     * the call itself starts no load and keeps the currently displayed
     * translations in place. A loader still in flight for what was invalidated
     * is severed: its load settles, but what it returns or throws is discarded —
     * it predates the invalidation — and an activating trigger fetches it again,
     * once, before its locale activates. It leaves it to the next trigger when
     * another loader of its load threw SvelteKit's control flow that still
     * counts, which rejects the trigger, and when the refetch is severed too. A
     * namespace invalidation leaves the locale's `cache` window where it was.
     */
    invalidate = (locale, namespace) => {
        if (this.#inert('invalidate'))
            return;
        const [sanitized] = locale === undefined ? [] : this.#sanitize(locale);
        if (locale !== undefined && sanitized === undefined)
            return;
        this.#invalidate(sanitized, namespace);
    };
    addTranslations = (translations) => untrack(() => {
        if (this.#inert('addTranslations'))
            return;
        this.#addTranslations(translations);
    });
    /**
     * Drops the bookkeeping `invalidate()` names and severs its loaders in
     * flight. `config.cache` does not cover a loader with `cache: false`, so
     * expiry leaves it alone.
     */
    #invalidate(sanitized, namespace, { expiry = false } = {}) {
        if (!expiry)
            this.#epoch += 1;
        const locales = sanitized === undefined ? Object.keys(this.#namespaceRecords) : [sanitized];
        locales.forEach((recorded) => {
            if (namespace === undefined)
                delete this.#namespaceRecords[recorded];
            else
                this.#namespaceRecords[recorded] = (read(this.#namespaceRecords, recorded) || []).filter((name) => name !== namespace);
        });
        if (namespace === undefined) {
            if (sanitized === undefined)
                this.#loadedAt = Object.create(null);
            else
                delete this.#loadedAt[sanitized];
        }
        const covers = (loader) => !(expiry && loader.cache === false)
            && (sanitized === undefined || loader.locale === sanitized)
            && (namespace === undefined || loader.namespace === namespace);
        this.#loaderRecords.forEach((_, loader) => {
            if (covers(loader))
                this.#loaderRecords.delete(loader);
        });
        this.#handedOff.forEach((_, loader) => {
            if (covers(loader))
                this.#handedOff.delete(loader);
        });
        this.#parked.forEach((_, loader) => {
            if (covers(loader))
                this.#parked.delete(loader);
        });
        // Applying their pre-invalidation data would resurrect the bookkeeping
        // dropped above, permanently suppressing the promised refetch.
        this.#sever(covers);
    }
    /**
     * Restores the state `snapshot({ records: true })` captured on another
     * instance: its data, its load records, the active locale and the route.
     * A loader named by a record does not run again for the same params — one
     * with `cache: false` only for the pass the envelope arrived with; data no
     * record names is displayed but keeps no loader from running. An envelope
     * without `records` is a plain hand-off instead: every namespace its data
     * names keeps its loaders without params from running, and holds one with
     * `cache: false` back for that pass. Nothing
     * happens for `undefined`, so a load whose server half sent nothing can call
     * it unconditionally.
     */
    hydrate = (envelope) => untrack(() => {
        if (!envelope || this.#inert('hydrate'))
            return;
        // Typically `initLocale`: the constructor started its load before the
        // records could keep the loaders from running.
        if (this.#inflight.size)
            logger.warn('Hydrating after a load started: its loaders ran regardless of the hand-off.');
        const { translations = {}, records, seeds = {}, locale, route } = envelope;
        if (records)
            this.#hydrateRecords(translations, records, seeds);
        else
            this.#hydratePlain(translations);
        this.#handOffPass = { locale, route };
        // A hand-off stands: no call before it is put back.
        this.#calls = [];
        if (route !== undefined)
            this.#route = route;
        if (locale !== undefined) {
            this.#requestedLocale = locale;
            this.#locale = locale;
        }
        const resolved = this.#resolveLocale(locale);
        if (resolved !== undefined && route !== undefined)
            this.#want(this.#matchLoaders(resolved, route));
    });
    /**
     * Serializes what this instance holds for the active locale and the fallback
     * locale. The result is shaped like `config.translations`, and a client
     * hands it over with `hydrate({ translations })`: a plain hand-off, whose
     * namespace records keep the matching loaders without params from fetching
     * it again and hold one with `cache: false` back for that pass. Passed to
     * `addTranslations()` or assigned to `config.translations` it only seeds,
     * and every loader runs again.
     * A namespace plain data cannot hand over is left out, for the client to
     * load: one fed by several loaders, whose record would suppress a part the
     * payload lacks; one whose loader's routes can capture params, whose data a
     * plain hand-off keeps as data no loader delivered, so the next params could
     * not replace it; and one none of whose loaders delivered here and no
     * hand-off named, whose seeded data would keep the client's loaders from
     * ever running.
     * A literal `__proto__` key is left out too, and with records its
     * namespace's loaders are, and a namespace whose loader captures params,
     * without them a namespace a loader serves, so the client loads it whole: the serializer SvelteKit hands load data to refuses an
     * object that carries one. A locale
     * named `__proto__` is left out altogether.
     *
     * `{ records: true }` returns an envelope for `hydrate()` instead: the same
     * data, the loaders that delivered it, the active locale and the route. The
     * records name each loader, so a namespace fed by several loaders is handed
     * over too, and so is one a loader delivered for route params while its
     * record says so — not a namespace with both, whose data the client could
     * not split between them. What was seeded into the namespace of a recorded
     * loader, or of one whose routes capture params, travels apart as `seeds`,
     * so it outlives the loader's next fetch there, and reaches the client
     * where the namespace is left out.
     */
    snapshot = ((options) => {
        const withRecords = options?.records === true;
        const { fallbackLocale, loaders = [] } = this.#config ?? {};
        // Both are held sanitized, the way the loaders key their data.
        const locales = unique([this.#locale, fallbackLocale].filter((locale) => !!locale));
        const omitted = new Map(locales.map((locale) => [locale, this.#unsnapshottable(locale, withRecords)]));
        const isOmitted = (locale, key) => (omitted.get(locale) ?? []).some((namespace) => isNamespaceKey(key, namespace));
        // The top-level keys each locale lost a literal `__proto__` key under: a
        // record of their namespace would suppress the part the payload lacks.
        const stripped = new Map();
        const translations = locales.reduce((acc, locale) => {
            const data = read(this.#rawTranslations, locale);
            if (!data)
                return acc;
            if (locale === '__proto__') {
                logger.warn('Leaving the \'__proto__\' locale out of the snapshot: load data cannot carry it.');
                return acc;
            }
            const handable = Object.fromEntries(Object.entries(data).filter(([key]) => !isOmitted(locale, key)));
            const relevant = omitProtoKeys(handable);
            let kept = relevant;
            if (relevant !== handable) {
                logger.warn(`Leaving a '__proto__' key of locale '${locale}' out of the snapshot: load data cannot carry it.`);
                const lost = Object.keys(handable).filter((key) => !hasOwn(relevant, key) || !Object.is(relevant[key], handable[key]));
                stripped.set(locale, lost);
                // The namespace goes without its record, whole: data plain or unrecorded
                // is kept on the client as data no loader delivered, which a plain
                // hand-off marks loaded and new params could not replace. It goes for
                // the client to load instead — with records, only where params can
                // change. One no loader serves keeps the rest.
                const served = loaders
                    .filter((loader) => loader.locale === locale && (!withRecords || capturesParams(loader.routes)))
                    .filter((loader) => lost.some((key) => isNamespaceKey(key, loader.namespace)))
                    .map(({ namespace }) => namespace);
                kept = Object.fromEntries(Object.entries(relevant).filter(([key]) => !served.some((namespace) => isNamespaceKey(key, namespace))));
            }
            // An empty entry would still stamp the locale's freshness on the client,
            // starting its `cache` window on data it never received.
            if (!Object.keys(kept).length)
                return acc;
            return { ...acc, [locale]: kept };
        }, {});
        if (!withRecords)
            return translations;
        // A loader without an id cannot be named off-process: its data travels as
        // data alone, and the client runs it again.
        const records = loaders.flatMap((loader) => {
            const { id, locale, namespace } = loader;
            const signature = this.#loaderRecords.get(loader);
            if (id === null || signature === undefined || !omitted.has(locale) || locale === '__proto__' || isOmitted(locale, namespace))
                return [];
            if ((stripped.get(locale) ?? []).some((key) => isNamespaceKey(key, namespace)))
                return [];
            return [signature ? { id, signature } : { id }];
        });
        // The client takes a recorded namespace whole as its loader's delivery,
        // and loads one left out where params can change itself, so what was
        // seeded into either travels apart: the seed has to outlive the delivery
        // the next fetch replaces there as it does here.
        const recorded = new Set(records.map(({ id }) => id));
        const seeds = omitProtoKeys(this.#externalOf(loaders.filter(({ id, locale, routes }) => omitted.has(locale) && locale !== '__proto__' && (capturesParams(routes) || (id !== null && recorded.has(id))))));
        return {
            translations,
            records,
            ...(Object.keys(seeds).length ? { seeds } : {}),
            ...(this.#locale === undefined ? {} : { locale: this.#locale }),
            ...(this.#route === undefined ? {} : { route: this.#route }),
        };
    });
    /**
     * Detaches the instance from its loading lifecycle: in-flight loads settle
     * with whatever their loaders return or throw discarded, `loading` drops to
     * `false`, and every further load or mutation call is ignored with a warning.
     * Reads (`t`, `l`, `locale`, `translations`, `snapshot`) keep working, so a
     * component still tearing down renders its last state instead of breaking.
     * Idempotent.
     */
    destroy = () => {
        if (this.#destroyed)
            return;
        logger.debug('Destroying the i18n instance.');
        this.#destroyed = true;
        // Severed rather than awaited: a settled load then applies nothing.
        this.#sever(() => true);
        this.#pending = new Set();
    };
    // -- internals --------------------------------------------------------------
    #translate(locale, key, params) {
        const config = this.#config;
        const translations = this.#translations;
        const fallbackLocale = config?.fallbackLocale;
        return translate(config, locale, key, params, locale ? read(translations, locale) : undefined, fallbackLocale ? read(translations, fallbackLocale) : undefined);
    }
    /**
     * The fetches of `requests` from `route`, WITHOUT applying their data: each
     * joins the one in flight for the same loader, params and route, and `run`
     * starts the rest. Those are registered before `run` calls any loader, so a
     * loader that starts a load of its own route joins its own fetch instead of
     * running again. A fetch that delivered stays in the table until a load
     * waiting on it has applied or parked the delivery; any other, and one of a
     * loader with `cache: false`, leaves it with its outcome, so the next load
     * runs the loader again. The `cache` expiry is evaluated by load triggers,
     * not here.
     */
    #fetch(requests, route) {
        const started = [];
        const fetches = requests.map((request) => {
            const shared = Array.from(this.#fetches).find((fetch) => fetch.route === route
                && fetch.request.loader === request.loader
                && fetch.request.signature === request.signature);
            if (shared)
                return shared;
            let outcome;
            const fetch = { request, route, outcome: new Promise((resolve, reject) => { outcome = { resolve, reject }; }) };
            this.#fetches.add(fetch);
            started.push({ fetch, outcome });
            return fetch;
        });
        const run = () => {
            if (started.length)
                logger.debug('Fetching translations...');
            started.forEach(({ fetch, outcome }) => {
                const release = (fetched) => {
                    if (!fetched?.deliveries.length || fetch.request.loader.cache === false)
                        this.#fetches.delete(fetch);
                };
                fetchTranslation(fetch.request, route).then((fetched) => {
                    release(fetched);
                    outcome.resolve(fetched);
                }, (reason) => {
                    release();
                    outcome.reject(reason);
                });
            });
        };
        return { fetches, run };
    }
    /**
     * Gives each delivery of the previous config to the loader of the new one
     * with the same id, or else to the one loader that runs the same function
     * for the same locale and namespace when no other delivery came from that
     * function there: a `{ ...config, … }` hands its loaders over as they were,
     * whatever became of their routes. Its params can then still replace it.
     * What no loader can take over is kept as data supplied without a loader, so
     * a namespace rebuilt later keeps it rather than losing it.
     */
    #handOnDeliveries(loaders) {
        const byId = new Map(loaders.flatMap((loader) => (loader.id === null ? [] : [[loader.id, loader]])));
        const deliveries = Array.from(this.#deliveries.values());
        const byIdTaken = new Map(deliveries.flatMap((delivery) => {
            const taker = delivery.loader.id === null ? undefined : byId.get(delivery.loader.id);
            return taker ? [[delivery, taker]] : [];
        }));
        const free = loaders.filter((loader) => !Array.from(byIdTaken.values()).includes(loader));
        const rest = deliveries.filter((delivery) => !byIdTaken.has(delivery));
        const runsAs = (a) => (b) => a.loader === b.loader && a.locale === b.locale && a.namespace === b.namespace;
        const byFunction = rest.flatMap((delivery) => {
            const [only, ...more] = free.filter(runsAs(delivery.loader));
            const alone = rest.filter((other) => runsAs(delivery.loader)(other.loader)).length === 1;
            return only && !more.length && alone ? [[delivery, only]] : [];
        });
        const takers = new Map([...byIdTaken, ...byFunction]);
        const orphaned = deliveries.filter((delivery) => !takers.has(delivery));
        this.#deliveries = new Map(deliveries.flatMap((delivery) => {
            const taker = takers.get(delivery);
            return taker ? [[taker, { ...delivery, loader: taker }]] : [];
        }));
        this.#keepExternal(serialize(orphaned.map(({ loader, data }) => ({ ...loader, data }))));
    }
    /**
     * Applies what loaders delivered and records them as loaded. A loader that
     * delivered before, for the same params or for others, replaces the part of
     * its namespace it delivered then: the namespace is rebuilt from the data
     * supplied without a loader and from what each of its loaders last
     * delivered, so no key its source dropped survives and a sibling's part
     * stays in place. The preprocessed table of a
     * locale that lost data is derived whole from the merged raw one, never
     * merged, since a custom `preprocess` may have renamed the keys that would
     * have to go and that table is what `preprocess` makes of the raw one. Both
     * tables are computed before anything is written, so a `preprocess` that throws
     * records no loader and the next trigger fetches it again.
     */
    #applyDeliveries(applied) {
        // One load, however its deliveries were gathered: a preload claimed with
        // it comes first, yet the loader declared later still wins. Only the order
        // within a locale matters, so each delivery is placed once, among the
        // loaders of its own locale.
        const deliveries = applied
            .map((delivery) => ({ delivery, position: this.#localeLoaders(delivery.loader.locale).indexOf(delivery.loader) }))
            .sort((a, b) => a.position - b.position)
            .map(({ delivery }) => delivery);
        const replaced = deliveries
            .filter(({ loader }) => this.#deliveries.has(loader))
            .map(({ loader }) => loader);
        const delivered = new Set(deliveries.map(({ loader }) => loader));
        const isReplaced = ({ locale, namespace }) => replaced.some((loader) => loader.locale === locale && loader.namespace === namespace);
        // In the order they were delivered, so across loads the data delivered
        // last wins, as it does where nothing is rebuilt.
        const rebuilt = [
            ...Array.from(this.#deliveries.values()).filter(({ loader }) => isReplaced(loader) && !delivered.has(loader)),
            ...deliveries.filter(({ loader }) => isReplaced(loader)),
        ];
        const raw = replaced.reduce((acc, { locale, namespace }) => ({
            ...acc,
            [locale]: Object.fromEntries(Object.entries(read(acc, locale) ?? {}).filter(([key]) => !isNamespaceKey(key, namespace))),
        }), this.#rawTranslations);
        const derived = unique(replaced.map(({ locale }) => locale));
        const seeded = this.#merged({ raw, translations: this.#translations }, this.#externalOf(replaced), derived);
        const merged = this.#merged(seeded, serialize([
            ...deliveries.filter(({ loader }) => !isReplaced(loader)),
            ...rebuilt,
        ].map(({ loader, data }) => ({ ...loader, data }))), derived);
        const translations = derived.reduce((acc, locale) => ({ ...acc, [locale]: this.#preprocess(read(merged.raw, locale)) }), merged.translations);
        deliveries.forEach((delivery) => this.#record(delivery));
        this.#rawTranslations = merged.raw;
        this.#translations = translations;
        this.#stamp(deliveries.filter(({ loader }) => loader.cache !== false).map(({ loader }) => loader.locale));
    }
    /**
     * Merges seeded data. It records no namespace, so the namespace's loaders
     * still run and merge into it, and it starts no `cache` window. It is kept to
     * rebuild a namespace a loader later replaces its part of.
     */
    #addTranslations(translations) {
        if (!translations)
            return;
        const sanitized = sanitizeTranslationLocales(translations, this.#sanitize);
        this.#addSanitized(sanitized);
    }
    #addSanitized(sanitized) {
        this.#mergeTranslations(sanitized);
        this.#keepExternal(sanitized);
        const { preprocess } = this.#config ?? {};
        // Seeded over what a loader delivered before, so a rebuild of the
        // namespace, which lays the seeds under every delivery, keeps it on top
        // until that loader delivers again.
        this.#deliveries.forEach((delivery, loader) => {
            const own = Object.entries(read(sanitized, loader.locale) ?? {}).filter(([key]) => isNamespaceKey(key, loader.namespace));
            if (!own.length)
                return;
            const nested = read(read(sanitized, loader.locale), loader.namespace);
            const masked = nested === undefined ? delivery.data : maskTranslations(delivery.data, nested) ?? {};
            // Dot notation, as `#preprocess` applies it, merges both spellings of a
            // key into one.
            const dotted = dotNotates(preprocess)
                ? maskOutputKeys(masked, new Set(Object.keys(toDotNotation(Object.fromEntries(own), preprocess === 'preserveArrays') ?? {})), loader.namespace, preprocess === 'preserveArrays') ?? {}
                : masked;
            const seeded = { ...delivery, data: dotted };
            this.#maskedFrom.set(seeded, this.#maskedFrom.get(delivery) ?? delivery);
            // A call counting on what the loader showed counts on it seeded.
            this.#inflight.forEach(({ unparked }) => unparked.forEach(({ handed }) => {
                if (handed?.shown === delivery)
                    handed.shown = seeded;
            }));
            this.#deliveries.set(loader, seeded);
        });
    }
    /**
     * Applies plain hand-off data. It records every namespace the data names,
     * which keeps its loaders without params from running, and a loader with
     * `cache: false` is served by its namespace for the pass the data arrived
     * with.
     */
    #hydratePlain(translations) {
        const { loaders = [] } = this.#config ?? {};
        const served = loaders.filter((loader) => loader.cache === false
            && Object.keys(read(translations, loader.locale) ?? {}).some((key) => isNamespaceKey(key, loader.namespace)));
        this.#addSanitized(translations);
        Object.keys(translations).forEach((locale) => {
            // A `null` payload for a locale must not take the whole call down —
            // every step of the merge tolerates it, so this bookkeeping does too.
            const data = read(translations, locale) ?? {};
            this.#namespaceRecords[locale] = Array.from(new Set([
                ...(read(this.#namespaceRecords, locale) || []),
                ...Object.keys(data).map((key) => `${key}`.split('.')[0]),
            ]));
        });
        served.forEach((loader) => this.#handedOff.set(loader, ''));
        this.#stampHandOff(translations);
    }
    /**
     * Applies hand-off data with the records of the loaders that delivered it.
     * A recorded loader's namespace is kept as that loader's delivery, so params
     * that change later replace it; the rest is kept as data supplied without a
     * loader and, like a seed, records no namespace — the hand-off says which loaders it
     * covers, and anything else loads again rather than going missing. `seeds`
     * is what was seeded into those namespaces, displayed and kept as a seed
     * so that it outlives a delivery. A record naming no loader of this config
     * is dropped, and its loader runs again.
     */
    #hydrateRecords(translations, records, seeds) {
        const { loaders = [] } = this.#config ?? {};
        const named = new Map(loaders.flatMap((loader) => (loader.id === null ? [] : [[loader.id, loader]])));
        const deliveries = records.flatMap(({ id, signature = '' }) => {
            const loader = named.get(id);
            if (!loader) {
                logger.debug(`No loader is named '${id}'. It loads again.`);
                return [];
            }
            return [{ loader, signature, data: read(read(translations, loader.locale), loader.namespace) ?? {} }];
        });
        // Under the data: it holds the seeds of the namespaces it carries already.
        this.#mergeTranslations(seeds);
        this.#mergeTranslations(translations);
        deliveries.forEach((delivery) => {
            this.#record(delivery);
            if (delivery.loader.cache === false)
                this.#handedOff.set(delivery.loader, delivery.signature);
        });
        const external = Object.keys(translations).reduce((acc, locale) => {
            const rest = Object.fromEntries(Object.entries(read(translations, locale) ?? {}).filter(([key]) => !deliveries.some(({ loader }) => loader.locale === locale && loader.namespace === key)));
            return Object.keys(rest).length ? { ...acc, [locale]: rest } : acc;
        }, {});
        this.#keepExternal(external);
        this.#keepExternal(seeds);
        this.#stampHandOff(translations);
    }
    /** Records `delivery` as its loader's; what was parked for its params is older. */
    #record(delivery) {
        // Deleted first, so the map keeps the order the deliveries arrived in.
        this.#deliveries.delete(delivery.loader);
        this.#deliveries.set(delivery.loader, delivery);
        this.#loaderRecords.set(delivery.loader, delivery.signature);
        if (this.#parked.get(delivery.loader)?.signature === delivery.signature)
            this.#parked.delete(delivery.loader);
    }
    /** The data held without a loader in the namespaces of `loaders`. */
    #externalOf(loaders) {
        return loaders.reduce((acc, { locale, namespace }) => {
            const data = read(this.#externalTranslations, locale) ?? {};
            const own = Object.fromEntries(Object.entries(data).filter(([key]) => isNamespaceKey(key, namespace)));
            if (!Object.keys(own).length)
                return acc;
            return { ...acc, [locale]: { ...read(acc, locale), ...own } };
        }, {});
    }
    /** Keeps data held without a loader, to rebuild a namespace from. */
    #keepExternal(sanitized) {
        this.#externalTranslations = Object.keys(sanitized).reduce((acc, locale) => ({
            ...acc,
            [locale]: mergeTranslations(read(acc, locale) || {}, read(sanitized, locale) ?? {}, locale),
        }), this.#externalTranslations);
    }
    /** A locale's table as `config.preprocess` asks for it. */
    #preprocess(input) {
        const { preprocess } = this.#config ?? {};
        if (typeof preprocess === 'function')
            return preprocess(input) ?? {};
        if (preprocess === 'none')
            return input ?? {};
        return toDotNotation(input, preprocess === 'preserveArrays') ?? {};
    }
    /** Merges data keyed by sanitized locales into both tables. */
    #mergeTranslations(sanitized) {
        const { raw, translations } = this.#merged({ raw: this.#rawTranslations, translations: this.#translations }, sanitized);
        this.#rawTranslations = raw;
        this.#translations = translations;
    }
    /**
     * Both tables with data keyed by sanitized locales merged in. Pure, so a
     * caller that writes only once both are computed keeps them consistent when
     * a `preprocess` throws. `derived` names the locales whose preprocessed
     * table the caller derives from the merged raw table itself; theirs keeps
     * its place and is left as it was.
     */
    #merged(tables, sanitized, derived = []) {
        logger.debug('Adding translations...');
        const translationLocales = Object.keys(sanitized);
        return {
            raw: translationLocales.reduce((acc, locale) => ({
                ...acc,
                [locale]: mergeTranslations(read(acc, locale) || {}, read(sanitized, locale) ?? {}, locale),
            }), tables.raw),
            translations: translationLocales.reduce((acc, locale) => {
                const table = read(acc, locale);
                if (derived.includes(locale))
                    return { ...acc, [locale]: table ?? {} };
                // Checked right before `#preprocess` reads the same config, so the
                // check and the preprocess that runs agree.
                const fresh = table === undefined && dotNotates(this.#config?.preprocess);
                const input = this.#preprocess(read(sanitized, locale));
                // The dot notation builds the table fresh, so a locale without one yet
                // takes it as it is.
                return { ...acc, [locale]: fresh ? input : mergeTranslations(table || {}, input, locale) };
            }, tables.translations),
        };
    }
    /**
     * Starts the `cache` window of each locale that has none. Freshness is
     * measured from the locale's FIRST data — later partial loads (other
     * routes) must not extend the window.
     */
    #stamp(locales) {
        locales.forEach((locale) => {
            if (read(this.#loadedAt, locale) === undefined)
                this.#loadedAt[locale] = Date.now();
        });
    }
    /**
     * Stamps each locale hand-off data holds something for that a caching
     * loader feeds: seeded data and a namespace only loaders with `cache: false`
     * feed start no window.
     */
    #stampHandOff(translations) {
        const { loaders = [] } = this.#config ?? {};
        const cached = (locale, key) => loaders.some((loader) => loader.locale === locale && loader.cache !== false && isNamespaceKey(key, loader.namespace));
        this.#stamp(Object.keys(translations).filter((locale) => Object.keys(read(translations, locale) ?? {}).some((key) => cached(locale, key))));
    }
    /** Reports a call on a destroyed instance; `true` means "ignore the call". */
    #inert(action) {
        if (!this.#destroyed)
            return false;
        logger.warn(`Ignoring '${action}' — this i18n instance was destroyed.`);
        return true;
    }
    #resolveLocale(inputLocale) {
        const { fallbackLocale } = this.#config ?? {};
        if (!inputLocale && !fallbackLocale)
            return undefined;
        const all = this.#served();
        // Nothing to match against yet; sanitizing here would only emit a
        // non-standard warning for a lookup that cannot succeed anyway.
        if (!all.length)
            return undefined;
        if (inputLocale) {
            // Sanitized once per lookup rather than once per candidate locale.
            const sanitized = this.#sanitize(inputLocale);
            const match = all.find((known) => sanitized.includes(known));
            if (match)
                return match;
        }
        // The fallback is held sanitized.
        return fallbackLocale && all.includes(fallbackLocale) ? fallbackLocale : undefined;
    }
    /**
     * Whether nothing serves `locale` — no loader, no translations and no
     * `fallbackLocale` — so a request for it changes nothing. Until a locale is
     * known, any request is kept: a config loaded later may serve it.
     */
    #unserved(locale) {
        if (!this.#served().length || this.#resolveLocale(locale) !== undefined)
            return false;
        logger.debug(`Ignoring '${locale}' locale — nothing serves it.`);
        return true;
    }
    #cacheValue() {
        const { cache = defaultCache } = this.#config ?? {};
        return Number.isNaN(+cache) ? defaultCache : +cache;
    }
    /** Drops the bookkeeping of every given locale whose `cache` window elapsed. */
    #invalidateExpired(...locales) {
        const cacheValue = this.#cacheValue();
        locales.forEach((locale) => {
            if (!locale)
                return;
            const loadedAt = read(this.#loadedAt, locale);
            if (loadedAt !== undefined && Date.now() >= loadedAt + cacheValue) {
                logger.debug(`'${locale}' translations expired. Loaders will run again.`);
                this.#invalidate(locale, undefined, { expiry: true });
            }
        });
    }
    /**
     * Whether the locale the next trigger loads is other than `locale`: a later
     * request asked for another, or a failed one put an earlier back.
     */
    #superseded(locale) {
        const requested = this.#resolveLocale(this.#requestedLocale);
        // An unresolvable most-recent request supersedes nothing — it must not
        // block a completed load from activating.
        return requested !== undefined && requested !== locale;
    }
    /** Activates `locale` unless another request superseded its load meanwhile. */
    #activate(locale) {
        if (this.#superseded(locale))
            return;
        if (this.#locale !== locale)
            this.#locale = locale;
    }
    /** The namespaces of `sanitizedLocale` `snapshot()` leaves out — see there. */
    #unsnapshottable(sanitizedLocale, withRecords) {
        const { loaders = [] } = this.#config ?? {};
        // Grouped in one pass: a filter per namespace would be quadratic in the
        // number of loaders.
        const byNamespace = new Map();
        loaders.forEach((loader) => {
            if (loader.locale !== sanitizedLocale)
                return;
            const feeding = byNamespace.get(loader.namespace);
            if (feeding)
                feeding.push(loader);
            else
                byNamespace.set(loader.namespace, [loader]);
        });
        const named = new Set(read(this.#namespaceRecords, sanitizedLocale));
        return Array.from(byNamespace).filter(([namespace, feeding]) => {
            const several = feeding.length > 1;
            const params = feeding.some(({ routes }) => capturesParams(routes));
            // Seeded data alone would keep the client's loaders from ever running.
            const delivered = feeding.some((loader) => this.#loaderRecords.has(loader)) || named.has(namespace);
            if (!withRecords)
                return several || params || !delivered;
            // Only a record lets the client replace the data once the params change.
            return params && (several || feeding.some((loader) => loader.id === null || !this.#loaderRecords.has(loader)));
        }).map(([namespace]) => namespace);
    }
    /** The loaders of `sanitizedLocale` and of the fallback locale, in `loaders` order. */
    #localeLoaders(sanitizedLocale) {
        const config = this.#config;
        if (this.#byLocale.config !== config)
            this.#byLocale = { config, loaders: new Map() };
        const known = this.#byLocale.loaders.get(sanitizedLocale);
        if (known)
            return known;
        const { loaders = [], fallbackLocale } = config ?? {};
        const selected = loaders.filter(({ locale }) => locale === sanitizedLocale || locale === fallbackLocale);
        this.#byLocale.loaders.set(sanitizedLocale, selected);
        return selected;
    }
    /**
     * The loaders of `sanitizedLocale` (and the fallback locale) whose routes
     * match `route`, with the params the route yields for each.
     */
    #matchLoaders(sanitizedLocale, route) {
        return this.#localeLoaders(sanitizedLocale).flatMap((loader) => {
            const params = routeParams(loader.routes, route);
            return params ? [{ loader, params, signature: paramsSignature(params) }] : [];
        });
    }
    /**
     * The loaders of `namespace` for `sanitizedLocale` (and the fallback
     * locale), whatever their routes. A loader whose routes match `route` gets
     * the params they yield. Any other has no params to ask for, so whatever it
     * delivered last serves; only a loader with no record is asked, for none.
     */
    #matchNamespace(sanitizedLocale, namespace, route) {
        return this.#localeLoaders(sanitizedLocale).flatMap((loader) => {
            if (loader.namespace !== namespace)
                return [];
            const params = routeParams(loader.routes, route);
            if (params)
                return [{ loader, params, signature: paramsSignature(params) }];
            return this.#loaderRecords.has(loader) ? [] : [{ loader, params: {}, signature: '' }];
        });
    }
    /**
     * Cuts the loaders `covers` matches off the loads in flight: a load running
     * one discards that loader's data when it settles while the rest of it
     * lands, and no trigger that has to fetch that loader joins it.
     */
    #sever(covers) {
        this.#inflight.forEach(({ loaders, unparked, severed }) => {
            [...loaders, ...unparked.map(({ request }) => request.loader)].filter(covers).forEach((loader) => severed.add(loader));
        });
        this.#fetches.forEach((fetch) => {
            if (covers(fetch.request.loader))
                this.#fetches.delete(fetch);
        });
    }
    /**
     * Ends the pass a hand-off serves once an activating trigger asks for
     * another locale or route; the first trigger after a hand-off that named
     * neither settles them.
     */
    #passHandOff(locale, route) {
        if (!this.#handedOff.size)
            return;
        const { locale: passLocale = locale, route: passRoute = route } = this.#handOffPass;
        if (passLocale === locale && passRoute === route)
            this.#handOffPass = { locale, route };
        else
            this.#handedOff.clear();
    }
    /**
     * Records the params the current route asks each matching loader for, and
     * none of every other loader: a loader of a locale the request left must not
     * keep params its route asked for. Returns what it replaced.
     */
    #want(matching) {
        const replaced = this.#wanted;
        this.#wanted = { config: this.#config, signatures: new Map(matching.map(({ loader, signature }) => [loader, signature])) };
        return replaced;
    }
    /** The params the next trigger asks `loader` for: `null` for none, `undefined` for any. */
    #wantedOf(loader) {
        const { config, signatures } = this.#wanted;
        if (config === undefined || config !== this.#config)
            return undefined;
        return signatures.get(loader) ?? null;
    }
    /**
     * Starts an activating call of the request `asked`: keeps the requested
     * locale and the route it is about to replace — with the params `#load`
     * adds, what is put back should it fail.
     */
    #ask(asked) {
        const call = { asked, replaced: { requestedLocale: this.#requestedLocale, route: this.#route }, failed: false, threw: [], resumed: false };
        this.#calls = [...this.#calls, call];
        return call;
    }
    /**
     * Lets a call whose load resolved without failing stand, with every call
     * before it. Dropping them only bounds the chain: a later call that has not
     * failed keeps them from being undone either way.
     */
    #stand(call, promise) {
        call.settled = promise.then(() => {
            if (!call.failed)
                this.#calls = this.#calls.slice(this.#calls.indexOf(call) + 1);
        }, () => undefined);
        return promise;
    }
    /**
     * Marks the calls a load failed for, then undoes and drops failed calls from
     * the end of the chain: a failed call behind one that has not failed stays,
     * and stays applied, until that one fails too. Returns whether the undo put
     * another request back, with the control flow of the calls it undid and of
     * this load, or `undefined` when it undid nothing.
     */
    #fail(calls, thrown) {
        calls.forEach((call) => {
            call.failed = true;
            call.threw = [...call.threw, ...thrown];
        });
        const before = { locale: this.#requestedLocale, route: this.#route };
        let threw;
        // What the calls whose route stands asked for: an undo back to one of
        // those requests puts back a request that failed.
        let standing = [];
        for (let last = this.#calls.at(-1); last?.failed; last = this.#calls.at(-1)) {
            if (last.routeStands)
                standing = [...standing, last.asked];
            this.#undo(last);
            this.#calls = this.#calls.slice(0, -1);
            threw = [...threw ?? [], ...last.threw];
        }
        if (!threw)
            return undefined;
        // Back at a request that failed: what is shown keeps its records, and it
        // is not loaded again by itself.
        const resolved = this.#resolveLocale(this.#requestedLocale);
        const again = standing.some(({ locale, route }) => route === this.#route && this.#resolveLocale(locale) === resolved);
        this.#rewant(!again);
        const changed = !again && (before.locale !== this.#requestedLocale || before.route !== this.#route);
        if (changed) {
            const onRoute = this.#route ? ` on '${this.#route}' route` : '';
            logger.debug(`Undoing the failed calls: the request is back to '${this.#requestedLocale}' locale${onRoute}.`);
        }
        return { changed, threw: [...threw, ...thrown] };
    }
    /**
     * Puts back what a failed call replaced. Whichever of the locale and the
     * route was not asked for before it stands: it is all there is for the next
     * trigger to load. Of a call whose route stands, only the locale goes back.
     */
    #undo({ replaced: { requestedLocale, route, wanted }, routeStands }) {
        if (requestedLocale !== undefined)
            this.#requestedLocale = requestedLocale;
        if (routeStands)
            return;
        if (route !== undefined)
            this.#route = route;
        if (wanted)
            this.#wanted = wanted;
    }
    /**
     * Fails the calls whose data could not be applied, as control flow fails
     * them, except that the route stands, whichever undo reaches them or a call
     * before them: the caller is on it already. A request put back for that
     * route is loaded there; one that is the same request again is not, as its
     * data is what failed.
     */
    #failApply(calls) {
        const last = Math.max(...calls.map((call) => this.#calls.indexOf(call)));
        this.#calls.slice(0, last + 1).forEach((call) => { call.routeStands = true; });
        const undone = this.#fail(calls, []);
        if (undone?.changed)
            this.#settleUndo(undone);
    }
    /**
     * The loaders the request an undo left in place selects: wanted for the
     * params its route yields, and no longer recorded as loaded for others —
     * whatever another load delivered for them meanwhile stays displayed until
     * the request loads them again, unless `drop` is off. Runs before the
     * failed load applies what its other loaders delivered, so that is filtered
     * by what is wanted now.
     */
    #rewant(drop) {
        const locale = this.#resolveLocale(this.#requestedLocale);
        if (!locale || this.#route === undefined)
            return;
        const matching = this.#matchLoaders(locale, this.#route);
        this.#want(matching);
        if (!drop)
            return;
        matching.forEach(({ loader, signature }) => {
            if (this.#loaderRecords.has(loader) && this.#loaderRecords.get(loader) !== signature)
                this.#loaderRecords.delete(loader);
        });
    }
    /**
     * Once the failed load has applied what its other loaders delivered, the
     * request the undo put back activates if its data is there — a loader with
     * `cache: false` counts once its record holds the params — unless an
     * activating load of it is in flight that activates it or fails. It is
     * loaded otherwise, by an activating call nobody awaits: the load that would
     * have activated it may have resolved without activating while it was
     * replaced, and a load still waiting to resume joins this one. It loads
     * nothing when the undo put back the request that failed, or when that
     * request needs a loader for the params an undone call's load, or this one,
     * threw control flow for: a failure never runs again by itself.
     */
    #settleUndo({ changed, threw: controlFlow }) {
        const locale = this.#resolveLocale(this.#requestedLocale);
        const route = this.#route;
        if (!locale || route === undefined)
            return;
        const matching = this.#matchLoaders(locale, route);
        const missing = this.#unloaded(matching).filter(({ loader, signature }) => loader.cache !== false || this.#loaderRecords.get(loader) !== signature);
        if (!missing.length) {
            const key = this.#inflightKey(locale, route, matching);
            // A severed load, or one of a replaced config, activates nothing when
            // it settles.
            const activating = Array.from(this.#inflight).some((entry) => entry.key === key && entry.calls.length && !entry.severed.size && entry.config === this.#config);
            if (activating)
                return;
            // No caller waits on it: what fails here is logged, and never replaces
            // what the failed load rejects with.
            try {
                this.#applyWanted(this.#claimParked(matching).map(({ delivery }) => delivery));
            }
            catch (error) {
                logError(loadFailure(locale, route), error);
                return;
            }
            this.#activate(locale);
            return;
        }
        const threw = missing.some(({ loader, signature }) => controlFlow.some((flow) => flow.loader === loader && flow.signature === signature));
        if (!changed || threw)
            return;
        const call = this.#ask({ locale: this.#requestedLocale, route });
        void this.#stand(call, this.#load(locale, route, call));
    }
    /**
     * The matching loaders a load has to run: all but those whose own record
     * holds the params the route yields now. A namespace a plain hand-off
     * delivered stands in for the record of a loader without params that has
     * none.
     * A loader with `cache: false` runs unless a hand-off serves it: its record
     * only names what it delivered.
     */
    #unloaded(matching) {
        return matching.filter(({ loader, signature }) => {
            if (loader.cache === false)
                return this.#handedOff.get(loader) !== signature;
            if (this.#parked.get(loader)?.signature === signature)
                return false;
            if (this.#loaderRecords.has(loader))
                return this.#loaderRecords.get(loader) !== signature;
            return signature !== '' || !(read(this.#namespaceRecords, loader.locale) || []).includes(loader.namespace);
        });
    }
    /**
     * Starts (or joins) a load. A load already in flight for the same locale and
     * route that selected the same loaders for the same params is returned as-is
     * while it delivers everything the trigger has to fetch, so concurrent
     * duplicate triggers share one fetch — whether they selected by route or by
     * `namespace`. The pending entry is registered
     * synchronously, so `loading` is observable right after the triggering call;
     * a load with nothing to fetch never registers at all, so cache-served
     * navigations do not flicker the flag. A warm load — one without an
     * activating `call` — never registers either, until an activating trigger
     * joins it.
     */
    #load(requestedLocale, route, call, namespace, preloaded) {
        const locale = this.#resolveLocale(requestedLocale);
        if (!locale)
            return Promise.resolve();
        const preload = call ? this.#preloadOf(preloaded, locale, route) : undefined;
        // Expiry is evaluated per activating trigger, BEFORE the in-flight check.
        // That order is safe: a locale is stamped only once its data arrived, so a
        // shared in-flight load cannot be invalidated by its own duplicates. A
        // warm trigger fills the tables and leaves their freshness to the next
        // activating one, and a call with a preload's token to that preload.
        if (call && !preload)
            this.#invalidateExpired(locale, this.#config?.fallbackLocale);
        const matching = namespace === undefined ? this.#matchLoaders(locale, route) : this.#matchNamespace(locale, namespace, route);
        // Recorded before the in-flight check, so a trigger joining a load, or one
        // served from the records, still decides which params the route shows.
        if (call) {
            call.replaced.wanted = this.#want(matching);
            this.#passHandOff(locale, route);
        }
        return this.#loadSelection(locale, route, this.#inflightKey(locale, route, matching), matching, call ? [call] : [], preload);
    }
    /** What `token` stands for while it serves a call for `locale` on `route`. A call reads it once, used or not. */
    #preloadOf(token, locale, route) {
        if (!token)
            return undefined;
        const preload = this.#preloads.get(token);
        this.#preloads.delete(token);
        if (preload && preload.config === this.#config && preload.epoch === this.#epoch && preload.locale === locale && preload.route === route)
            return preload;
        logger.debug('Ignoring a preload token that does not serve this call.');
        return undefined;
    }
    /**
     * The requests `preload` answered: while the loader shows what it showed as
     * the preload resolved, or the answer itself, and — for a loader with
     * `cache: false` — no load of another route that was fetching it then is
     * still in flight, to land after the answer.
     */
    #answered({ answers, earlier }, requests) {
        return requests.flatMap((request) => {
            const { loader, signature } = request;
            const answer = answers.find(({ delivery }) => delivery.loader === loader && delivery.signature === signature);
            const shown = this.#deliveries.get(loader);
            if (!answer || (shown !== answer.shown && shown !== answer.delivery))
                return [];
            const overtaken = loader.cache === false && earlier.some((load) => this.#inflight.has(load) && !load.severed.has(loader)
                && load.fetches.some((fetch) => fetch.request.loader === loader && fetch.request.signature === signature));
            return overtaken ? [] : [{ request, answer }];
        });
    }
    /**
     * The key of a load in flight: what the trigger selected and the route it
     * came from. A loader receives the route, so a load for another route may
     * deliver, or throw, what does not fit this one — and one awaiting a
     * navigation to it would wait on itself.
     */
    #inflightKey(locale, route, matching) {
        const candidates = this.#localeLoaders(locale);
        return JSON.stringify([locale, route, ...matching.map(({ loader, signature }) => [candidates.indexOf(loader), signature])]);
    }
    /**
     * Joins the load in flight under `key` that delivers what `selected` lacks,
     * or starts one. What `preload` answered lands with it instead of being
     * fetched.
     */
    #loadSelection(locale, route, key, selected, calls, preload) {
        const unloaded = this.#unloaded(selected);
        const answered = preload ? this.#answered(preload, unloaded) : [];
        const requests = answered.length ? unloaded.filter((request) => !answered.some((answer) => answer.request === request)) : unloaded;
        const handed = answered
            .filter(({ request, answer }) => this.#deliveries.get(request.loader) !== answer.delivery)
            .map(({ request, answer }) => ({ request, delivery: answer.delivery, handed: { shown: answer.shown } }));
        const unparked = calls.length ? [...this.#claimParked(selected), ...handed] : [];
        const refresh = answered.filter(({ answer }) => answer.shared);
        if (calls.length)
            this.#rerecord(answered.map(({ answer }) => answer.delivery).filter((delivery) => this.#deliveries.get(delivery.loader) === delivery));
        if (!requests.length) {
            // Nothing to fetch — the locale still becomes active (its data is
            // already present, parked or it has no loaders).
            if (calls.length) {
                try {
                    this.#applyWanted(unparked.map(({ delivery }) => delivery));
                }
                catch (error) {
                    logError(loadFailure(locale, route), error);
                    this.#failApply(calls);
                    // eslint-disable-next-line @typescript-eslint/prefer-promise-reject-errors -- passed on as thrown
                    const promise = Promise.reject(error);
                    promise.catch(() => undefined);
                    return promise;
                }
                this.#activate(locale);
            }
            this.#refresh(locale, route, refresh);
            return Promise.resolve();
        }
        // What is parked lands with the load, so a call it fails puts it back. A
        // load in flight may deliver what the token answered a second time.
        const inflight = answered.length ? undefined : this.#joinable(key, requests);
        if (inflight)
            return this.#join(inflight, calls, unparked);
        const { promise } = this.#start(locale, route, key, requests, calls, unparked);
        if (refresh.length)
            promise.then(() => this.#refresh(locale, route, refresh), () => undefined);
        return promise;
    }
    /**
     * Records again what a preload showed itself and an expiry since dropped the
     * records of: the preload judged the window at its request.
     */
    #rerecord(shown) {
        const dropped = shown.filter(({ loader, signature }) => this.#loaderRecords.get(loader) !== signature);
        dropped.forEach(({ loader, signature }) => this.#loaderRecords.set(loader, signature));
        this.#stamp(dropped.filter(({ loader }) => loader.cache !== false).map(({ loader }) => loader.locale));
    }
    /**
     * Fetches again, as a warm load, what a call showed from a preload's shared
     * fetch: that fetch started before the preload's request. Only while it is
     * shown and its params are still wanted — a later delivery is no older than
     * the request.
     */
    #refresh(locale, route, answered) {
        const requests = this.#destroyed ? [] : answered
            .filter(({ request, answer }) => this.#shows(request.loader, answer.delivery) && this.#isWanted(request))
            .map(({ request }) => request);
        if (requests.length)
            void this.#loadSelection(locale, route, this.#inflightKey(locale, route, requests), requests, []);
    }
    /** Whether `loader` still shows `delivery`, seeded or not. A reconfiguration replaces every delivery. */
    #shows(loader, delivery) {
        const shown = this.#deliveries.get(loader);
        return shown !== undefined && (this.#maskedFrom.get(shown) ?? shown) === delivery;
    }
    /** The load in flight under `key` that delivers every one of `requests`. */
    #joinable(key, requests) {
        return Array.from(this.#inflight).find(({ key: inflightKey, loaders, severed }) => inflightKey === key
            && requests.every(({ loader }) => loaders.includes(loader) && !severed.has(loader)));
    }
    /**
     * Joins a load in flight. The activating calls that join make it activate,
     * and fail with it when a loader of it throws control flow that was not
     * severed.
     */
    #join(entry, calls, unparked) {
        if (!calls.length)
            return entry.promise;
        if (!entry.calls.length)
            this.#pending = new Set(this.#pending).add(entry.promise);
        entry.calls = [...entry.calls, ...calls];
        entry.unparked = [...entry.unparked, ...unparked];
        return entry.promise;
    }
    /**
     * Whether the next trigger asks `loader` for `signature`: the params its
     * route yields, none while the route does not select the loader, or any
     * before a trigger asked.
     */
    #isWanted({ loader, signature }) {
        const wanted = this.#wantedOf(loader);
        if (wanted === undefined)
            return true;
        return (wanted ?? '') === signature;
    }
    /**
     * Applies the deliveries of the params the next trigger asks for, and parks
     * the rest. A loader no trigger asked for params keeps what it delivered for
     * others: a warm load parks what would replace it, unless it asks for no
     * params — `loadNamespace()` off the loader's routes. What an activating load
     * counts on stays parked until it settles. A loader with `cache: false` runs
     * on every trigger that selects it, so nothing of it is parked. What fails
     * to apply is fetched again.
     */
    #applyWanted(deliveries) {
        const wanted = deliveries.filter(({ loader, signature }) => {
            const wanted = this.#wantedOf(loader);
            if (typeof wanted === 'string')
                return wanted === signature;
            const previous = this.#deliveries.get(loader);
            return !previous || previous.signature === signature || signature === '';
        });
        const parked = deliveries.filter((delivery) => !wanted.includes(delivery)
            && delivery.loader.cache !== false
            && !this.#claimed(delivery.loader));
        parked.forEach((delivery) => this.#parked.set(delivery.loader, delivery));
        this.#stamp(parked.map(({ loader }) => loader.locale));
        if (!wanted.length)
            return;
        try {
            this.#applyDeliveries(wanted);
        }
        catch (error) {
            // Parked no more, so the next trigger fetches it again, and a load in
            // flight that claimed it fetches it again as a severed one.
            wanted.forEach((delivery) => {
                if (this.#parked.get(delivery.loader) !== delivery)
                    return;
                this.#parked.delete(delivery.loader);
                this.#inflight.forEach((entry) => {
                    if (entry.unparked.some((claim) => claim.delivery === delivery))
                        entry.severed.add(delivery.loader);
                });
            });
            throw error;
        }
    }
    /** Takes the fetches `entry` waited on out of the table, once what they delivered is applied or parked. */
    #release({ fetches }) {
        fetches.forEach((fetch) => this.#fetches.delete(fetch));
    }
    /** What is parked for `requests`, for the load that applies it once it settles. */
    #claimParked(requests) {
        return requests.flatMap((request) => {
            const delivery = this.#parked.get(request.loader);
            return delivery?.signature === request.signature ? [{ request, delivery }] : [];
        });
    }
    /** Whether a load in flight counts on what is parked for `loader`. */
    #claimed(loader) {
        const delivery = this.#parked.get(loader);
        return delivery !== undefined && Array.from(this.#inflight).some(({ unparked }) => unparked.some((claim) => claim.delivery === delivery));
    }
    /**
     * The control flow a settled load rejects with: the first its locale's
     * loaders threw, in `loaders` order, then the fallback locale's. What a
     * severed loader threw predates the invalidation, and an activating load
     * counts control flow only while it serves the request the next trigger
     * loads — not once another locale or other params of that loader were asked
     * for.
     */
    #rejection({ severed, calls }, locale, controlFlow) {
        const discarded = (flow) => {
            if (severed.has(flow.loader))
                return 'an invalidation or destroy() severed it';
            if (!calls.length)
                return undefined;
            if (this.#superseded(locale))
                return 'another locale was asked for';
            return this.#isWanted(flow) ? undefined : 'other params were asked for';
        };
        const counted = controlFlow.filter((flow) => {
            const reason = discarded(flow);
            if (reason)
                logger.debug(`Discarding what the ${loaderName(flow.loader)} loader threw: ${reason}.`, flow.value);
            return !reason;
        });
        const [first, ...rest] = [
            ...counted.filter(({ loader }) => loader.locale === locale),
            ...counted.filter(({ loader }) => loader.locale !== locale),
        ];
        if (!first)
            return undefined;
        rest.forEach(({ loader, value }) => logger.debug(`Discarding what the ${loaderName(loader)} loader threw: the load rejects with what the ${loaderName(first.loader)} loader threw.`, value));
        return first;
    }
    /** Fetches `requests` as a load in flight under `key`, and settles it. */
    #start(locale, route, key, requests, calls, unparked) {
        const onRoute = route ? ` and '${route}' route` : '';
        let rejection;
        let outcome;
        const promise = new Promise((resolve, reject) => { outcome = { resolve, reject }; });
        const { fetches, run } = this.#fetch(requests, route);
        const entry = { key, config: this.#config, promise, loaders: requests.map(({ loader }) => loader), fetches, severed: new Set(), calls, unparked };
        // Registered before any loader is called, so one that invalidates or
        // destroys the instance before its first `await` severs its own load too.
        this.#inflight.add(entry);
        if (calls.length)
            this.#pending = new Set(this.#pending).add(promise);
        run();
        const settled = Promise.all(fetches.map(({ outcome }) => outcome)).then(mergeFetched).then(({ deliveries, controlFlow }) => {
            // Released before the load settles: a trigger arriving in between must
            // not join a load whose activation step has already run — it finds the
            // data recorded and activates at once.
            this.#inflight.delete(entry);
            // An `invalidate()` — explicit, via expiry, via reconfiguration or via
            // `destroy()` — that raced this load severed some of its loaders. Their
            // data predates the invalidation: applying it would resurrect the
            // dropped bookkeeping and permanently suppress the promised refetch.
            const claims = entry.unparked.filter(({ request }) => !entry.severed.has(request.loader));
            // What it counts on applies while still parked: a newer record of the
            // same params dropped it, and an invalidation severed it. What a token
            // handed it applies while the loader shows what it showed at the call;
            // a delivery of other params since is fetched again, as a severed
            // loader is, and one of the same params stands.
            const held = claims
                .filter(({ request, delivery, handed }) => (handed ? this.#deliveries.get(request.loader) === handed.shown : this.#parked.get(request.loader) === delivery))
                .map(({ delivery }) => delivery);
            claims.forEach(({ request: { loader }, delivery, handed }) => {
                const shown = this.#deliveries.get(loader);
                if (handed && shown !== handed.shown && shown?.signature !== delivery.signature)
                    entry.severed.add(loader);
            });
            const current = deliveries.filter(({ loader }) => !entry.severed.has(loader));
            const served = [...requests, ...entry.unparked.map(({ request }) => request)];
            rejection = this.#rejection(entry, locale, controlFlow);
            // The calls that share the load failed, whether its control flow rejects
            // them or a later call superseded it: the locale does not advance, and
            // what they replaced is put back unless a later call that has not failed
            // came since.
            const thrown = controlFlow.filter(({ loader }) => !entry.severed.has(loader));
            const undone = thrown.length ? this.#fail(entry.calls, thrown) : undefined;
            // With control flow, what the other loaders delivered lands as a warm
            // load's does. Should applying it fail, that is only logged: the caller
            // gets the control flow.
            let failure;
            try {
                this.#applyWanted([...held, ...current]);
            }
            catch (error) {
                if (rejection)
                    logError(loadFailure(locale, route), error);
                else
                    failure = { error };
            }
            this.#release(entry);
            if (undone)
                this.#settleUndo(undone);
            if (failure) {
                this.#failApply(entry.calls);
                throw failure.error;
            }
            if (rejection)
                throw rejection.value;
            // A load of params the route no longer asks for, whatever it returned,
            // leaves the activation to the load of the params it asks for. One whose
            // control flow a later call superseded failed: an undo that puts its
            // request back loads it, unless that control flow still covers it.
            const replaced = served.some((request) => !this.#isWanted(request));
            if (!entry.calls.length || replaced || thrown.length)
                return [];
            if (!entry.severed.size)
                this.#activate(locale);
            return served.filter(({ loader }) => entry.severed.has(loader));
        });
        // Reported here so a load nobody awaits is still visible. What a resume
        // adopts is a load of its own, which reports itself; control flow a
        // shared fetch threw is reported by the first load it rejects.
        settled.catch((error) => {
            if (rejection) {
                if (this.#reported.has(rejection))
                    return;
                this.#reported.add(rejection);
            }
            logError(rejection
                ? `Rejecting the load of '${locale}' locale${onRoute} with what the ${loaderName(rejection.loader)} loader threw.`
                : loadFailure(locale, route), error);
        });
        // Resumed once per call: a loader that invalidates what it loads each time
        // it runs would otherwise be fetched again for as long as it keeps doing
        // so, while a call that joined a resumed load still gets its own.
        settled
            .then((severed) => (severed.length && entry.calls.some(({ resumed }) => !resumed) ? this.#resume(entry, locale, route, severed) : undefined))
            .then(outcome.resolve, outcome.reject);
        const settle = () => {
            // Only a settle step that threw before its release skipped the one above.
            this.#inflight.delete(entry);
            this.#release(entry);
            if (!this.#pending.has(promise))
                return;
            const next = new Set(this.#pending);
            next.delete(promise);
            this.#pending = next;
        };
        // Also marks the load handled, so one nobody awaits cannot terminate the
        // process; an awaiting caller still receives the rejection.
        promise.then(settle, settle);
        return entry;
    }
    /**
     * Finishes an activating load an invalidation cut `severed` off: it fetches
     * them again, so a trigger's promise that resolves still means its locale
     * is loaded, and control flow the refetch throws rejects it as any load's
     * does. It runs once per call: what severs the refetch of every call it
     * serves is left to the next trigger, as is the locale when the instance
     * was destroyed or reconfigured. Once a
     * later call asked for another locale or route, it waits for the calls since
     * its own to settle: it stands down should the request stay replaced, and
     * resumes should an undo put it back. A load whose params a later request
     * replaced, or whose control flow it superseded, does not get here: an undo
     * that puts it back loads it itself.
     */
    #resume(entry, locale, route, severed) {
        if (this.#destroyed || entry.config !== this.#config)
            return undefined;
        if (this.#superseded(locale) || this.#route !== route) {
            // A resumed call joins a load after the calls it started, so the latest
            // of them is found by its place in the chain, not in the load.
            const last = Math.max(-1, ...entry.calls.map((call) => this.#calls.indexOf(call)));
            const later = last === -1 ? [] : this.#calls.slice(last + 1);
            if (!later.length)
                return undefined;
            return Promise.all(later.flatMap(({ settled }) => settled ?? [])).then(() => this.#resume(entry, locale, route, severed));
        }
        entry.calls.forEach((call) => { call.resumed = true; });
        return this.#loadSelection(locale, route, entry.key, severed, entry.calls);
    }
}
// The raw class is deliberately not exported — every consumer constructs
// through the extension-aware signature. The exported name carries both
// meanings: the value is the facade, the type is the un-piped instance.
const I18n = I18nCore;
export { I18n };
export default I18n;
