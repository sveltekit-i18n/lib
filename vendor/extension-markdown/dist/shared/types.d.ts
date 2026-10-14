import type { Config, I18n, Schema } from '@sveltekit-i18n/base';
import type { Component } from 'svelte';
/**
 * What a name of the message renders as: a native element by name, a
 * component, either of them with props of the app's own, or `null`, which
 * unmaps a name a lower layer maps.
 */
export type Entry = string | Component<any> | {
    component: string | Component<any>;
    props?: Record<string, unknown>;
} | null;
/** A layer of the component map, by the names a message uses. */
export type Layer = {
    [name: string]: Entry | undefined;
};
/**
 * A part as it renders: text, or a native element or a component with its
 * props, and the name of the message it renders.
 */
export type Rendered = string | {
    render: string | Component<any>;
    tag: string;
    props: Record<string, unknown>;
    children: Rendered[];
};
type IsAny<T> = 0 extends 1 & T ? true : false;
type Args<T extends unknown[]> = [] extends T ? {
    args?: T | undefined;
} : {
    args: T;
};
/** A key's rest params as props: the payload as `params`, the rest as `args`. */
type Split<R extends unknown[]> = IsAny<R> extends true ? {
    params?: any;
    args?: any[] | undefined;
} : R extends [unknown, ...unknown[]] ? R extends [infer V, ...infer T] ? {
    params: V;
} & Args<T> : never : R extends [(infer V)?, ...infer T] ? {
    params?: V | undefined;
} & Args<T> : {
    params?: undefined;
};
type Common<L extends string, C> = {
    /** Renders in this locale rather than the active one, as `l()` does. */
    locale?: Config.LocaleInput<L> | undefined;
    /** The usage's layer of the component map, over the config's. */
    components?: C | undefined;
};
/** The keys a message renders for with no params at all. */
type Bare<S, P extends unknown[]> = {
    [K in Schema.Key<S>]: [] extends Schema.Params<S, K, P> ? K : never;
}[Schema.Key<S>];
type Same<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2) ? true : false;
/** The keys that take exactly the params of a key without a payload. */
type Plain<S, P extends unknown[]> = {
    [K in Schema.Key<S>]: Same<Schema.Params<S, K, P>, Schema.Params<S, never, P>> extends true ? K : never;
}[Schema.Key<S>];
type Flat<T> = {
    [K in keyof T]: T[K];
};
/** A member for the keys `K`, or none without keys: a `key` of `never` stops the lookup. */
type Rest<K, T> = [K] extends [never] ? never : {
    key: K;
} & T;
/**
 * `<T>`'s props, with `C` as the usage's layer of the map: a union over the
 * schema's keys, so a key narrows its own payload, and one without a schema
 * takes any key and the parser's params. One more member takes every key that
 * needs no params, so a key held in a variable typed by a union of those keys
 * renders too: TypeScript matches an object against a union of more than 25
 * members by discriminant only. It also takes the keys without a payload,
 * which a required trailing param of the parser keeps out of the first set.
 *
 * TypeScript finds a key's member by a lookup instead of trying every member
 * only when each key names one member and the members are object types, not
 * intersections. So a key without a payload has no member of its own, and
 * every other member is flattened. The member of the keys without params
 * stays an intersection: as an object type, its `params` could become what
 * the lookup goes by.
 */
export type Props<I, C> = I extends I18n<infer P, any, infer S, infer L> ? [S] extends [never] ? {
    key: string;
} & Common<L, C> & Split<P> : {
    [K in Exclude<Schema.Key<S>, Plain<S, P>>]: Flat<{
        key: K;
    } & Common<L, C> & Split<Schema.Params<S, K, P>>>;
}[Exclude<Schema.Key<S>, Plain<S, P>>] | Rest<Bare<S, P> | Plain<S, P>, Common<L, C> & Split<Schema.Params<S, never, P>>> : never;
export {};
