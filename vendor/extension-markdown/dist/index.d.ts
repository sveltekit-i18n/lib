import type { Extension, I18n } from '@sveltekit-i18n/base';
import type { Options, WithMarkdown, WithT } from './types.js';
export type { Components, Entry, Options, Props, Report, WithMarkdown, WithT } from './types.js';
type AnyI18n = I18n<any, any, any, any>;
/**
 * Renders the Markdown a translation carries as elements and components:
 * `<i18n.T key="intro" params={{ name }} />`. The extension adds `T` to the
 * instance it receives and returns that instance, so it goes before any
 * extension whose output is no instance, such as `extension-stores`.
 */
declare const markdown: (options: Options) => (<I extends AnyI18n>(i18n: I) => WithT<I>) & Extension.Generic<WithMarkdown>;
export default markdown;
