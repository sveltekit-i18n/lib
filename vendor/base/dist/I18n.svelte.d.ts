import type { Config, Extension, Loader, Parser, Schema, Snapshot, Translations } from './types.js';
declare class I18nCore<ParserParams extends Parser.Params = any, ParserOutput = string, TranslationSchema = never, LocaleUnion extends string = string> {
    #private;
    constructor(config?: Config.T<ParserParams, ParserOutput>);
    /**
     * The active locale. Reading it is reactive; assigning it is a shorthand for
     * a fire-and-forget `setLocale()` — the value therefore updates once the
     * locale's translations resolved, not synchronously on assignment. It does
     * not advance when a loader throws SvelteKit's `redirect()` or an `error()`
     * below 500, which an assignment only logs.
     */
    get locale(): Config.LocaleInput<LocaleUnion> | undefined;
    set locale(value: Config.LocaleInput<LocaleUnion> | undefined);
    get translations(): Translations.SerializedTranslations;
    get rawTranslations(): Translations.SerializedTranslations;
    loading: boolean;
    locales: Config.LocaleInput<LocaleUnion>[];
    initialized: boolean;
    /**
     * Translates `key` for the active locale. Reactive on two levels: the
     * returned function reads the tables at CALL time, so a destructured `t`
     * keeps translating against live state, and its identity is refreshed
     * whenever the config, the tables or the locale change, so merely holding
     * the reference is tracked too.
     */
    t: Translations.TranslationFunction<ParserParams, ParserOutput, TranslationSchema>;
    /** Like `t`, for an explicit locale. */
    l: Translations.LocalTranslationFunction<ParserParams, ParserOutput, TranslationSchema, LocaleUnion>;
    /**
     * Public entry for (re)configuration. It returns the promise of the
     * `initLocale` load, which reports its own failure; a config that fails to
     * apply is reported here. Either way the promise is marked handled, so a
     * fire-and-forget call cannot become an unhandled rejection; an awaiting
     * caller still receives it.
     */
    loadConfig: (config: Config.T<ParserParams, ParserOutput>) => Promise<void>;
    setLocale: (locale?: Config.LocaleInput<LocaleUnion>) => Promise<void>;
    /**
     * With `{ preloaded }`, the token of a `preload()` for the requested locale
     * and this route, it shows what that preload fetched — see
     * `loadTranslations()`.
     */
    setRoute: (input: string, options?: {
        preloaded?: Loader.Preloaded | undefined;
    }) => Promise<void>;
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
    loadTranslations: (locale: Config.LocaleInput<LocaleUnion>, route?: string, { activate, preloaded }?: {
        activate?: boolean;
        preloaded?: Loader.Preloaded | undefined;
    }) => Promise<void>;
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
    preload: (locale: Config.LocaleInput<LocaleUnion>, route?: string) => Promise<Loader.Preloaded | undefined>;
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
    loadNamespace: (namespace: Loader.Key, locale?: Config.LocaleInput<LocaleUnion>) => Promise<void>;
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
    invalidate: (locale?: Config.LocaleInput<LocaleUnion>, namespace?: Loader.Key) => void;
    addTranslations: (translations?: Translations.SerializedTranslations) => void;
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
    hydrate: (envelope?: Snapshot.Envelope) => void;
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
    snapshot: {
        (options?: {
            records?: false;
        }): Translations.SerializedTranslations;
        (options: {
            records: true;
        }): Snapshot.Envelope;
        (options?: {
            records?: boolean;
        }): Translations.SerializedTranslations | Snapshot.Envelope;
    };
    /**
     * Detaches the instance from its loading lifecycle: in-flight loads settle
     * with whatever their loaders return or throw discarded, `loading` drops to
     * `false`, and every further load or mutation call is ignored with a warning.
     * Reads (`t`, `l`, `locale`, `translations`, `snapshot`) keep working, so a
     * component still tearing down renders its last state instead of breaking.
     * Idempotent.
     */
    destroy: () => void;
}
/**
 * A class declaration cannot annotate its constructor's return type, so the
 * extension pipe's construction-time type lives on this construct signature
 * instead: parser params and output are inferred from `config.parser`, locales
 * are narrowed to the ones the config names, and the returned surface is the
 * instance type folded through the `config.extensions` tuple
 * (`const` keeps it a tuple without `as const` at the call site).
 */
interface I18nConstructor {
    new <const C extends Config.T<any, any> = Config.T<any, any>>(config?: C): Extension.Piped<I18nCore<Parser.FromConfig<C>, Parser.OutputFromConfig<C>, Schema.FromConfig<C>, Config.LocalesFromConfig<C>>, Extension.FromConfig<C>>;
}
declare const I18n: I18nConstructor;
type I18n<ParserParams extends Parser.Params = any, ParserOutput = string, TranslationSchema = never, LocaleUnion extends string = string> = I18nCore<ParserParams, ParserOutput, TranslationSchema, LocaleUnion>;
export { I18n };
export default I18n;
