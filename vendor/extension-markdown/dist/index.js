import Rich from './Rich.svelte';
import { withT } from './shared/component.js';
/**
 * Renders the Markdown a translation carries as elements and components:
 * `<i18n.T key="intro" params={{ name }} />`. The extension adds `T` to the
 * instance it receives and returns that instance, so it goes before any
 * extension whose output is no instance, such as `extension-stores`.
 */
const markdown = (options) => {
    if (typeof options !== 'object' || options === null || typeof options.loadTranslations === 'function') {
        throw new TypeError('markdown is a factory of the options: put `markdown({ onReport })` in `extensions`.');
    }
    const applied = new WeakSet();
    const extension = (i18n) => {
        if (applied.has(i18n))
            return i18n;
        if (typeof i18n?.t !== 'function' || typeof i18n.l !== 'function') {
            throw new TypeError('markdown() needs the instance itself: put it before any extension whose output is no instance, such as `stores`.');
        }
        const augmented = withT('markdown', i18n, Rich, options);
        applied.add(i18n);
        return augmented;
    };
    return extension;
};
export default markdown;
