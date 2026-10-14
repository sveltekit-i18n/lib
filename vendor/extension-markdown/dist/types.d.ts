import type { Extension, I18n } from '@sveltekit-i18n/base';
import type { Component } from 'svelte';
import type { Entry, Props as PropsOf } from './shared/types.js';
export type { Entry } from './shared/types.js';
type AnyI18n = I18n<any, any, any, any>;
/** Entries by the node of a message they render. */
export type Components = {
    /** A paragraph, once a blank line splits the message; unmapped by default. */
    paragraph?: Entry;
    /** `*text*`; `'em'` by default. */
    emphasis?: Entry;
    /** `**text**`; `'strong'` by default. */
    strong?: Entry;
    /** `` `text` ``; `'code'` by default. */
    code?: Entry;
    /** `[text](href "title")` and `<https://…>`; `'a'` by default. */
    link?: Entry;
    /** `![alt](src "title")`; unmapped by default, so its description renders. */
    image?: Entry;
    /** Two spaces or a backslash before a line ending; `'br'` by default. */
    break?: Entry;
};
export type Report = {
    code: 'node-unmapped' | 'url-blocked' | 'nesting-invalid';
    key: string;
    locale: string;
    /** The node as the map names it: the one unmapped or blocked, or the link held in a link. */
    node?: keyof Components;
    /** The attribute dropped, for `url-blocked`. */
    attribute?: 'href' | 'src';
    message: string;
};
export type Options = {
    /** Where the reports go; `null` discards them. */
    onReport: ((report: Report) => void) | null;
    /** The app's layer of the component map, over the defaults. */
    components?: Components;
};
/** `<T>`'s props: see `PropsOf` in `shared/types.ts`. */
export type Props<I> = PropsOf<I, Components>;
export type WithT<I> = I & {
    T: Component<Props<I>>;
};
/**
 * An input that is no instance — a pipe that put an extension whose output is
 * no instance first — gets no `T`, so the mistake surfaces where `T` is used.
 */
export interface WithMarkdown extends Extension.Operator {
    readonly output: this['input'] extends AnyI18n ? WithT<this['input']> : this['input'];
}
