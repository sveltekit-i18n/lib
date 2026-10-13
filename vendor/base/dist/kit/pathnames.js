import { BROWSER } from '#kit-env';
import { TRANSLATION } from './internal.js';
const PARAM = /^\[(\.\.\.)?(\w+)\]$/;
const decodeSegment = (segment) => {
    try {
        return decodeURIComponent(segment);
    }
    catch {
        return segment;
    }
};
// Segment by segment, as the walks read them: an escaped slash stays inside its segment.
const samePath = (a, b) => {
    const left = a.split('/');
    const right = b.split('/');
    return left.length === right.length && left.every((segment, index) => segment === right[index] || decodeSegment(segment) === decodeSegment(right[index]));
};
// What a pathname holds raw: the unreserved characters, the sub-delimiters,
// `:` and `@`. A static segment is decoded, so its `%` is a character; a path
// the app hands `localizePath` keeps its escapes and its slashes.
// A lone surrogate has no encoding, so a segment holding one is no pattern.
const encodeStatic = (decoded) => {
    try {
        return decoded.replace(/[^\w\-.~!$&'()*+,;=:@]/gu, encodeURIComponent);
    }
    catch {
        return undefined;
    }
};
const encodePath = (path) => path.replace(/[^\w\-.~!$&'()*+,;=:@%/]/gu, encodeURIComponent);
/** `pathname` split into segments, or `undefined` when it holds an empty one: no pattern matches it. */
const split = (pathname) => {
    if (pathname === '/')
        return { segments: [], trailing: false };
    if (!pathname.startsWith('/'))
        return undefined;
    const segments = pathname.slice(1).split('/');
    const trailing = segments.length > 1 && segments[segments.length - 1] === '';
    if (trailing)
        segments.pop();
    return segments.includes('') ? undefined : { segments, trailing };
};
const parse = (input) => {
    if (typeof input !== 'string')
        return undefined;
    const parts = input.includes('?') || input.includes('#') ? undefined : split(input);
    if (!parts)
        return undefined;
    const { segments: raw } = parts;
    const segments = [];
    const names = [];
    let rest;
    for (const [index, part] of raw.entries()) {
        const param = PARAM.exec(part);
        if (param) {
            const [, spread, name] = param;
            if (names.includes(name) || (spread && index < raw.length - 1))
                return undefined;
            names.push(name);
            if (spread)
                rest = name;
            else
                segments.push({ param: name });
        }
        else {
            const decoded = decodeSegment(part);
            const encoded = encodeStatic(decoded);
            if (encoded === undefined || part.includes('[') || part.includes(']') || decoded === '.' || decoded === '..')
                return undefined;
            segments.push({ decoded, encoded });
        }
    }
    const shape = JSON.stringify([...segments.map((segment) => ('param' in segment ? 0 : segment.decoded)), rest === undefined ? 1 : 2]);
    return { pattern: { segments, rest }, shape, names: JSON.stringify([[...names].sort(), rest]), order: JSON.stringify(names) };
};
const insert = (root, { segments, rest }) => {
    const node = segments.reduce((at, segment) => {
        if ('param' in segment)
            return (at.param ??= {});
        const statics = (at.statics ??= new Map());
        const next = statics.get(segment.decoded) ?? {};
        statics.set(segment.decoded, next);
        return next;
    }, root);
    return { node, slot: rest === undefined ? 'end' : 'rest' };
};
/**
 * The most specific match of the trie `accept` takes for `segments`, as
 * SvelteKit ranks its routes: a static segment before a param, a param before
 * a rest, the leftmost segment first. A node sits at the depth of its segment,
 * so a walk visits each node once at most.
 */
const walk = (root, segments, accept) => {
    const decoded = [];
    const params = [];
    const accepted = (value, rest) => {
        const found = value === undefined ? undefined : { value, params: [...params], rest };
        return found && accept(found) ? found : undefined;
    };
    const visit = (node, at) => {
        const end = at === segments.length ? accepted(node.end, '') : undefined;
        if (end)
            return end;
        if (at < segments.length) {
            const child = node.statics && node.statics.get(decoded[at] ??= decodeSegment(segments[at]));
            const found = child && visit(child, at + 1);
            if (found)
                return found;
            if (node.param) {
                params.push(segments[at]);
                const deeper = visit(node.param, at + 1);
                params.pop();
                if (deeper)
                    return deeper;
            }
        }
        return node.rest === undefined ? undefined : accepted(node.rest, segments.slice(at).join('/'));
    };
    return visit(root, 0);
};
/** The values a match captured, by the names of the pattern it matched. */
const captured = ({ segments, rest }, found) => {
    const values = new Map();
    segments.filter((segment) => 'param' in segment).forEach(({ param }, index) => values.set(param, found.params[index]));
    if (rest !== undefined)
        values.set(rest, found.rest);
    return values;
};
/** `pattern` filled with `values`, an empty rest left out as SvelteKit's `resolve` does. */
const fill = ({ segments, rest }, values, trailing) => {
    const parts = segments.map((segment) => ('param' in segment ? values.get(segment.param) ?? '' : segment.encoded));
    const tail = rest === undefined ? '' : values.get(rest) ?? '';
    const path = `/${(tail ? [...parts, tail] : parts).join('/')}`;
    return trailing && path !== '/' ? `${path}/` : path;
};
/** The canonical path of a localized one, and the pattern that reads it. */
const delocalized = (localized, path) => {
    const parts = split(path);
    if (!parts)
        return undefined;
    const found = walk(localized, parts.segments, () => true);
    if (!found)
        return undefined;
    const { entry, pattern } = found.value;
    return { path: fill(entry.canonical, captured(pattern, found), parts.trailing), claim: found.value };
};
const localeOf = (locales) => (locales.length === 1 ? locales[0] : undefined);
/** Whether the pathname a match led to reads as the lowercased `locale` alone. */
const pins = (led, locale) => led !== undefined && localeOf(led.claim.locales)?.toLowerCase() === locale;
/**
 * The pathname `target` fills with what a canonical match captured, and the
 * pattern that reads it, where that leads back to the same page: a more
 * specific pattern can take the path a match fills for another page.
 */
const lead = (back, found, target, trailing) => {
    if (!target)
        return undefined;
    const values = captured(found.value.canonical, found);
    const localized = fill(target, values, trailing);
    const led = delocalized(back, localized);
    // The root keeps no trailing slash, so neither does the way back from it.
    return led?.path === fill(found.value.canonical, values, trailing && localized !== '/') ? { localized, claim: led.claim } : undefined;
};
/**
 * The first pathname of `wanted`, lowercased, that reads as `wanted` alone,
 * and the first that every locale of its pattern shares, of the entries that
 * match `parts`, in rank order; the walk stops at the first of the former.
 */
const ranked = ({ localized: back, canonical: root }, parts, wanted, instead) => {
    const chosen = {};
    // A pathname that reads as the wanted locale wins over one every
    // locale it names shares, which the visitor's locale would read it as.
    walk(root, parts.segments, (found) => {
        const led = found.value === instead?.entry ? instead : lead(back, found, found.value.targets.get(wanted)?.pattern, parts.trailing);
        if (led && localeOf(led.claim.locales) === undefined)
            chosen.shared ??= { ...led, entry: found.value };
        else if (led && pins(led, wanted))
            chosen.pinned = { ...led, entry: found.value };
        return chosen.pinned !== undefined;
    });
    return chosen;
};
/**
 * A percent-encoded canonical `pathname` translated to `wanted`, lowercased,
 * or to any locale without a pathname of its own when `wanted` is left out;
 * `undefined` for a pathname it cannot split.
 */
const localize = (tries, pathname, wanted) => {
    const { localized: back, canonical: root, locales } = tries;
    const parts = split(pathname);
    if (!parts)
        return undefined;
    const chosen = wanted !== undefined && locales.has(wanted) ? ranked(tries, parts, wanted) : {};
    const localized = chosen.pinned?.localized ?? chosen.shared?.localized;
    if (localized !== undefined)
        return localized;
    // Short of the wanted locale, a path that serves its own page stays,
    // and one another page is served at takes any locale's pathname of it.
    const own = delocalized(back, pathname);
    if (!own || samePath(own.path, pathname))
        return pathname;
    let other;
    walk(root, parts.segments, (found) => [...found.value.targets.values()].some((target) => (other = lead(back, found, target.pattern, parts.trailing)?.localized) !== undefined));
    return other ?? pathname;
};
const withoutSlash = (path) => (path.endsWith('/') ? path.slice(0, -1) : path);
/**
 * The locales of `claim`, which reads a pathname as the canonical `path`, of
 * those `within` holds when given and lowercased, that no other entry that
 * matches `path` translates to where `localizePath` would take it: ahead of
 * the claim's entry, or, for a pattern several locales share, past it through
 * a pattern of that locale alone, which outranks it. `localizePath` leads
 * `path` in each of them to the pathname the claim's pattern fills, the one
 * it read.
 */
const unrivaled = ({ canonical }, { entry, locales }, path, within) => {
    const pinned = locales.length === 1;
    const open = new Set(locales.map((locale) => locale.toLowerCase()).filter((locale) => !within || within.has(locale)));
    let reached = false;
    if (!open.size)
        return open;
    walk(canonical, split(path).segments, ({ value }) => {
        if (value === entry)
            reached = true;
        else {
            open.forEach((locale) => {
                const target = value.targets.get(locale);
                if (target && (!reached || target.locales.length === 1))
                    open.delete(locale);
            });
        }
        return !open.size || (reached && pinned);
    });
    if (!reached)
        open.clear();
    return open;
};
/**
 * Whether `localizePath` translates the canonical `path` to `pathname`, which
 * the table reads as `path`, in `wanted`, lowercased, or in a locale without
 * a pathname of its own when left out, a trailing slash aside, which
 * SvelteKit settles once a route matched.
 */
const leads = (tries, path, pathname, wanted) => {
    const localized = localize(tries, path, wanted);
    return localized !== undefined && samePath(withoutSlash(localized), withoutSlash(pathname));
};
/**
 * Whether `localizePath` translates the canonical `path` to `pathname` in
 * any locale: `reroute` serves a page at no other pathname. A locale gives a
 * pathname of its own only through a pattern that matches it, so the locales
 * of those patterns are tried, the most specific first, and then what a
 * locale without one gets.
 */
const leadsTo = (tries, path, pathname) => {
    const parts = split(pathname);
    if (!parts)
        return false;
    const locales = new Set();
    walk(tries.localized, parts.segments, ({ value }) => {
        value.locales.forEach((locale) => locales.add(locale.toLowerCase()));
        return false;
    });
    return [...locales, undefined].some((locale) => leads(tries, path, pathname, locale));
};
/** The children of `node`: its statics, then its param. */
const childrenOf = (node) => [...node.statics?.values() ?? [], ...(node.param ? [node.param] : [])];
/** The nodes of `roots`, each before its children: a table can be too deep to recurse into. */
const nodesOf = (...roots) => {
    const nodes = [...roots];
    for (const node of nodes)
        childrenOf(node).forEach((child) => nodes.push(child));
    return nodes;
};
/** A source of param values no static segment of the tries spells, a new one per call. */
const sampler = (...roots) => {
    const statics = new Set();
    for (const node of nodesOf(...roots))
        node.statics?.forEach((_, segment) => statics.add(segment));
    let count = 0;
    return () => {
        let next;
        do
            next = `_${count++}`;
        while (statics.has(next));
        return next;
    };
};
/**
 * The pages each localized pattern takes a pathname of: the pathnames a
 * pattern matches that are pages of the canonical trie, which no rest of it
 * captures, and that the localized trie reads as another one. Both tries are
 * walked together, a node of each per depth: a static segment meets its own
 * static and a param, a param meets every static and a param, with a value no
 * static spells, and a rest every node below. Each pathname laid out so is
 * read through both tries, as `delocalize` reads it.
 */
const overlaps = (localized, canonical, value) => {
    const found = new Map();
    const segments = [];
    const read = () => {
        const page = walk(canonical, segments, () => true);
        if (!page || page.rest !== '')
            return;
        const claim = walk(localized, segments, () => true);
        if (!claim || fill(claim.value.entry.canonical, captured(claim.value.pattern, claim), false) === `/${segments.join('/')}`)
            return;
        const pages = found.get(claim.value) ?? new Set();
        found.set(claim.value, pages.add(page.value));
    };
    const step = (segment, next) => {
        segments.push(segment);
        next();
        segments.pop();
    };
    const below = (page) => {
        if (page.end || page.rest)
            read();
        page.statics?.forEach((child, segment) => step(encodeStatic(segment), () => below(child)));
        if (page.param)
            step(value(), () => below(page.param));
    };
    const pair = (claim, page) => {
        if (claim.end && (page.end || page.rest))
            read();
        if (claim.rest)
            below(page);
        if (page.param)
            claim.statics?.forEach((child, segment) => step(encodeStatic(segment), () => pair(child, page.param)));
        // Of two static levels, the narrower is the one looked up.
        if (claim.statics && page.statics) {
            const [narrow, wide] = claim.statics.size <= page.statics.size ? [claim.statics, page.statics] : [page.statics, claim.statics];
            narrow.forEach((_, segment) => {
                if (wide.has(segment))
                    step(encodeStatic(segment), () => pair(claim.statics.get(segment), page.statics.get(segment)));
            });
        }
        if (claim.param) {
            page.statics?.forEach((child, segment) => step(encodeStatic(segment), () => pair(claim.param, child)));
            if (page.param)
                step(value(), () => pair(claim.param, page.param));
        }
    };
    pair(localized, canonical);
    return found;
};
/** The nodes of `root` a pathname of `segments` reaches. */
const reach = (root, segments) => segments.reduce((nodes, segment) => {
    const decoded = decodeSegment(segment);
    return nodes.flatMap((node) => [node.statics?.get(decoded), node.param].filter((next) => next !== undefined));
}, [root]);
/**
 * The lengths of a rest past the nodes `from` reaches at which what matches
 * can change: where a node of the param chains below them ends or rests, the
 * length after one that ends, and the first length past them all.
 */
const lengths = (from) => {
    const found = [0];
    let ended = false;
    let length = 0;
    for (let at = from; at.length; length++, at = at.flatMap((node) => (node.param ? [node.param] : []))) {
        if (length && (ended || at.some((node) => node.end !== undefined || node.rest !== undefined)))
            found.push(length);
        ended = at.some((node) => node.end !== undefined);
    }
    if (length > 0)
        found.push(length);
    return found;
};
/**
 * The static segments a localized pattern spells before its entry's
 * canonical pattern, which it spells out after them: two such patterns with
 * the same ones fill the same pathname wherever both entries match.
 */
const prefixOf = ({ entry: { canonical }, pattern }) => {
    const lead = pattern.segments.length - canonical.segments.length;
    const head = pattern.segments.slice(0, Math.max(lead, 0));
    if (lead < 0 || pattern.rest !== canonical.rest || head.some((segment) => 'param' in segment))
        return undefined;
    const same = canonical.segments.every((segment, index) => {
        const other = pattern.segments[lead + index];
        return 'param' in segment ? 'param' in other && other.param === segment.param : !('param' in other) && other.decoded === segment.decoded;
    });
    return same ? JSON.stringify(head.map((segment) => ('param' in segment ? '' : segment.decoded))) : undefined;
};
/** Per node of `root`, per lowercased locale of a pattern of one locale alone at it or below it, the prefixes of such patterns, `''` for one without. */
const lone = (root) => {
    const below = new Map();
    // In reverse, each node comes after its children.
    for (const node of nodesOf(root).reverse()) {
        const locales = new Map();
        const add = (locale, prefix) => {
            locales.set(locale, (locales.get(locale) ?? new Set()).add(prefix));
        };
        for (const entry of [node.end, node.rest])
            entry?.targets.forEach((claim, locale) => claim.locales.length === 1 && add(locale, prefixOf(claim) ?? ''));
        for (const child of childrenOf(node))
            below.get(child).forEach((prefixes, locale) => prefixes.forEach((prefix) => add(locale, prefix)));
        below.set(node, locales);
    }
    return below;
};
/** The checks `outranked` runs per shared pattern, each of a pathname in one of its locales, before it gives up on it. */
const ATTEMPTS = 32;
/**
 * Per pattern of `claims` several locales share, per locale of it, the
 * pattern of that locale alone `localizePath` gives instead of it on a
 * canonical pathname of its entry's page. Candidates come from the canonical
 * trie walked along the entry: down the segments it ties on, and below the
 * first one it wins, to every entry that matches a pathname it matches, with
 * a target of one locale alone. Each is confirmed on such a pathname, filled
 * as the walk went, by the ranking `localizePath` runs.
 */
const outranked = (tries, claims, value) => {
    const found = new Map();
    const shared = claims.filter((claim) => claim.locales.length > 1);
    if (!shared.length)
        return found;
    const below = lone(tries.canonical);
    const anywhere = below.get(tries.canonical);
    for (const claim of shared) {
        const prefix = prefixOf(claim);
        // A pattern of the same prefix fills the pathname the shared one does, which reads as one of them.
        const differs = (prefixes) => prefixes !== undefined && (prefix === undefined || prefixes.size > 1 || !prefixes.has(prefix));
        const open = new Map(claim.locales.map((locale) => [locale.toLowerCase(), locale]).filter(([lowered]) => differs(anywhere.get(lowered))));
        if (!open.size)
            continue;
        const { entry } = claim;
        const { segments, rest } = entry.canonical;
        const lost = new Map();
        const witness = [];
        const step = (segment, next) => {
            witness.push(segment);
            next();
            witness.pop();
        };
        let spent = 0;
        // A search that confirmed nothing in so many checks gives up: a table can pair every shared pattern with every other.
        const done = () => lost.size === open.size || spent >= ATTEMPTS;
        const reaches = (node) => {
            if (done())
                return false;
            const locales = below.get(node);
            return [...open.keys()].some((lowered) => !lost.has(lowered) && differs(locales.get(lowered)));
        };
        // `vary`: the pathname ends in a rest, of any length.
        const check = (other, tail = [], vary = false) => {
            if (!other || other === entry)
                return;
            const wanted = [...open.keys()].filter((lowered) => {
                const target = other.targets.get(lowered);
                return !lost.has(lowered) && target?.locales.length === 1 && (prefix === undefined || prefixOf(target) !== prefix);
            });
            if (!wanted.length)
                return;
            const fixed = [...witness, ...tail];
            for (const length of vary ? extent(fixed, other, wanted) : [0]) {
                if (wanted.every((lowered) => lost.has(lowered)))
                    break;
                const parts = { segments: length ? [...fixed, ...Array.from({ length }, value)] : fixed, trailing: false };
                for (const lowered of wanted) {
                    if (lost.has(lowered))
                        continue;
                    if (done())
                        return;
                    const { pinned, shared } = ranked(tries, parts, lowered);
                    if (pinned && shared?.entry === entry)
                        lost.set(lowered, pinned.claim);
                    else
                        spent++;
                }
            }
        };
        // How many segments a rest past `fixed` holds before every longer one reads alike: the param chains below what the pathname and the patterns' fills of it reach.
        const extent = (fixed, other, wanted) => {
            const fills = [entry, other].flatMap((page) => {
                const at = walk(tries.canonical, fixed, (found) => found.value === page);
                return at ? (page === entry ? [claim] : wanted.map((lowered) => page.targets.get(lowered))).map((target) => fill(target.pattern, captured(page.canonical, at), false)) : [];
            });
            const frontier = [...reach(tries.canonical, fixed), ...fills.flatMap((path) => reach(tries.localized, split(path)?.segments ?? []))];
            return lengths(frontier);
        };
        const remainder = (at) => segments.slice(at).map((segment) => ('param' in segment ? value() : segment.encoded));
        const every = (node) => {
            if (!reaches(node))
                return;
            check(node.end);
            for (const [segment, child] of node.statics ?? []) {
                if (done())
                    return;
                step(encodeStatic(segment), () => every(child));
            }
            if (node.param)
                step(value(), () => every(node.param));
            check(node.rest, [], true);
        };
        // `won`: a segment above has ranked the entry first.
        const visit = (node, at, won) => {
            if (!reaches(node))
                return;
            if (at < segments.length) {
                const segment = segments[at];
                if ('param' in segment) {
                    if (won) {
                        for (const [decoded, child] of node.statics ?? []) {
                            if (done())
                                return;
                            step(encodeStatic(decoded), () => visit(child, at + 1, true));
                        }
                    }
                    if (node.param)
                        step(value(), () => visit(node.param, at + 1, won));
                }
                else {
                    const child = node.statics?.get(segment.decoded);
                    if (child)
                        step(segment.encoded, () => visit(child, at + 1, won));
                    if (node.param)
                        step(segment.encoded, () => visit(node.param, at + 1, true));
                }
                // A rest ranks below a segment, and below a pathname that ends.
                check(node.rest, remainder(at), rest !== undefined);
            }
            else if (rest === undefined) {
                check(node.end);
                check(node.rest);
            }
            else if (won)
                every(node);
        };
        visit(tries.canonical, 0, false);
        if (lost.size)
            found.set(claim, new Map([...lost].map(([lowered, pinned]) => [open.get(lowered), pinned])));
    }
    return found;
};
/** How a pathname read as `claim` stands for the lowercased `locale`: its own, shared, or another locale's. */
const standing = (claim, locale) => (localeOf(claim.locales) === undefined ? 'shared' : pins({ claim }, locale) ? 'pinned' : 'other');
/**
 * The lengths of a rest past the segments a pathname and its page lead with,
 * their params filled with `blank`, a value no static segment spells, at
 * which a walk `shadowed` runs can meet another match: where a node below
 * either lead ends or rests in its trie, and below the lead of each pattern a
 * rest entry the page reaches translates to, which `localizePath` fills for
 * it. Past them all, every length reads alike. A lead reaches what any such
 * value reaches, so the lengths below each lead of the localized trie are
 * found once.
 */
const changes = (tries, blank) => {
    const below = new Map();
    const localized = (segments) => {
        const key = segments.join('/');
        let found = below.get(key);
        if (!found)
            below.set(key, (found = lengths(reach(tries.localized, segments))));
        return found;
    };
    // What the targets of a rest entry reach, its params filled from `page`: once per entry whose params all hold `blank`.
    const filled = ({ canonical, targets }, page) => {
        const values = new Map(canonical.segments.flatMap((segment, index) => ('param' in segment ? [[segment.param, page[index] ?? blank]] : [])));
        return [...targets.values()].map(({ pattern }) => localized(pattern.segments.map((segment) => ('param' in segment ? values.get(segment.param) : segment.encoded))));
    };
    const blanks = new Map();
    return (page, pathname) => {
        const found = new Set();
        const add = (from, offset) => from.forEach((length) => found.add(Math.max(length + offset, 0)));
        // `spelled`: a param on the way holds a segment of the page other than `blank`.
        const rests = [];
        let level = [{ node: tries.canonical, spelled: false }];
        for (let depth = 0; level.length; depth++) {
            level.forEach(({ node, spelled }) => node.rest && rests.push({ entry: node.rest, depth, spelled }));
            if (depth === page.length)
                add(lengths(level.map(({ node }) => node)), 0);
            level = level.flatMap(({ node, spelled }) => {
                if (depth >= page.length)
                    return node.param ? [{ node: node.param, spelled }] : [];
                const child = node.statics?.get(decodeSegment(page[depth]));
                return [...(child ? [{ node: child, spelled }] : []), ...(node.param ? [{ node: node.param, spelled: spelled || page[depth] !== blank }] : [])];
            });
        }
        for (const { entry, depth, spelled } of rests) {
            let reached = spelled ? filled(entry, page) : blanks.get(entry);
            if (!reached)
                blanks.set(entry, (reached = filled(entry, [])));
            reached.forEach((from) => add(from, depth - page.length));
        }
        add(localized(pathname), 0);
        add(localized(page), 0);
        return [...found].sort((a, b) => a - b);
    };
};
/**
 * Per pattern of `claims` with a rest, each length of the rest at which the
 * pattern that reads the pathname it fills first costs locales that pathname
 * of the page: `localizePath` gives another, or this one, which the reader
 * serves as another page, and would give this one were the pathname read as
 * the pattern itself, so a locale an entry above translates the page to, or
 * a pattern of that locale alone below outranks a shared one in, is not the
 * reader's loss. The pathnames are filled with values no static segment
 * spells, so only the lengths `changes` finds can read otherwise. A pattern
 * without a rest reads every pathname it fills so.
 */
const shadowed = (tries, claims, value) => {
    const blank = value();
    const lengthsOf = changes(tries, blank);
    const found = new Map();
    // How many entries translate to each lowercased locale.
    const entries = new Map();
    claims.forEach(({ locales }) => locales.forEach((locale) => entries.set(locale.toLowerCase(), (entries.get(locale.toLowerCase()) ?? 0) + 1)));
    for (const claim of claims) {
        const { entry, pattern } = claim;
        if (pattern.rest === undefined)
            continue;
        const values = new Map(entry.canonical.segments.flatMap((segment) => ('param' in segment ? [[segment.param, value()]] : [])));
        const lead = ({ segments }) => segments.map((segment) => ('param' in segment ? blank : segment.encoded));
        const lost = new Set();
        for (const length of lengthsOf(lead(entry.canonical), lead(pattern))) {
            values.set(pattern.rest, Array.from({ length }, () => value()).join('/'));
            const page = fill(entry.canonical, values, false);
            const pathname = fill(pattern, values, false);
            const read = delocalized(tries.localized, pathname);
            // Read as the pattern itself, the pathname ranks as it would.
            if (!read || read.claim === claim)
                continue;
            const locales = claim.locales.filter((locale) => {
                const lowered = locale.toLowerCase();
                if (lost.has(locale))
                    return false;
                // Read as a pattern that stands for the locale as this one does, the
                // pathname ranks as this one would.
                if (read.path === page && standing(read.claim, lowered) === standing(claim, lowered))
                    return false;
                // Nothing else translates to the locale, so a lead of the page is its pathname.
                if (entries.get(lowered) === 1 && read.path === page && standing(read.claim, lowered) !== 'other')
                    return false;
                if (read.path === page && localize(tries, page, lowered) === pathname)
                    return false;
                // Lost to the reader only where read as this pattern it would win.
                const ideal = ranked(tries, split(page), lowered, { entry, claim, localized: pathname });
                return (ideal.pinned ?? ideal.shared)?.localized === pathname;
            });
            if (locales.length) {
                found.set(claim, [...(found.get(claim) ?? []), { reader: read.claim, length, locales }]);
                locales.forEach((locale) => lost.add(locale));
                if (lost.size === claim.locales.length)
                    break;
            }
        }
    }
    return found;
};
// `String()` of an object runs its own conversion, which can throw.
const quoted = (value) => `'${value !== null && (typeof value === 'object' || typeof value === 'function') ? Object.prototype.toString.call(value) : String(value)}'`;
const compile = (table, { sanitize, served, warn }) => {
    // Each lookup keys the trie with a lowercased locale, so `en-us` meets `en-US`.
    const localized = {};
    const canonical = {};
    const locales = new Set();
    const unserved = new Set();
    // What only the compile reads stays out of the tries, which live as long as the wiring.
    const claims = new Map();
    const available = new Set(served().map((locale) => locale.toLowerCase()));
    if (!table || typeof table !== 'object')
        warn('is not an object. No pathname is translated');
    for (const [key, spelled] of table && typeof table === 'object' ? Object.entries(table) : []) {
        const parsed = parse(key);
        if (!parsed || !spelled || typeof spelled !== 'object') {
            warn(`skips ${quoted(key)}: ${parsed ? 'its locales are not an object' : 'it is no pathname pattern'}`);
            continue;
        }
        const at = insert(canonical, parsed.pattern);
        if (at.node[at.slot]) {
            warn(`skips ${quoted(key)}: ${quoted(at.node[at.slot].key)} names the same pathnames`);
            continue;
        }
        const entry = { key, canonical: parsed.pattern, targets: new Map() };
        at.node[at.slot] = entry;
        // Each locale the entry translates to, by its lowercased name, as the table spells it.
        const named = new Map();
        for (const [locale, value] of Object.entries(spelled)) {
            const target = parse(value);
            const name = sanitize(locale);
            const lowered = name.toLowerCase();
            if (!target || target.names !== parsed.names) {
                warn(`skips ${quoted(key)} in ${quoted(locale)}: ${quoted(value)} ${target ? 'names other params' : 'is no pathname pattern'}`);
                continue;
            }
            if (named.has(lowered)) {
                warn(`skips ${quoted(key)} in ${quoted(locale)}: ${quoted(named.get(lowered))} names the same locale`);
                continue;
            }
            const claimed = claims.get(target.shape);
            if (claimed && claimed.claim.entry !== entry) {
                warn(`skips ${quoted(key)} in ${quoted(locale)}: ${quoted(claimed.claim.entry.key)} translates to ${quoted(value)} too`);
                continue;
            }
            if (claimed && claimed.order !== target.order) {
                warn(`skips ${quoted(key)} in ${quoted(locale)}: ${quoted(value)} names the params of ${quoted(claimed.spelled)} in another order`);
                continue;
            }
            const claim = claimed?.claim ?? { entry, pattern: target.pattern, locales: [] };
            if (!claimed) {
                const slot = insert(localized, target.pattern);
                slot.node[slot.slot] = claim;
                claims.set(target.shape, { claim, spelled: value, order: target.order });
            }
            claim.locales.push(name);
            entry.targets.set(lowered, claim);
            named.set(lowered, locale);
            locales.add(lowered);
            if (!available.has(lowered))
                unserved.add(name);
        }
    }
    // The browser reads the table the server has warned of already.
    if (!BROWSER) {
        const spelled = new Map([...claims.values()].map((claimed) => [claimed.claim, claimed.spelled]));
        const value = sampler(localized, canonical);
        // Each search stands alone: a table too deep for one is searched by the others.
        const search = (run) => {
            try {
                run();
            }
            catch { /* a table too deep to search is translated all the same */ }
        };
        search(() => {
            for (const [claim, pages] of overlaps(localized, canonical, value)) {
                const keys = [...pages].slice(0, 3).map((page) => quoted(page.key));
                const more = pages.size - keys.length;
                const named = pages.size === 1 ? `a pathname of ${keys[0]}` : `pathnames of ${more ? keys.join(', ') : keys.slice(0, -1).join(', ')} and ${more ? `${more} more` : keys[keys.length - 1]}`;
                warn(`serves ${quoted(claim.entry.key)} in ${claim.locales.map(quoted).join(', ')} at ${quoted(spelled.get(claim))}, which takes ${named}`);
            }
        });
        search(() => {
            for (const [claim, lost] of outranked({ localized, canonical, locales }, [...spelled.keys()], value)) {
                const outrun = claim.locales.filter((locale) => lost.has(locale));
                const above = outrun.map((locale) => `${quoted(spelled.get(lost.get(locale)))} in ${quoted(locale)}`);
                warn(`translates ${quoted(claim.entry.key)} in ${outrun.map(quoted).join(', ')} to ${quoted(spelled.get(claim))}, which localizePath ranks below ${above.length > 1 ? `${above.slice(0, -1).join(', ')} and ${above[above.length - 1]}` : above[0]}`);
            }
        });
        search(() => {
            for (const [claim, shadows] of shadowed({ localized, canonical, locales }, [...spelled.keys()], value)) {
                const rest = quoted(`[...${claim.pattern.rest}]`);
                for (const { reader, length, locales: lost } of shadows)
                    warn(`translates ${quoted(claim.entry.key)} in ${lost.map(quoted).join(', ')} to ${quoted(spelled.get(claim))}, which ${quoted(spelled.get(reader))} outranks where ${rest} ${length ? `holds ${length} segment${length > 1 ? 's' : ''}` : 'is empty'}`);
            }
        });
    }
    if (unserved.size)
        warn(`translates to ${[...unserved].map(quoted).join(', ')}, which the config serves no translations for`);
    return { localized, canonical, locales };
};
const translation = (table, { basePath, sanitize, normalize, served, warn }) => {
    let compiled;
    // Compiled once even when the table throws as it is read, so no call pays
    // for a compile again.
    const tries = () => {
        if (!compiled) {
            try {
                compiled = compile(table, { sanitize, served, warn });
            }
            catch {
                warn('cannot be read. No pathname is translated');
                compiled = { localized: {}, canonical: {}, locales: new Set() };
            }
        }
        return compiled;
    };
    // The last pathname read, with what `served` decides of it once asked, and
    // how the last host asked reads it: `delocalize` and the negotiation never
    // ask off the map.
    let last;
    const trimmed = typeof basePath === 'string' ? basePath.replace(/\/+$/, '') : '';
    const lookup = (pathname) => {
        if (last?.pathname === pathname)
            return last;
        last = { pathname, result: { pathname } };
        try {
            const local = !trimmed ? pathname : pathname === trimmed ? '/' : pathname.startsWith(`${trimmed}/`) ? pathname.slice(trimmed.length) : undefined;
            const found = local === undefined ? undefined : delocalized(tries().localized, local);
            if (local !== undefined && found) {
                const locale = localeOf(found.claim.locales);
                // The root under the base path is itself with or without its slash.
                last.result = { pathname: local === '/' && found.path === '/' ? pathname : `${trimmed}${found.path}`, ...(locale === undefined ? {} : { locale }) };
                last.read = { local, path: found.path, claim: found.claim };
            }
        }
        catch { /* passed through */ }
        return last;
    };
    // A locale the table names is taken in any case; only another spelling of
    // one goes through the sanitizer.
    const wantedOf = ({ locales }, locale) => {
        const named = locale.toLowerCase();
        return locales.has(named) ? named : normalize(locale).toLowerCase();
    };
    const hosted = (looked, locales) => {
        if (looked.host?.locales !== locales)
            looked.host = { locales };
        return looked.host;
    };
    // A host's reading of a pathname the table reads: the locales of the host
    // `localizePath` leads its path to. The table's own locale is kept where
    // the host serves it at that pathname, or where no locale of the host
    // does, so that `delocalize` sends the visitor to its host.
    const readOn = (looked, locales) => {
        const host = hosted(looked, locales);
        const { read, result } = looked;
        if (host.result)
            return;
        host.result = result;
        host.served = looked.pathname;
        if (!read)
            return;
        const compiled = tries();
        const own = result.locale?.toLowerCase();
        const wanted = locales.map((locale) => wantedOf(compiled, locale));
        const free = own !== undefined && !wanted.includes(own) ? new Set() : unrivaled(compiled, read.claim, read.path, new Set(wanted));
        if (own !== undefined && free.has(own)) {
            host.served = result.pathname;
            return;
        }
        const leading = locales.filter((_, i) => free.has(wanted[i]) || leads(compiled, read.path, read.local, wanted[i]));
        if (leading.length)
            host.served = result.pathname;
        if (!leading.length || leading.some((locale) => wantedOf(compiled, locale) === own))
            return;
        host.result = leading.length === 1 ? { pathname: result.pathname, locale: leading[0] } : { pathname: result.pathname };
    };
    return {
        canonical: (pathname, locales) => {
            if (typeof pathname !== 'string')
                return { pathname };
            const looked = lookup(pathname);
            if (!locales)
                return looked.result;
            try {
                readOn(looked, locales);
            }
            catch { /* read as off the map */ }
            return looked.host?.result ?? looked.result;
        },
        served: (pathname, locales) => {
            if (typeof pathname !== 'string')
                return pathname;
            const looked = lookup(pathname);
            if (locales) {
                const host = hosted(looked, locales);
                if (host.served === undefined) {
                    try {
                        const { read } = looked;
                        const compiled = tries();
                        const within = new Set(locales.map((locale) => wantedOf(compiled, locale)));
                        host.served = read && (unrivaled(compiled, read.claim, read.path, within).size > 0 || locales.some((locale) => leads(compiled, read.path, read.local, wantedOf(compiled, locale)))) ? looked.result.pathname : pathname;
                    }
                    catch {
                        host.served = pathname;
                    }
                }
                return host.served;
            }
            if (looked.served === undefined) {
                try {
                    const { read } = looked;
                    looked.served = read && (unrivaled(tries(), read.claim, read.path).size > 0 || leadsTo(tries(), read.path, read.local)) ? looked.result.pathname : pathname;
                }
                catch {
                    looked.served = pathname;
                }
            }
            return looked.served;
        },
        localizePath: (path, locale) => {
            if (typeof path !== 'string' || typeof locale !== 'string')
                return path;
            try {
                const compiled = tries();
                const end = path.search(/[?#]/);
                const localized = localize(compiled, encodePath(end < 0 ? path : path.slice(0, end)), wantedOf(compiled, locale));
                return localized === undefined ? path : `${localized}${end < 0 ? '' : path.slice(end)}`;
            }
            catch {
                return path;
            }
        },
    };
};
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
export const translatePathnames = (table) => Object.freeze({ [TRANSLATION]: (setup) => translation(table, setup) });
