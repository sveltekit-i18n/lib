import type { I18n } from '@sveltekit-i18n/base';
import type { Components, Options } from './types.js';
type Props = {
    i18n: I18n<any, any, any, any>;
    options: Options;
    key: string;
    params?: unknown;
    args?: unknown[];
    locale?: string;
    components?: Components;
};
declare const Rich: import("svelte").Component<Props, {}, "">;
type Rich = ReturnType<typeof Rich>;
export default Rich;
