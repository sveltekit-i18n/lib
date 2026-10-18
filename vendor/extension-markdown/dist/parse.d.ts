/** The kinds of node a message can hold, as the component map names them. */
export type NodeType = 'paragraph' | 'emphasis' | 'strong' | 'code' | 'link' | 'image' | 'break';
/**
 * A node of a message. Its children are what it renders as without an
 * element: an image's description, a break's line ending.
 */
export type Node = {
    type: NodeType;
    attributes: Record<string, string>;
    children: Part[];
};
/** A message as the renderer walks it: text, or a node with its parts. */
export type Part = string | Node;
/** What parsing dropped from the message, for the report channel. */
export type Dropped = {
    code: 'url-blocked';
    node: 'link' | 'image';
    attribute: 'href' | 'src';
} | {
    code: 'nesting-invalid';
    node?: 'link';
};
/** Whether a URL of the message may render, by the node it is the target of. */
export type Gate = (node: 'link' | 'image', url: string) => boolean;
/**
 * Parses a message as CommonMark's inline syntax into its nodes. A blank line
 * splits it into paragraphs, each parsed on its own, so no construct spans
 * one. The message is not trimmed, but for the spaces, tabs and line endings
 * it ends with once they hold a line ending, and a line drops the spaces and
 * tabs it starts with, but for the first.
 * Blocks, raw HTML and reference links are not read and stay text. Linear in
 * the length of the message: each construct keeps to cmark's bounds. Every
 * string of the result has the payload's characters back (see `payload.ts`),
 * and a URL is kept only when `allowed` takes it. Never throws: a translation
 * is data.
 */
export declare const parse: (message: string, allowed?: Gate) => {
    parts: Part[];
    dropped: Dropped[];
};
