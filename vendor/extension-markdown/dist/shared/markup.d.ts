/**
 * A value without its bidi controls. They order text, so only a value read as
 * text keeps them: in a URL, a number or a keyword they make another value — a
 * path the browser percent-encodes them into, a scheme a check cannot see, a
 * `target` that is no `_blank`.
 */
export declare const withoutBidi: (value: string) => string;
/**
 * Whether a URL a translation carries may be rendered: one with no scheme (a
 * relative URL, a fragment) or one of `schemes`. The value arrives with its
 * references decoded and its bidi controls dropped; the URL parser also drops
 * tabs and newlines anywhere and C0 controls and spaces at either end, so
 * `java\tscript:` is checked as the `javascript:` a browser would follow.
 */
export declare const isAllowedUrl: (value: string, schemes: string[]) => boolean;
/** Elements that take no children; rendered without any. */
export declare const VOID_ELEMENTS: string[];
