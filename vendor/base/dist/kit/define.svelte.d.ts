import { I18n } from '../I18n.svelte.js';
import type { Config } from '../types.js';
import type { Kit } from './types.js';
/**
 * Wires SvelteKit to an instance of `config`: a `handle` hook, the root
 * layout's `load`, `use()` / `get()` for components, the translated
 * pathnames of `options.pathnames` and the domains of `options.domains`. The
 * server builds an instance per request; the browser keeps one per tab.
 */
export declare const defineI18n: <const C extends Config.T<any, any> = Config.T<any, any>>(config: C, options?: Kit.Options<Config.LocaleInput<Config.LocalesFromConfig<C>>>) => Kit.T<InstanceType<typeof I18n<C>>, Config.LocaleInput<Config.LocalesFromConfig<C>>>;
