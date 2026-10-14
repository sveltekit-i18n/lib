import { logError, logger } from './logger.js';
// Safe own-property read. Translation keys like `toString`, `constructor` or
// `__proto__` would otherwise resolve to inherited `Object.prototype` members
// instead of being treated as missing translations.
export const hasOwn = (obj, key) => obj != null && Object.prototype.hasOwnProperty.call(obj, key);
// Own-property read: returns the value only when `key` is the object's own
// property, otherwise undefined. Centralizes the prototype-safe table lookup.
export const read = (obj, key) => (hasOwn(obj, key) ? obj[key] : undefined);
export const translate = (config, locale, key, params, table, fallbackTable) => {
    if (!key) {
        logger.warn(`No translation key provided ('${locale}' locale). Skipping translation...`);
        return '';
    }
    if (!locale) {
        logger.warn(`No locale provided for '${key}' key. Skipping translation...`);
        return '';
    }
    const fallbackLocale = config?.fallbackLocale;
    let text = read(table, key);
    if (fallbackLocale && text === undefined) {
        logger.debug(`No translation provided for '${key}' key in locale '${locale}'. Trying fallback '${fallbackLocale}'`);
        text = read(fallbackTable, key);
    }
    if (text === undefined) {
        logger.debug(`No translation provided for '${key}' key in fallback '${fallbackLocale}'.`);
        if (hasOwn(config, 'fallbackValue')) {
            return config?.fallbackValue;
        }
        logger.warn(`No translation nor fallback found for '${key}' .`);
        // There is nothing to interpolate, so no parser is asked to. Echoing the
        // key is what makes a missing translation visible instead of blank.
        return key;
    }
    const parser = config?.parser;
    if (!parser || typeof parser.parse !== 'function') {
        // Reached on every call while no parser is set (e.g. before config loads),
        // so keep it at debug to avoid flooding logs on the render path.
        logger.debug(`No parser configured. Returning raw value for '${key}' key.`);
        return text;
    }
    // A key schema narrows the rest params to one key's payload — still a `P`,
    // but no longer provably so once the tuple has been rebuilt.
    return parser.parse(text, params, locale, key);
};
// `Intl.Collator.supportedLocalesOf` is comparatively expensive and locales
// repeat constantly — per loader on every load trigger, per lookup. A locale
// Intl rejects is remembered too: its data is fixed for the life of the realm,
// as the remembered hits already assume. It is still reported on every call,
// so the warning reaches whichever logger and level is installed at the time.
const LOCALE_CACHE_LIMIT = 1000;
const sanitizedLocaleCache = new Map();
// Insertion order is the eviction order, so reinserting on a hit makes it
// least-recently-used: a flood of visitor-supplied locales evicts itself
// rather than the app's own.
const recallSanitizedLocale = (locale) => {
    const cached = sanitizedLocaleCache.get(locale);
    if (cached === undefined)
        return undefined;
    sanitizedLocaleCache.delete(locale);
    sanitizedLocaleCache.set(locale, cached);
    return cached;
};
const rememberSanitizedLocale = (locale, sanitized) => {
    if (sanitizedLocaleCache.size >= LOCALE_CACHE_LIMIT) {
        sanitizedLocaleCache.delete(sanitizedLocaleCache.keys().next().value);
    }
    sanitizedLocaleCache.set(locale, sanitized);
};
const mapLocales = (transform) => (...locales) => {
    if (!locales.length)
        return [];
    return locales.filter((locale) => !!locale).map(transform);
};
const sanitizeLocale = (locale) => {
    try {
        const [sanitized] = Intl.Collator.supportedLocalesOf(locale);
        if (sanitized)
            return { locale: sanitized };
    }
    catch { /* reported as non-standard */ }
    return { locale: `${locale}`.toLowerCase(), nonStandard: true };
};
export const sanitizeLocales = mapLocales((locale) => {
    // Only a string is a faithful key for itself.
    const cacheable = typeof locale === 'string';
    let sanitized = cacheable ? recallSanitizedLocale(locale) : undefined;
    if (!sanitized) {
        sanitized = sanitizeLocale(locale);
        if (cacheable)
            rememberSanitizedLocale(locale, sanitized);
    }
    if (sanitized.nonStandard)
        logger.warn(`'${locale}' locale is non-standard.`);
    return sanitized.locale;
});
// What the default sanitizer makes of a locale, without its warning: for a
// locale handed in on every call, which may be a visitor's, so it is never
// remembered.
export const quietlySanitized = (locale) => (recallSanitizedLocale(locale) ?? sanitizeLocale(locale)).locale;
// The normalization `config.sanitizeLocales` asks for. A custom transform is
// consumer code and every table is keyed by what it returns, so a throwing or
// empty-handed one degrades to the locale as authored.
export const sanitizerFactory = (sanitize = true) => {
    if (typeof sanitize === 'function') {
        return mapLocales((locale) => {
            const input = `${locale}`;
            try {
                const transformed = sanitize(input);
                if (transformed)
                    return `${transformed}`;
                logger.warn(`'sanitizeLocales' returned no locale for '${input}'.`);
            }
            catch (error) {
                logError(`'sanitizeLocales' failed for '${input}' locale.`, error);
            }
            return input;
        });
    }
    if (!sanitize)
        return mapLocales((locale) => `${locale}`);
    return sanitizeLocales;
};
// Every other locale-keyed surface (`locale`, `fallbackLocale`, loader data,
// the loaded-key bookkeeping) is sanitized, so a table handed in under a raw
// locale would be unreachable. Merged rather than replaced: two spellings of
// one locale are one entry.
export const sanitizeTranslationLocales = (input, sanitize) => (Object.keys(input).reduce((acc, locale) => {
    const [sanitized = locale] = sanitize(locale);
    return { ...acc, [sanitized]: { ...read(acc, sanitized), ...read(input, locale) } };
}, {}));
// An `Accept-Language` field is visitor-controlled and unbounded, while a
// browser sends a handful of ranges — the tail of a flood carries no
// preference worth reading.
const MAX_RANGES = 100;
// RFC 4647 §4.4 lets a protocol cap a range but never below 35 characters:
// language(8) + script(5) + region(4) + two variants(18). The cap is also what
// bounds the truncation chain below.
const MAX_RANGE_LENGTH = 64;
const WILDCARD = '*';
const ALPHA = 'abcdefghijklmnopqrstuvwxyz';
const ALPHANUM = `${ALPHA}0123456789`;
const QVALUE = '0123456789.';
const isSubtag = (subtag, allowed) => (!!subtag.length && subtag.length <= 8 && [...subtag].every((char) => allowed.includes(char)));
// RFC 4647 §2.1: `(1*8ALPHA *("-" 1*8alphanum))`. Anything else is not a range,
// which is what keeps `constructor` and a half-parsed header from becoming one.
const isLanguageRange = (range) => {
    const [primary = '', ...rest] = range.split('-');
    return isSubtag(primary, ALPHA) && rest.every((subtag) => isSubtag(subtag, ALPHANUM));
};
const specificityOf = (range) => (range === WILDCARD ? 0 : range.split('-').length);
// RFC 9110 §12.4.2: `q` is case-insensitive and its absence means 1. A weight
// that is not a number drops its own range — reading it as 1 would promote
// junk to the strongest preference, and 0 would turn it into a refusal.
const readWeight = (parameters) => {
    const value = parameters.reduce((acc, parameter) => {
        if (acc !== undefined)
            return acc;
        const compact = parameter.split(' ').join('').split('\t').join('').toLowerCase();
        return compact.startsWith('q=') ? compact.slice(2) : acc;
    }, undefined);
    if (value === undefined)
        return 1;
    // A qvalue is decimal digits and a dot; `Number` alone would also read
    // `0x10` and `1e3`, and an empty one as zero.
    if (!value.length || [...value].some((char) => !QVALUE.includes(char)))
        return undefined;
    const parsed = Number(value);
    if (!Number.isFinite(parsed))
        return undefined;
    return Math.min(1, Math.max(0, parsed));
};
const parseRanges = (field) => (
// Bounded at the split rather than after it: materializing every member of a
// hostile field would spend exactly what the cap is there to refuse.
field.split(',', MAX_RANGES).reduce((acc, element, order) => {
    const [head = '', ...parameters] = element.split(';');
    const range = head.trim().toLowerCase();
    if (!range || range.length > MAX_RANGE_LENGTH)
        return acc;
    if (range !== WILDCARD && !isLanguageRange(range))
        return acc;
    const q = readWeight(parameters);
    if (q === undefined)
        return acc;
    const seen = acc.find((known) => known.range === range);
    // A range repeated within one field is one preference, at the strongest
    // weight it was given.
    if (seen)
        return acc.map((known) => (known === seen ? { ...known, q: Math.max(known.q, q) } : known));
    return [...acc, { range, q, order, specificity: specificityOf(range) }];
}, []));
// RFC 5646 §4.4.2: a single-character subtag introduces an extension or a
// private-use sequence, so it never outlives the subtag it introduced.
const withoutTrailingSingleton = (subtags) => (subtags.at(-1)?.length === 1 ? withoutTrailingSingleton(subtags.slice(0, -1)) : subtags);
// The range, then its progressively shorter prefixes – `zh-hant-tw`, `zh-hant`,
// `zh`. Only the REQUESTED range is ever truncated; an available locale is
// compared as it was spelled.
const prefixes = (range) => {
    const walk = (subtags) => (subtags.length ? [subtags.join('-'), ...walk(withoutTrailingSingleton(subtags.slice(0, -1)))] : []);
    return walk(range.split('-'));
};
const covers = (range, folded) => range === WILDCARD || folded === range || folded.startsWith(`${range}-`);
// Weight first; at equal weight a concrete range is consulted before the
// wildcard, and the order the field spelled them in breaks what is left.
const byPreference = (a, b) => (b.q - a.q
    || Number(a.range === WILDCARD) - Number(b.range === WILDCARD)
    || a.order - b.order);
/**
 * Matches what a visitor asked for against the locales an app actually has.
 *
 * `requested` is an `Accept-Language` field value, a single locale, or a
 * preference list such as `navigator.languages`; `available` is the configured
 * set, and the winner is returned as IT spells it. A miss is `undefined` rather
 * than a guess – what a miss means is the caller's to decide.
 */
export const matchLocale = (requested, available) => {
    // Narrowing `available` in place would widen it to `any[]` and take the
    // locale union down with it, so the guard hands the value back as it is
    // declared.
    const locales = Array.isArray(available) ? available : [];
    const candidates = locales.reduce((acc, locale) => (locale && typeof locale === 'string' ? [...acc, { locale, folded: locale.toLowerCase() }] : acc), []);
    if (!candidates.length)
        return undefined;
    // Anything that is not a field value carries no preference – an absent
    // header, a parsed body, a mistyped local. Reading one is a miss, not a throw.
    const field = typeof requested === 'string'
        ? requested
        : Array.isArray(requested)
            ? requested.slice(0, MAX_RANGES).filter((value) => typeof value === 'string').join(',')
            : '';
    const parsed = parseRanges(field);
    const refusals = parsed.filter(({ q }) => !q);
    // RFC 2616's longest-matching-range rule, reduced to the only comparison it
    // ever needs: a refusal loses to a strictly more specific positive match. A
    // refused candidate is skipped rather than blacklisted, so a later, more
    // specific range can still select it.
    const accepted = (folded, specificity) => refusals.every(({ range, specificity: refused }) => (!covers(range, folded) || refused < specificity));
    const select = (range) => {
        if (range === WILDCARD)
            return candidates.find(({ folded }) => accepted(folded, 0))?.locale;
        const found = prefixes(range).reduce((match, prefix) => match ?? candidates.find(({ folded }) => folded === prefix && accepted(folded, specificityOf(prefix)))?.locale, undefined);
        if (found)
            return found;
        // Truncation answers nothing when the available set is FINER than the
        // range, which is the other half of the gap. The range AS WRITTEN is then
        // read as a prefix – never a truncated one, so `en` reaches `en-GB` while
        // `en-GB` never reaches the sibling `en-US`.
        return candidates.find(({ folded }) => folded.startsWith(`${range}-`) && accepted(folded, specificityOf(range)))?.locale;
    };
    return parsed
        .filter(({ q }) => q > 0)
        .sort(byPreference)
        .reduce((match, { range }) => match ?? select(range), undefined);
};
// The scripts Unicode writes right to left, the historic ones and the ISO 15924
// variants of the living ones (`Aran`, `Syre`) included.
const RTL_SCRIPTS = new Set([
    'Adlm', 'Arab', 'Aran', 'Armi', 'Avst', 'Chrs', 'Cprt', 'Elym', 'Gara', 'Hatr', 'Hebr', 'Hung', 'Khar', 'Lydi',
    'Mand', 'Mani', 'Mend', 'Merc', 'Mero', 'Narb', 'Nbat', 'Nkoo', 'Orkh', 'Ougr', 'Palm', 'Phli', 'Phlp',
    'Phnx', 'Prti', 'Rohg', 'Samr', 'Sarb', 'Sidt', 'Sogd', 'Sogo', 'Syrc', 'Syre', 'Syrj', 'Syrn', 'Thaa', 'Yezi',
]);
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
export const textDirection = (locale) => {
    if (typeof locale !== 'string')
        return 'ltr';
    try {
        const tag = new Intl.Locale(locale);
        const script = tag.script ?? tag.maximize().script;
        return script && RTL_SCRIPTS.has(script) ? 'rtl' : 'ltr';
    }
    catch {
        return 'ltr';
    }
};
/**
 * `route` without `basePath` in front of it, cut on a segment boundary only:
 * under `/repo`, `/repo/about` is `/about`, `/repo` is `/` and `/repo?tab=1`
 * is `/?tab=1`, while `/repository` and a route without the prefix pass
 * through unchanged.
 */
export const withoutBasePath = (route, basePath) => {
    if (typeof route !== 'string' || typeof basePath !== 'string')
        return route;
    let end = basePath.length;
    while (end > 0 && basePath[end - 1] === '/')
        end -= 1;
    const base = basePath.slice(0, end);
    if (!base || !route.startsWith(base))
        return route;
    const rest = route.slice(base.length);
    if (!rest)
        return '/';
    if (rest[0] === '?' || rest[0] === '#')
        return `/${rest}`;
    return rest.startsWith('/') ? rest : route;
};
// A pathname is visitor input and the matcher backtracks over it, so a longer
// one is not examined at all.
const MAX_ROUTE_SEGMENTS = 64;
const decodeSegment = (segment) => {
    try {
        return decodeURIComponent(segment);
    }
    catch {
        return segment;
    }
};
/** Whether one pathname segment fits one route id segment, where `[x]` stands for one or more characters. */
const fitsSegment = (segment, pattern) => {
    const parts = pattern.split(/(\[[^\]]+\])/);
    if (parts.length === 1)
        return segment === pattern;
    const first = parts[0];
    const last = parts[parts.length - 1];
    if (!segment.startsWith(first) || !segment.endsWith(last))
        return false;
    // The leftmost placement of each literal leaves the most room to the rest.
    const position = parts.slice(2, -1).filter((_, index) => index % 2 === 0).reduce((at, literal) => {
        if (at < 0)
            return at;
        const found = segment.indexOf(literal, at + 1);
        return found < 0 ? -1 : found + literal.length;
    }, first.length);
    return position >= 0 && segment.length - last.length - position >= 1;
};
/**
 * What stands in front of the part of `pathname` that SvelteKit's `routeId`
 * matched: `''` when nothing does, `undefined` when the id fits no suffix of
 * it, when it is `null` (a 404), or when the pathname is too long to examine.
 * Param matchers cannot run here, so an optional param on the first segment
 * absorbs a prefix. No regex runs on the pathname.
 */
export const routePrefix = (pathname, routeId) => {
    if (typeof pathname !== 'string' || typeof routeId !== 'string')
        return undefined;
    const raw = pathname.split('/').filter(Boolean);
    if (raw.length > MAX_ROUTE_SEGMENTS)
        return undefined;
    const segments = raw.map(decodeSegment);
    const patterns = routeId.split('/').filter((pattern) => pattern && !(pattern.startsWith('(') && pattern.endsWith(')')));
    const fitted = new Map();
    // Whether the segments from `at` on fit the patterns from `index` on. Each
    // pair is decided once, which keeps rest and optional params polynomial.
    const fits = (at, index) => {
        const key = at * (patterns.length + 1) + index;
        const known = fitted.get(key);
        if (known !== undefined)
            return known;
        const pattern = patterns[index];
        const result = pattern === undefined
            ? at === segments.length
            : pattern.startsWith('[[') && pattern.endsWith(']]')
                ? fits(at, index + 1) || (at < segments.length && fits(at + 1, index + 1))
                : pattern.startsWith('[...') && pattern.endsWith(']')
                    ? segments.slice(at).some((_, skip) => fits(at + skip, index + 1)) || fits(segments.length, index + 1)
                    : at < segments.length && fitsSegment(segments[at], pattern) && fits(at + 1, index + 1);
        fitted.set(key, result);
        return result;
    };
    const at = [...segments.keys(), segments.length].find((skip) => fits(skip, 0));
    return at === undefined ? undefined : raw.slice(0, at).map((segment) => `/${segment}`).join('');
};
/** Whether `config.preprocess` is the built-in dot notation. */
export const dotNotates = (preprocess) => typeof preprocess !== 'function' && preprocess !== 'none';
export const toDotNotation = (input, preserveArrays, parentKey) => {
    if (preserveArrays && Array.isArray(input)) {
        return input.map((v) => toDotNotation(v, preserveArrays));
    }
    if (input && typeof input === 'object') {
        // Mutated in place (rebuilding per key is quadratic) into a null-prototype
        // object, then given `Object.prototype` once the last key is written — a
        // spread would copy every key, and a literal '__proto__' key stays an own
        // property either way instead of reaching the prototype setter.
        const output = Object.create(null);
        let hasEntries = false;
        const walk = (node, prefix) => {
            Object.keys(node).forEach((key) => {
                const value = node[key];
                const outputKey = prefix ? `${prefix}.${key}` : `${key}`;
                if (value && typeof value === 'object' && !(preserveArrays && Array.isArray(value))) {
                    walk(value, outputKey);
                }
                else {
                    output[outputKey] = toDotNotation(value, preserveArrays);
                    hasEntries = true;
                }
            });
        };
        walk(input, parentKey);
        if (hasEntries) {
            return Object.setPrototypeOf(output, Object.prototype);
        }
        return null;
    }
    return input;
};
const asList = (value) => (Array.isArray(value) ? value : [value]);
export const unique = (values) => Array.from(new Set(values));
// Tagged by form, so a string route and a pattern with the same text differ. A
// matcher's behavior cannot be read — only that it is one.
const describeRoute = (route) => {
    if (typeof route === 'string')
        return `s:${route}`;
    if (route instanceof RegExp)
        return `r:${String(route)}`;
    return 'm';
};
// The content itself rather than a hash of it: equality stays exact, and the
// string repeats what a serialized payload already carries, so it compresses
// with it. The pairs of one descriptor share its `routes`, so each list is
// described once per resolution rather than once per pair.
const loaderId = ({ locale, namespace, routes }, describe) => JSON.stringify(routes ? [locale, namespace, describe(routes)] : [locale, namespace]);
// A name shared by two loaders would hand one's records to the other, so
// neither keeps it.
const withIds = (loaders) => {
    const described = new Map();
    const describe = (routes) => {
        const known = described.get(routes);
        if (known !== undefined)
            return known;
        const description = routes.map(describeRoute);
        described.set(routes, description);
        return description;
    };
    const ids = loaders.map((loader) => {
        try {
            return loaderId(loader, describe);
        }
        catch (error) {
            logError('Cannot derive an id for a loader.', error);
            return null;
        }
    });
    const counts = ids.reduce((acc, id) => acc.set(id, (acc.get(id) ?? 0) + 1), new Map());
    return loaders.map((loader, index) => {
        const id = ids[index] ?? null;
        return { ...loader, id: counts.get(id) === 1 ? id : null };
    });
};
// Loader properties are consumer code — an accessor may throw. Materialized
// once at the config boundary, so a single unreadable loader costs only itself
// instead of taking down every locale-keyed read downstream. Everything a
// descriptor may spell more than one way is settled here, so nothing
// downstream knows there were several: the two names of the namespace, and a
// list of locales or namespaces, which expands into one loader per pair with
// its locale sanitized. Each loader is named by its content here too.
// A module-level config is read by an instance per request, so the deprecated
// name is reported once per descriptor rather than once per instance.
const reportedDeprecations = new WeakSet();
export const resolveLoaders = (input = [], sanitizeLocales = true) => {
    const sanitize = sanitizerFactory(sanitizeLocales);
    const resolved = [];
    input.forEach((descriptor) => {
        try {
            const { namespace, key, locale, loader, routes, cache } = descriptor;
            if (key !== undefined && !reportedDeprecations.has(descriptor)) {
                reportedDeprecations.add(descriptor);
                logger.warn(`Loader '${String(key)}' uses 'key', which is deprecated. Rename it to 'namespace'.`);
            }
            if (cache !== undefined && cache !== false) {
                logger.error(`Ignoring the 'cache' of loader '${String(namespace ?? key)}': only 'false' is accepted.`);
            }
            const namespaces = unique(asList(namespace ?? key).filter((name) => name != null));
            const locales = unique(sanitize(...asList(locale).filter((name) => name != null)));
            if (!namespaces.length || !locales.length) {
                logger.warn('Skipping a loader that names no locale or no namespace.');
                return;
            }
            locales.forEach((pairLocale) => namespaces.forEach((pairNamespace) => {
                resolved.push({
                    namespace: pairNamespace,
                    locale: pairLocale,
                    loader,
                    routes,
                    ...(cache === false ? { cache } : {}),
                });
            }));
        }
        catch (error) {
            logError('Skipping a loader that cannot be read.', error);
        }
    });
    return withIds(resolved);
};
const isMergeable = (value) => !!value && typeof value === 'object' && !Array.isArray(value);
// Data reaching a namespace that already holds some — route-scoped chunks of
// one namespace, a later load, a second `addTranslations` — contributes to it
// instead of replacing it. Plain objects merge branch by branch; anything else
// is a leaf, and a leaf collision has no merge to perform, so the incoming
// value is kept. Only callers for which a collision means an authoring mistake
// pass `onConflict`.
export const mergeTranslations = (target, source, path, onConflict) => {
    if (!isMergeable(target) || !isMergeable(source)) {
        onConflict?.(path);
        return source;
    }
    const keys = Object.keys(source);
    if (!keys.length) {
        return target;
    }
    // Mutated in place (rebuilding per key is quadratic) into a null-prototype
    // copy of `target`, then given `Object.prototype` once the last key is
    // written — a literal '__proto__' key stays an own property instead of
    // reaching the prototype setter.
    const output = Object.assign(Object.create(null), target);
    keys.forEach((key) => {
        output[key] = hasOwn(output, key) ? mergeTranslations(read(output, key), read(source, key), `${path}.${key}`, onConflict) : read(source, key);
    });
    return Object.setPrototypeOf(output, Object.prototype);
};
// What of `target` still shows once `source` is merged over it: the branches
// both hold as objects keep what `source` leaves out, and anything else it
// sets is gone. `undefined` when `source` replaces the whole of `target`.
export const maskTranslations = (target, source) => {
    if (!isMergeable(target) || !isMergeable(source))
        return undefined;
    return Object.fromEntries(Object.keys(target).flatMap((key) => {
        if (!hasOwn(source, key))
            return [[key, read(target, key)]];
        const masked = maskTranslations(read(target, key), read(source, key));
        return masked === undefined ? [] : [[key, masked]];
    }));
};
// What of `target`, dot-notated under `prefix`, still shows once `keys` are
// dot-notated beside it: a leaf whose key is among them is gone. A key spelled
// with dots and a nested branch meet only there, after `preprocess`. Unless
// `preserveArrays`, an array is walked as `toDotNotation` walks it, and one
// that lost an item keeps the others under their indexes. What lost nothing is
// returned as it is, and an array that lost no item and holds nothing but its
// items stays one.
export const maskOutputKeys = (target, keys, prefix, preserveArrays = false) => {
    const walked = Array.isArray(target) ? !preserveArrays : isMergeable(target);
    if (!walked)
        return keys.has(prefix) ? undefined : target;
    const entries = Object.keys(target).flatMap((key) => {
        const masked = maskOutputKeys(read(target, key), keys, `${prefix}.${key}`, preserveArrays);
        return masked === undefined ? [] : [[key, masked]];
    });
    if (entries.length === Object.keys(target).length) {
        if (entries.every(([key, value]) => Object.is(value, read(target, key))))
            return target;
        if (Array.isArray(target) && entries.every(([key], index) => key === `${index}`))
            return entries.map(([, value]) => value);
    }
    return Object.fromEntries(entries);
};
const isPlainObject = (value) => {
    if (!value || typeof value !== 'object')
        return false;
    const proto = Object.getPrototypeOf(value);
    return proto === Object.prototype || proto === null;
};
const holdsProtoKey = (value) => (Array.isArray(value)
    ? value.some(holdsProtoKey)
    : isPlainObject(value) && Object.keys(value).some((key) => key === '__proto__' || holdsProtoKey(value[key])));
const withoutProtoKeys = (value) => {
    if (Array.isArray(value)) {
        const items = value.map(withoutProtoKeys);
        return items.some((item, i) => !Object.is(item, value[i])) ? items : value;
    }
    if (!isPlainObject(value))
        return value;
    const keys = Object.keys(value);
    const entries = keys.filter((key) => key !== '__proto__').map((key) => [key, withoutProtoKeys(value[key])]);
    if (entries.length === keys.length && entries.every(([key, item]) => Object.is(item, value[key])))
        return value;
    return Object.fromEntries(entries);
};
// devalue, which SvelteKit serializes load data with, refuses an object with
// an own '__proto__' key. Branches without one are returned as they are. A
// snapshot runs this over every table, so a scan that copies nothing decides
// first whether there is anything to leave out.
export const omitProtoKeys = (value) => (holdsProtoKey(value) ? withoutProtoKeys(value) : value);
const reportLoaderConflict = (path) => {
    logger.warn(`Conflicting translations for '${path}'. Keeping the value of the last loader.`);
};
export const serialize = (input) => {
    return input.reduce((acc, { namespace, data, locale }) => {
        if (!data)
            return acc;
        // The locale is already sanitized — loaders are normalized before the fetch.
        const namespaces = read(acc, locale);
        return ({
            ...acc,
            [locale]: {
                ...namespaces,
                [namespace]: hasOwn(namespaces, namespace) ? mergeTranslations(read(namespaces, namespace), data, String(namespace), reportLoaderConflict) : data,
            },
        });
    }, {});
};
/** The locales the loaders serve, then the ones the tables hold. */
export const servedLocales = (loaders, tables) => unique([
    ...loaders.map(({ locale }) => locale),
    ...Object.keys(tables),
]);
/**
 * The locales a config serves, from its loaders as `resolveLoaders` resolved
 * them, sanitized as an instance built from it sanitizes them. Resolving the
 * loaders logs what is wrong with them, so a caller resolves them once per
 * config.
 */
export const configLocales = ({ translations, sanitizeLocales: strategy }, loaders) => servedLocales(loaders, translations ? sanitizeTranslationLocales(translations, sanitizerFactory(strategy)) : {});
/** A loader as a message names it. `String`, since interpolating a Symbol namespace throws. */
export const loaderName = ({ locale, namespace }) => `'${locale}' > '${String(namespace)}'`;
/**
 * SvelteKit's control flow, told by the shape of its classes so nothing is
 * imported from `@sveltejs/kit`: a `Redirect` (an integer `status` from 300 to
 * 308 and a string `location`) and an `HttpError` below 500 (an integer
 * `status` from 400 to 499 and an object `body`), each an own property of a
 * value that is neither an `Error` of this realm nor tagged `'Error'`. An
 * `HttpError` of 500 or more is a failure — a remote `query` throws one on the
 * client whenever the server failed with an `Error` (during SSR, the query
 * throws the server's own error) — and so is such an `Error`, whatever it
 * carries, and a value that cannot be inspected.
 */
const isControlFlow = (value) => {
    try {
        // The tag covers another realm's `Error`; `instanceof` covers one whose
        // tag its own class replaced, a `DOMException` included.
        if (value instanceof Error || Object.prototype.toString.call(value) === '[object Error]')
            return false;
        const status = read(value, 'status');
        if (typeof status !== 'number' || !Number.isInteger(status))
            return false;
        if (status >= 300 && status <= 308)
            return typeof read(value, 'location') === 'string';
        if (!(status >= 400 && status <= 499))
            return false;
        const body = read(value, 'body');
        return typeof body === 'object' && body !== null;
    }
    catch {
        return false;
    }
};
// One loader's fetch. One that throws is logged and costs only its own data;
// SvelteKit's control flow is returned for the load to report and reject with
// once every loader of it has settled. Only a throw is retried: an empty
// answer is an answer, and it still replaces what the loader delivered for
// other params.
export const fetchTranslation = async ({ loader: resolved, params, signature }, route) => {
    const { loader, locale, namespace } = resolved;
    try {
        const data = await loader({ locale, namespace, route, params });
        return { deliveries: [{ loader: resolved, signature, data: data || {} }], controlFlow: [] };
    }
    catch (error) {
        if (isControlFlow(error))
            return { deliveries: [], controlFlow: [{ loader: resolved, signature, value: error }] };
        logError(`Failed to load translation. Verify your ${loaderName(resolved)} Loader.`, error);
        return { deliveries: [], controlFlow: [] };
    }
};
/** The fetches of a load as one. */
export const mergeFetched = (fetched) => ({
    deliveries: fetched.flatMap(({ deliveries }) => deliveries),
    controlFlow: fetched.flatMap(({ controlFlow }) => controlFlow),
});
// `exec` advances `lastIndex` on a `g`/`y` pattern, so a route object reused
// across navigations would match only every other time — and writing to the
// consumer's own pattern is not ours to do, least of all when it is frozen.
const withoutMatchState = (input) => (input.global || input.sticky
    ? new RegExp(input.source, input.flags)
    : input);
// A match yields the named groups of a pattern, copied onto a plain object
// (a match's `groups` has a null prototype) without the groups that did not
// take part. A string route and a matcher yield none. `undefined` is no match.
export const matchRoute = (route) => (input) => {
    try {
        if (typeof input === 'string')
            return input === route ? {} : undefined;
        if (input instanceof RegExp) {
            const match = withoutMatchState(input).exec(route);
            if (!match)
                return undefined;
            return Object.entries(match.groups ?? {}).reduce((acc, [name, value]) => (value === undefined ? acc : { ...acc, [name]: value }), {});
        }
        return input.test(route) ? {} : undefined;
    }
    catch (error) {
        logError('Invalid route config!', error);
    }
    return undefined;
};
export const testRoute = (route) => (input) => matchRoute(route)(input) !== undefined;
/** The params a loader loads with on `route` – its first matching route's – or `undefined` when none matches. */
export const routeParams = (routes, route) => {
    if (!routes)
        return {};
    const match = matchRoute(route);
    return routes.reduce((found, input) => found ?? match(input), undefined);
};
// Whether a route can yield params: a pattern with a named group. Read off an
// empty match of the pattern made optional, whose `groups` names every group.
const namesGroups = (input) => {
    if (!(input instanceof RegExp))
        return false;
    try {
        const groups = new RegExp(`(?:${input.source})|`, input.flags.replace(/[gy]/g, '')).exec('')?.groups;
        return !!groups && Object.keys(groups).length > 0;
    }
    catch {
        return false;
    }
};
/** Whether any of `routes` can yield params. */
export const capturesParams = (routes) => !!routes?.some(namesGroups);
// Keyed on the params alone, not the route: two routes yielding the same params
// describe the same data. Stable in key order, and '' for none, so a loader
// without params keys the way a namespace record does.
export const paramsSignature = (params) => {
    const names = Object.keys(params).sort();
    return names.length ? JSON.stringify(names.map((name) => [name, read(params, name)])) : '';
};
