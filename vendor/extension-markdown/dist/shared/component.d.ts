import type { Component } from 'svelte';
/**
 * `i18n` with `T`: the `render` component, handed the instance and the options
 * on top of the props it is given. A component is a function of the render's
 * internals and its props; `T` hands the internals through untouched. A proxy
 * rather than a spread: a spread would read every prop once and lose its
 * reactivity. A `T` this package made is replaced; one another extension
 * added throws, as the two would render one message two ways.
 */
export declare const withT: <I extends object, P extends Record<string, any>>(name: string, i18n: I, render: Component<any>, options: unknown) => I & {
    T: Component<P, {}, string>;
};
