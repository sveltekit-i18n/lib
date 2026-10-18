import type { Node, Part } from './parse.js';
import type { Resolved } from './shared/resolve.js';
import type { Rendered } from './shared/types.js';
import type { Components } from './types.js';
/** What a message renders with no map at all: inline elements only. */
export declare const DEFAULT_COMPONENTS: Components;
/** The parts as the map renders them: an unmapped node leaves its children in its place. */
export declare const apply: (parts: Part[], lookup: (node: Node) => Resolved | undefined) => Rendered[];
