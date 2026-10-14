// The `T`s this package made, whichever options made them.
const made = new WeakSet();
/**
 * `i18n` with `T`: the `render` component, handed the instance and the options
 * on top of the props it is given. A component is a function of the render's
 * internals and its props; `T` hands the internals through untouched. A proxy
 * rather than a spread: a spread would read every prop once and lose its
 * reactivity. A `T` this package made is replaced; one another extension
 * added throws, as the two would render one message two ways.
 */
export const withT = (name, i18n, render, options) => {
    const current = i18n.T;
    if (current !== undefined && !(typeof current === 'function' && made.has(current))) {
        throw new TypeError(`${name}() adds \`T\` to an instance that has one from another extension: extension-html and extension-markdown each render a whole message, so use one.`);
    }
    const T = ((internals, props) => render(internals, new Proxy(props, {
        get: (target, key) => (key === 'i18n' ? i18n : key === 'options' ? options : Reflect.get(target, key)),
        has: (target, key) => key === 'i18n' || key === 'options' || Reflect.has(target, key),
    })));
    made.add(T);
    return Object.assign(i18n, { T });
};
