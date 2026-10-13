import type { ServerHalf, Shared } from './internal.js';
export declare const serverHalf: ({ create, negotiate, locales, basePath, canonical, handOver }: Shared) => ServerHalf;
