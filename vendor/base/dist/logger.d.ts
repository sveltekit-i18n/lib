import type { Logger } from './types.js';
export declare const loggerFactory: ({ logger, level, prefix }?: Logger.FactoryProps) => Logger.T;
export declare let logger: Logger.T;
export declare const setLogger: (l: Logger.T) => void;
export declare const logError: (message: string, error?: unknown) => void;
