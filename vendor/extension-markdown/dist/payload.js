// What CommonMark's inline syntax reads in a message: the characters that
// open or close a construct, end a destination, a title or a reference, or
// make a break.
const SYNTAX = ['\\', '`', '*', '_', '[', ']', '(', ')', '<', '>', '!', '&', ';', '"', "'", ' ', '\t', '\n', '\r'];
// Noncharacters, for an application's internal use: neither whitespace nor
// punctuation to the flanking rules, so a run of them reads as a word.
const FIRST = 0xfdd0;
const STANDS_IN = new Map(SYNTAX.map((char, index) => [char, String.fromCharCode(FIRST + index)]));
// A noncharacter the payload brings itself would be read back as syntax, and
// a control ends a destination or an autolink the translation wrote around
// the placeholder: both become U+FFFD, as the HTML parser makes a NUL.
// eslint-disable-next-line no-control-regex
const INERT = /[\\`*_[\]()<>!&;"' \t\n\r\0-\x08\v\f\x0e-\x1f\x7f\uFDD0-\uFDEF]/g;
const STOOD_IN = new RegExp(`[${String.fromCharCode(FIRST)}-${String.fromCharCode(FIRST + SYNTAX.length - 1)}]`, 'g');
const inert = (text) => text.replace(INERT, (char) => STANDS_IN.get(char) ?? '\uFFFD');
/** A string of the parsed message with the payload's characters back. */
export const restore = (text) => text.replace(STOOD_IN, (char) => SYNTAX[char.charCodeAt(0) - FIRST]);
const isPlain = (value) => {
    const prototype = Object.getPrototypeOf(value);
    return prototype === Object.prototype || prototype === null;
};
const walk = (value, seen) => {
    if (typeof value === 'string')
        return inert(value);
    if (typeof value === 'symbol')
        return inert(String(value));
    if (typeof value !== 'object' || value === null)
        return value;
    if (seen.has(value))
        return seen.get(value);
    if (Array.isArray(value)) {
        const copy = new Array(value.length);
        seen.set(value, copy);
        // By index, so a hole stays where it was.
        for (let index = 0; index < value.length; index += 1)
            if (index in value)
                copy[index] = walk(value[index], seen);
        return copy;
    }
    if (!isPlain(value))
        return value;
    const copy = {};
    seen.set(value, copy);
    // Defined, not assigned: a `__proto__` key stays a key.
    Object.entries(value).forEach(([key, item]) => {
        Object.defineProperty(copy, key, { value: walk(item, seen), enumerable: true, writable: true, configurable: true });
    });
    // A parser that serializes an object writes its keys too.
    Object.defineProperty(copy, 'toJSON', {
        value: () => Object.fromEntries(Object.entries(copy).map(([key, item]) => [inert(key), item])),
        configurable: true,
        writable: true,
    });
    return copy;
};
/**
 * The payload with every string in it made inert: each character the syntax
 * reads stands in as a noncharacter, which reads as no syntax anywhere — in
 * text, a code span, a destination or a title — and `restore` maps back once
 * the message is parsed. Plain objects and arrays are walked, and their keys
 * stay, since a placeholder names them (`{{user.first_name}}`); an object
 * serializes with its keys inert. Any other object is the app's own and
 * reaches the parser as it is, since the parser may format it (a `Date`).
 */
export const inertPayload = (value) => walk(value, new WeakMap());
