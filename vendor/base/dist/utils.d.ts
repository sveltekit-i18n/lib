import type { Config, DotNotation, Translations, Loader, Parser } from './types.js';
export declare const hasOwn: (obj: any, key: PropertyKey) => boolean;
export declare const read: <T = any>(obj: any, key: PropertyKey) => T | undefined;
export declare const translate: <P extends Parser.Params = Parser.Params, O = Parser.Output>(config: Pick<Config.T<P, O>, "parser" | "fallbackLocale" | "fallbackValue"> | undefined, locale: Translations.Locales[number] | undefined, key: string, params: Parser.Params, table: DotNotation.Input, fallbackTable: DotNotation.Input) => Translations.Translated<O>;
type Sanitizer = (...locales: any[]) => Config.Locale[];
export declare const sanitizeLocales: Sanitizer;
export declare const quietlySanitized: (locale: string) => Config.Locale;
export declare const sanitizerFactory: (sanitize?: Config.SanitizeLocales) => Sanitizer;
export declare const sanitizeTranslationLocales: (input: Translations.SerializedTranslations, sanitize: Sanitizer) => Translations.SerializedTranslations;
/**
 * Matches what a visitor asked for against the locales an app actually has.
 *
 * `requested` is an `Accept-Language` field value, a single locale, or a
 * preference list such as `navigator.languages`; `available` is the configured
 * set, and the winner is returned as IT spells it. A miss is `undefined` rather
 * than a guess – what a miss means is the caller's to decide.
 */
export declare const matchLocale: <const L extends string>(requested: string | readonly string[] | null | undefined, available: readonly L[]) => L | undefined;
/**
 * The direction `locale` is written in, for `dir` and `<html dir>`.
 *
 * Decided by the script alone: the one the tag spells (`az-Arab`, `pa-Guru`),
 * or else the one `Intl.Locale#maximize()` adds (`dv` is `Thaa`, `pa-PK` is
 * `Arab`). That likely script is the engine's CLDR data and can differ between
 * engines (`prs` has none in JavaScriptCore), so a locale whose direction
 * matters spells its script. The engines' own text info is not read –
 * JavaScriptCore reports `dv` and `az-Arab` as left to right. A tag
 * `Intl.Locale` rejects, and a missing locale, is `'ltr'`.
 */
export declare const textDirection: (locale: string | undefined) => "ltr" | "rtl";
/**
 * `route` without `basePath` in front of it, cut on a segment boundary only:
 * under `/repo`, `/repo/about` is `/about`, `/repo` is `/` and `/repo?tab=1`
 * is `/?tab=1`, while `/repository` and a route without the prefix pass
 * through unchanged.
 */
export declare const withoutBasePath: (route: string, basePath: string | undefined) => string;
/**
 * What stands in front of the part of `pathname` that SvelteKit's `routeId`
 * matched: `''` when nothing does, `undefined` when the id fits no suffix of
 * it, when it is `null` (a 404), or when the pathname is too long to examine.
 * Param matchers cannot run here, so an optional param on the first segment
 * absorbs a prefix. No regex runs on the pathname.
 */
export declare const routePrefix: (pathname: string, routeId: string | null) => string | undefined;
/** Whether `config.preprocess` is the built-in dot notation. */
export declare const dotNotates: (preprocess: Config.T["preprocess"]) => boolean;
export declare const toDotNotation: DotNotation.T;
export declare const unique: <V>(values: readonly V[]) => V[];
export declare const resolveLoaders: (input?: readonly Loader.LoaderModule[], sanitizeLocales?: Config.SanitizeLocales) => Loader.Resolved[];
export declare const mergeTranslations: (target: any, source: any, path: string, onConflict?: (path: string) => void) => any;
export declare const maskTranslations: (target: any, source: any) => any;
export declare const maskOutputKeys: (target: any, keys: ReadonlySet<string>, prefix: string, preserveArrays?: boolean) => any;
export declare const omitProtoKeys: (value: any) => any;
export declare const serialize: (input: Array<Loader.Resolved & {
    data: any;
}>) => Translations.SerializedTranslations;
/** The locales the loaders serve, then the ones the tables hold. */
export declare const servedLocales: (loaders: readonly Loader.Resolved[], tables: Translations.SerializedTranslations) => Config.Locale[];
/**
 * The locales a config serves, from its loaders as `resolveLoaders` resolved
 * them, sanitized as an instance built from it sanitizes them. Resolving the
 * loaders logs what is wrong with them, so a caller resolves them once per
 * config.
 */
export declare const configLocales: ({ translations, sanitizeLocales: strategy }: Pick<Config.T, "translations" | "sanitizeLocales">, loaders: readonly Loader.Resolved[]) => Config.Locale[];
/** A loader selected for a load, with the params its route yielded. */
export type LoadRequest = {
    loader: Loader.Resolved;
    params: Loader.Params;
    signature: string;
};
/** What a loader delivered. A loader that threw has no entry; one that returned nothing delivered no keys. */
export type Delivery = {
    loader: Loader.Resolved;
    signature: string;
    data: Translations.Input;
};
/** SvelteKit's control flow a loader threw instead of delivering: `redirect()`, and `error()` below 500. */
export type ControlFlow = {
    loader: Loader.Resolved;
    signature: string;
    value: unknown;
};
/** What a fetch returns: the deliveries, and the control flow thrown instead of one. */
export type Fetched = {
    deliveries: Delivery[];
    controlFlow: ControlFlow[];
};
/** A loader as a message names it. `String`, since interpolating a Symbol namespace throws. */
export declare const loaderName: ({ locale, namespace }: Loader.Resolved) => string;
export declare const fetchTranslation: ({ loader: resolved, params, signature }: LoadRequest, route: string) => Promise<Fetched>;
/** The fetches of a load as one. */
export declare const mergeFetched: (fetched: Fetched[]) => Fetched;
export declare const matchRoute: (route: string) => (input: Loader.Route) => Loader.Params | undefined;
export declare const testRoute: (route: string) => (input: Loader.Route) => boolean;
/** The params a loader loads with on `route` – its first matching route's – or `undefined` when none matches. */
export declare const routeParams: (routes: readonly Loader.Route[] | undefined, route: string) => Loader.Params | undefined;
/** Whether any of `routes` can yield params. */
export declare const capturesParams: (routes: readonly Loader.Route[] | undefined) => boolean;
export declare const paramsSignature: (params: Loader.Params) => string;
export {};
