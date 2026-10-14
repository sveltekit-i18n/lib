// What MF2 isolates a placeholder with and `Intl` marks a number or a date with.
const BIDI_CONTROLS = /\p{Bidi_Control}/gu;
/**
 * A value without its bidi controls. They order text, so only a value read as
 * text keeps them: in a URL, a number or a keyword they make another value — a
 * path the browser percent-encodes them into, a scheme a check cannot see, a
 * `target` that is no `_blank`.
 */
export const withoutBidi = (value) => value.replace(BIDI_CONTROLS, '');
/**
 * Whether a URL a translation carries may be rendered: one with no scheme (a
 * relative URL, a fragment) or one of `schemes`. The value arrives with its
 * references decoded and its bidi controls dropped; the URL parser also drops
 * tabs and newlines anywhere and C0 controls and spaces at either end, so
 * `java\tscript:` is checked as the `javascript:` a browser would follow.
 */
export const isAllowedUrl = (value, schemes) => {
    // eslint-disable-next-line no-control-regex
    const url = value.replace(/[\t\n\r]/g, '').replace(/^[\u0000- ]+/, '');
    const scheme = /^([a-z][a-z0-9+.-]*):/i.exec(url)?.[1];
    return scheme === undefined || schemes.includes(scheme.toLowerCase());
};
/** Elements that take no children; rendered without any. */
export const VOID_ELEMENTS = ['area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'];
