/** Whether `layer` holds an entry for `name`: an own one, other than `undefined`. */
export const names = (layer, name) => layer !== undefined && Object.hasOwn(layer, name) && layer[name] !== undefined;
/**
 * What `name` renders as: the entry of the highest layer that names it, the
 * layers listed lowest first. The winning entry decides both the element and
 * its props; `null` there leaves the name unmapped, while `undefined` names
 * nothing. Only own entries count, so a name `constructor` is as unmapped as
 * any other.
 */
export const resolve = (name, layers) => {
    const layer = [...layers].reverse().find((components) => names(components, name));
    const entry = layer?.[name];
    if (entry === undefined || entry === null)
        return undefined;
    if (typeof entry === 'object' && 'component' in entry)
        return { render: entry.component, props: entry.props ?? {} };
    return { render: entry, props: {} };
};
