import Base, { Config as Config$1 } from '@sveltekit-i18n/base';
import { Parser, Modifier } from '@sveltekit-i18n/parser-default';
export { Modifier, Parser } from '@sveltekit-i18n/parser-default';

type Config<Payload = {}, Props = {}> = {
    parserOptions?: Parser.Options<any, Props>;
} & Omit<Config$1.T<Parser.Params<Payload, Props>>, 'parser'>;

declare class I18n<Params extends Parser.Params<P, M>, P = Parser.PayloadDefault, M = Modifier.DefaultProps> extends Base<Params> {
    constructor(config?: Config<P, M>);
    loadConfig: (config: Config<P, M>) => Promise<void>;
}

export { Config, I18n as default };
