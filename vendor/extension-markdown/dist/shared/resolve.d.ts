import type { Component } from 'svelte';
import type { Layer } from './types.js';
export type Resolved = {
    render: string | Component<any>;
    props: Record<string, unknown>;
};
/** Whether `layer` holds an entry for `name`: an own one, other than `undefined`. */
export declare const names: (layer: Layer | undefined, name: string) => boolean;
/**
 * What `name` renders as: the entry of the highest layer that names it, the
 * layers listed lowest first. The winning entry decides both the element and
 * its props; `null` there leaves the name unmapped, while `undefined` names
 * nothing. Only own entries count, so a name `constructor` is as unmapped as
 * any other.
 */
export declare const resolve: (name: string, layers: (Layer | undefined)[]) => Resolved | undefined;
