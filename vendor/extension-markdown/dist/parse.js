import { characterEntities } from 'character-entities';
import { restore } from './payload.js';
import { isAllowedUrl, withoutBidi } from './shared/markup.js';
// An image loads its source as it renders, so it takes no scheme that hands
// the URL to another application.
const LINK_SCHEMES = ['http', 'https', 'mailto', 'tel'];
const IMAGE_SCHEMES = ['http', 'https'];
const gate = (node, url) => isAllowedUrl(url, node === 'link' ? LINK_SCHEMES : IMAGE_SCHEMES);
const create = (type, value = '') => ({ type, value, attributes: {} });
const unlink = (node) => {
    if (node.previous)
        node.previous.next = node.next;
    else if (node.parent)
        node.parent.first = node.next;
    if (node.next)
        node.next.previous = node.previous;
    else if (node.parent)
        node.parent.last = node.previous;
    node.parent = undefined;
    node.previous = undefined;
    node.next = undefined;
};
const append = (parent, child) => {
    child.parent = parent;
    child.previous = parent.last;
    if (parent.last)
        parent.last.next = child;
    else
        parent.first = child;
    parent.last = child;
};
const insertAfter = (node, sibling) => {
    sibling.parent = node.parent;
    sibling.previous = node;
    sibling.next = node.next;
    if (node.next)
        node.next.previous = sibling;
    else if (node.parent)
        node.parent.last = sibling;
    node.next = sibling;
};
// The siblings after `from` up to `to`, moved into `into`.
const adopt = (into, from, to) => {
    for (let node = from.next; node && node !== to;) {
        const { next } = node;
        unlink(node);
        append(into, node);
        node = next;
    }
};
const ASCII_PUNCTUATION = /[!-/:-@[-`{-~]/;
const WHITESPACE = /^[\t\n\f\r\p{Zs}]$/u;
const PUNCTUATION = /^[\p{P}\p{S}]$/u;
// Everything up to the next character the syntax reads.
const TEXT = /[^\n\\`*_[\]!<&]+/y;
const SPACES = /[ \t]*/y;
const ENTITY = /&(?:#[xX]([0-9a-fA-F]{1,6})|#([0-9]{1,7})|([A-Za-z][A-Za-z0-9]{1,31}));/y;
// What lies between a `<` and the next `>`, the payload's characters still
// standing in: a payload's `>` ends nothing.
const ANGLE = /<([^<>]*)>/y;
const URI = /^[A-Za-z][A-Za-z0-9+.-]{1,31}:[^<>\0- ]*$/;
const EMAIL = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;
const isBlank = (code) => code === 0x20 || code === 0x09 || code === 0x0a;
// What the blank lines of a message split it into: a run of spaces, tabs and
// line endings that holds two line endings ends a paragraph. A line drops the
// spaces and tabs it starts with, but for the message's first. Loops rather
// than patterns, which backtrack over a long run of spaces.
const paragraphsOf = (subject) => {
    const paragraphs = [];
    let from = 0;
    let index = 0;
    while (index < subject.length) {
        if (isBlank(subject.charCodeAt(index))) {
            const run = index;
            let breaks = 0;
            for (; index < subject.length && isBlank(subject.charCodeAt(index)); index += 1)
                if (subject[index] === '\n')
                    breaks += 1;
            if (breaks >= 2) {
                paragraphs.push(subject.slice(from, run));
                from = index;
            }
        }
        else {
            index += 1;
        }
    }
    paragraphs.push(subject.slice(from));
    return paragraphs.filter((paragraph, at) => paragraph !== '' || at === 0).map((paragraph) => paragraph.replace(/\n[ \t]+/g, '\n'));
};
// The message without the spaces, tabs and line endings it ends with, once
// they hold a line ending.
const withoutTrailingLines = (subject) => {
    let end = subject.length;
    while (end > 0 && isBlank(subject.charCodeAt(end - 1)))
        end -= 1;
    return subject.includes('\n', end) ? subject.slice(0, end) : subject;
};
// No surrogate, noncharacter or control but whitespace: each becomes U+FFFD,
// where the HTML parser keeps the last two and reads C1 codes as windows-1252.
// A noncharacter would read as a payload's character once the message is
// parsed.
const isValidCode = (code) => !((code >= 0xd800 && code <= 0xdfff)
    || (code >= 0xfdd0 && code <= 0xfdef)
    || (code & 0xffff) === 0xffff || (code & 0xffff) === 0xfffe
    || code <= 0x08 || code === 0x0b || (code >= 0x0e && code <= 0x1f)
    || (code >= 0x7f && code <= 0x9f)
    || code > 0x10ffff);
const decode = (reference) => {
    ENTITY.lastIndex = 0;
    const match = ENTITY.exec(reference);
    if (!match)
        return undefined;
    const [, hex, decimal, name] = match;
    if (name !== undefined)
        return Object.hasOwn(characterEntities, name) ? characterEntities[name] : undefined;
    const code = hex !== undefined ? parseInt(hex, 16) : parseInt(decimal, 10);
    return String.fromCodePoint(isValidCode(code) ? code : 0xfffd);
};
// Backslash escapes and references, as a destination or a title reads them.
const unescape = (text) => text.replace(/\\([!-/:-@[-`{-~])|&(?:#[xX][0-9a-fA-F]{1,6}|#[0-9]{1,7}|[A-Za-z][A-Za-z0-9]{1,31});/g, (match, escaped) => escaped ?? decode(match) ?? match);
// The levels of a link's paren nesting a destination takes, as markdown-it and
// cmark: past it, a scan per `]` would make a message quadratic.
const MAX_PARENS = 32;
// The element levels of a message. A render recurses per level, and an app's
// component adds levels of its own, which no bound here can count.
const MAX_DEPTH = 32;
// One paragraph, as CommonMark's inline syntax reads it, into a tree of
// `Inline`s under a root.
const inlines = (subject) => {
    const root = create('root');
    let pos = 0;
    let delimiters;
    let brackets;
    let links = 0;
    const text = (value, literal) => {
        const node = create('text', value);
        if (literal)
            node.literal = literal;
        append(root, node);
    };
    // The starts of each length of backtick run, and how far each was searched.
    const ticks = new Map();
    const searched = new Map();
    for (const { 0: run, index } of subject.matchAll(/`+/g)) {
        const starts = ticks.get(run.length);
        if (starts)
            starts.push(index);
        else
            ticks.set(run.length, [index]);
    }
    const closingTicks = (length, from) => {
        const starts = ticks.get(length) ?? [];
        let index = searched.get(length) ?? 0;
        while (index < starts.length && starts[index] < from)
            index += 1;
        searched.set(length, index);
        return starts[index];
    };
    const skipSpaces = () => {
        SPACES.lastIndex = pos;
        SPACES.exec(subject);
        pos = SPACES.lastIndex;
    };
    // Spaces, tabs and line endings, as markdown-it skips them inside a link.
    const skipWhitespace = () => {
        while (pos < subject.length && ' \t\n'.includes(subject[pos]))
            pos += 1;
    };
    const removeDelimiter = (delimiter) => {
        if (delimiter.previous)
            delimiter.previous.next = delimiter.next;
        if (delimiter.next)
            delimiter.next.previous = delimiter.previous;
        else
            delimiters = delimiter.previous;
    };
    const codePointBefore = (index) => {
        if (index === 0)
            return '\n';
        const low = subject.charCodeAt(index - 1);
        return low >= 0xdc00 && low <= 0xdfff && index > 1 ? subject.slice(index - 2, index) : subject[index - 1];
    };
    const codePointAt = (index) => (index >= subject.length ? '\n' : String.fromCodePoint(subject.codePointAt(index) ?? 0));
    const scanDelimiters = (char) => {
        const start = pos;
        while (subject[pos] === char)
            pos += 1;
        const before = codePointBefore(start);
        const after = codePointAt(pos);
        const beforeSpace = WHITESPACE.test(before);
        const afterSpace = WHITESPACE.test(after);
        const beforePunctuation = PUNCTUATION.test(before);
        const afterPunctuation = PUNCTUATION.test(after);
        const left = !afterSpace && (!afterPunctuation || beforeSpace || beforePunctuation);
        const right = !beforeSpace && (!beforePunctuation || afterSpace || afterPunctuation);
        const canOpen = char === '_' ? left && (!right || beforePunctuation) : left;
        const canClose = char === '_' ? right && (!left || afterPunctuation) : right;
        const node = create('text', subject.slice(start, pos));
        append(root, node);
        if (!canOpen && !canClose)
            return;
        const delimiter = { position: start, char, count: pos - start, length: pos - start, node, canOpen, canClose, previous: delimiters };
        if (delimiters)
            delimiters.next = delimiter;
        delimiters = delimiter;
    };
    // The spec's process emphasis, with its bound on where an opener is looked
    // for by the closer's character, length mod 3 and whether it opens. Every
    // delimiter it walks over is removed by its end.
    const processEmphasis = (bottom) => {
        const lowest = bottom?.position ?? -1;
        const bottoms = new Map();
        let closer = delimiters && delimiters.position > lowest ? delimiters : undefined;
        while (closer?.previous && closer.previous.position > lowest)
            closer = closer.previous;
        while (closer) {
            if (!closer.canClose) {
                closer = closer.next;
                continue;
            }
            const bound = `${closer.char}${closer.canOpen ? 1 : 0}${closer.length % 3}`;
            const floor = bottoms.get(bound) ?? lowest;
            let opener = closer.previous;
            while (opener && opener.position > floor) {
                const odd = (closer.canOpen || opener.canClose) && closer.length % 3 !== 0 && (opener.length + closer.length) % 3 === 0;
                if (opener.char === closer.char && opener.canOpen && !odd)
                    break;
                opener = opener.previous;
            }
            if (!opener || opener.position <= floor) {
                bottoms.set(bound, closer.previous?.position ?? lowest);
                const { next } = closer;
                if (!closer.canOpen)
                    removeDelimiter(closer);
                closer = next;
                continue;
            }
            const used = closer.count >= 2 && opener.count >= 2 ? 2 : 1;
            const emphasis = create(used === 1 ? 'emphasis' : 'strong');
            opener.count -= used;
            closer.count -= used;
            opener.node.value = opener.node.value.slice(used);
            closer.node.value = closer.node.value.slice(used);
            adopt(emphasis, opener.node, closer.node);
            insertAfter(opener.node, emphasis);
            // Delimiters between the two are text now.
            opener.next = closer;
            closer.previous = opener;
            if (opener.count === 0) {
                unlink(opener.node);
                removeDelimiter(opener);
            }
            if (closer.count === 0) {
                const { next } = closer;
                unlink(closer.node);
                removeDelimiter(closer);
                closer = next;
            }
        }
        while (delimiters && delimiters.position > lowest)
            removeDelimiter(delimiters);
    };
    const destination = () => {
        if (subject[pos] === '<') {
            for (let end = pos + 1; end < subject.length; end += 1) {
                const char = subject[end];
                if (char === '\n' || char === '<')
                    return undefined;
                if (char === '>') {
                    const url = subject.slice(pos + 1, end);
                    pos = end + 1;
                    return unescape(url);
                }
                if (char === '\\' && ASCII_PUNCTUATION.test(subject[end + 1] ?? ''))
                    end += 1;
            }
            return undefined;
        }
        const start = pos;
        let level = 0;
        let end = pos;
        for (; end < subject.length; end += 1) {
            const code = subject.charCodeAt(end);
            if (code <= 0x20 || code === 0x7f)
                break;
            if (code === 0x5c && ASCII_PUNCTUATION.test(subject[end + 1] ?? '')) {
                end += 1;
            }
            else if (code === 0x28) {
                level += 1;
                if (level > MAX_PARENS)
                    return undefined;
            }
            else if (code === 0x29) {
                if (level === 0)
                    break;
                level -= 1;
            }
        }
        if (end === start || level !== 0)
            return undefined;
        pos = end;
        return unescape(subject.slice(start, end));
    };
    const title = () => {
        const open = subject[pos];
        if (open !== '"' && open !== "'" && open !== '(')
            return undefined;
        const close = open === '(' ? ')' : open;
        for (let end = pos + 1; end < subject.length; end += 1) {
            const char = subject[end];
            if (char === close) {
                const value = subject.slice(pos + 1, end);
                pos = end + 1;
                return unescape(value);
            }
            if (char === '(' && open === '(')
                return undefined;
            if (char === '\\')
                end += 1;
        }
        return undefined;
    };
    // `(destination "title")` after a `]`, as markdown-it reads it.
    const inlineLink = () => {
        const start = pos;
        let href = '';
        let label;
        pos += 1;
        skipWhitespace();
        if (pos >= subject.length)
            return void (pos = start);
        const url = destination();
        if (url !== undefined) {
            href = url;
            const before = pos;
            skipWhitespace();
            if (pos < subject.length && before !== pos) {
                const at = pos;
                const value = title();
                if (value === undefined)
                    pos = at;
                else {
                    label = value;
                    skipWhitespace();
                }
            }
        }
        if (subject[pos] !== ')')
            return void (pos = start);
        pos += 1;
        return { href, title: label };
    };
    const closeBracket = () => {
        pos += 1;
        const opener = brackets;
        if (!opener)
            return text(']');
        brackets = opener.previous;
        if (!opener.image && opener.links !== links)
            return text(']');
        const link = subject[pos] === '(' ? inlineLink() : undefined;
        if (!link)
            return text(']');
        const node = create(opener.image ? 'image' : 'link');
        node.attributes = opener.image ? { src: link.href } : { href: link.href };
        if (link.title !== undefined)
            node.attributes.title = link.title;
        adopt(node, opener.node);
        append(root, node);
        processEmphasis(opener.delimiter);
        unlink(opener.node);
        if (!opener.image)
            links += 1;
    };
    const backslash = () => {
        const next = subject[pos + 1];
        if (next === '\n') {
            pos += 2;
            append(root, create('break'));
            return skipSpaces();
        }
        if (next !== undefined && ASCII_PUNCTUATION.test(next)) {
            pos += 2;
            return text(next, true);
        }
        pos += 1;
        text('\\');
    };
    const backticks = () => {
        const start = pos;
        while (subject[pos] === '`')
            pos += 1;
        const length = pos - start;
        const end = closingTicks(length, pos);
        if (end === undefined)
            return text(subject.slice(start, pos));
        const content = subject.slice(pos, end).replace(/\n/g, ' ');
        const code = create('code', /[^ ]/.test(content) && content.startsWith(' ') && content.endsWith(' ') ? content.slice(1, -1) : content);
        pos = end + length;
        append(root, code);
    };
    // A line ending: hard after two spaces, else soft. The spaces around it go.
    const newline = () => {
        const { last } = root;
        let spaces = 0;
        if (last?.type === 'text' && !last.literal)
            while (last.value.charCodeAt(last.value.length - 1 - spaces) === 0x20)
                spaces += 1;
        if (last && spaces > 0)
            last.value = last.value.slice(0, -spaces);
        pos += 1;
        append(root, spaces >= 2 ? create('break') : create('text', '\n'));
        skipSpaces();
    };
    const angle = () => {
        ANGLE.lastIndex = pos;
        const match = ANGLE.exec(subject);
        // Read as the browser gets it: the payload's characters back, and without
        // the isolates MF2 puts around a placeholder.
        const target = match ? withoutBidi(restore(match[1])) : '';
        const uri = URI.test(target);
        if (match && (uri || EMAIL.test(target))) {
            const node = create('link');
            node.attributes = { href: uri ? match[1] : `mailto:${match[1]}` };
            append(node, create('text', match[1]));
            append(root, node);
            pos = ANGLE.lastIndex;
            return;
        }
        pos += 1;
        text('<');
    };
    const entity = () => {
        ENTITY.lastIndex = pos;
        const match = ENTITY.exec(subject);
        const end = ENTITY.lastIndex;
        const decoded = match ? decode(match[0]) : undefined;
        if (decoded !== undefined) {
            pos = end;
            return text(decoded, true);
        }
        pos += 1;
        text('&');
    };
    const bracket = (image) => {
        const node = create('text', image ? '![' : '[');
        pos += node.value.length;
        append(root, node);
        brackets = { node, image, links, delimiter: delimiters, previous: brackets };
    };
    while (pos < subject.length) {
        const char = subject[pos];
        if (char === '\n')
            newline();
        else if (char === '\\')
            backslash();
        else if (char === '`')
            backticks();
        else if (char === '*' || char === '_')
            scanDelimiters(char);
        else if (char === '[')
            bracket(false);
        else if (char === '!' && subject[pos + 1] === '[')
            bracket(true);
        else if (char === ']')
            closeBracket();
        else if (char === '<')
            angle();
        else if (char === '&')
            entity();
        else if (char === '!') {
            pos += 1;
            text('!');
        }
        else {
            TEXT.lastIndex = pos;
            TEXT.exec(subject);
            text(subject.slice(pos, TEXT.lastIndex));
            pos = TEXT.lastIndex;
        }
    }
    processEmphasis(undefined);
    return root;
};
// The levels of elements in a tree, by a stack of its own: a tree too deep to
// render is too deep to recurse over.
const depthOf = (root) => {
    const stack = [[root, 0]];
    let max = 0;
    for (let entry = stack.pop(); entry; entry = stack.pop()) {
        const [node, depth] = entry;
        if (node.type !== 'text')
            max = Math.max(max, depth);
        for (let child = node.first; child; child = child.next)
            stack.push([child, depth + 1]);
    }
    return max;
};
// The text of a tree without its elements, by a stack of its own.
const textOf = (root) => {
    const stack = [root];
    let all = '';
    for (let node = stack.pop(); node; node = stack.pop()) {
        all += node.type === 'break' ? '\n' : node.value;
        for (let child = node.last; child; child = child.previous)
            stack.push(child);
    }
    return all;
};
const convert = (paragraphs, allowed) => {
    const dropped = [];
    const attributesOf = (node) => Object.entries(node.attributes).reduce((all, [name, written]) => {
        const restored = restore(written);
        if (name !== 'href' && name !== 'src')
            return { ...all, [name]: restored };
        // Without the bidi controls before the check: a scheme behind one is
        // still the scheme a browser follows once it drops them.
        const url = withoutBidi(restored);
        const type = name === 'href' ? 'link' : 'image';
        if (allowed(type, url))
            return { ...all, [name]: url };
        dropped.push({ code: 'url-blocked', node: type, attribute: name });
        return all;
    }, {});
    const partsOf = (parent, inLink) => {
        const parts = [];
        const add = (part) => {
            const last = parts[parts.length - 1];
            if (typeof part === 'string' && typeof last === 'string')
                parts[parts.length - 1] = last + part;
            else if (part !== '')
                parts.push(part);
        };
        for (let node = parent.first; node; node = node.next) {
            if (node.type === 'text' || node.type === 'root')
                add(restore(node.value));
            else if (node.type === 'code')
                add({ type: 'code', attributes: {}, children: [restore(node.value)] });
            else if (node.type === 'break')
                add({ type: 'break', attributes: {}, children: ['\n'] });
            else if (node.type === 'image') {
                // A description is text: no element renders an image's children.
                const alt = restore(textOf(node));
                add({ type: 'image', attributes: { ...attributesOf(node), alt }, children: [alt] });
            }
            else if (node.type === 'link' && inLink) {
                // An autolink in a link's text: no browser builds a link in a link,
                // so hydration would not find the tree the server rendered.
                dropped.push({ code: 'nesting-invalid', node: 'link' });
                partsOf(node, true).forEach(add);
            }
            else
                add({ type: node.type, attributes: node.type === 'link' ? attributesOf(node) : {}, children: partsOf(node, inLink || node.type === 'link') });
        }
        return parts;
    };
    if (paragraphs.length === 1)
        return { parts: partsOf(paragraphs[0], false), dropped };
    const parts = paragraphs.flatMap((paragraph, index) => [
        ...(index > 0 ? ['\n\n'] : []),
        { type: 'paragraph', attributes: {}, children: partsOf(paragraph, false) },
    ]);
    return { parts, dropped };
};
/**
 * Parses a message as CommonMark's inline syntax into its nodes. A blank line
 * splits it into paragraphs, each parsed on its own, so no construct spans
 * one. The message is not trimmed, but for the spaces, tabs and line endings
 * it ends with once they hold a line ending, and a line drops the spaces and
 * tabs it starts with, but for the first.
 * Blocks, raw HTML and reference links are not read and stay text. Linear in
 * the length of the message: each construct keeps to cmark's bounds. Every
 * string of the result has the payload's characters back (see `payload.ts`),
 * and a URL is kept only when `allowed` takes it. Never throws: a translation
 * is data.
 */
export const parse = (message, allowed = gate) => {
    try {
        const paragraphs = paragraphsOf(withoutTrailingLines(message.replace(/\r\n?/g, '\n').replace(/\0/g, '�'))).map(inlines);
        // A paragraph is a level of its own once there are several.
        const levels = paragraphs.reduce((deepest, paragraph) => Math.max(deepest, depthOf(paragraph)), 0) + (paragraphs.length > 1 ? 1 : 0);
        if (levels > MAX_DEPTH)
            return { parts: [restore(paragraphs.map(textOf).join('\n\n'))], dropped: [{ code: 'nesting-invalid' }] };
        return convert(paragraphs, allowed);
    }
    catch {
        return { parts: [restore(message)], dropped: [] };
    }
};
