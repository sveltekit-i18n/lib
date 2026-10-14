/** A string of the parsed message with the payload's characters back. */
export declare const restore: (text: string) => string;
/**
 * The payload with every string in it made inert: each character the syntax
 * reads stands in as a noncharacter, which reads as no syntax anywhere — in
 * text, a code span, a destination or a title — and `restore` maps back once
 * the message is parsed. Plain objects and arrays are walked, and their keys
 * stay, since a placeholder names them (`{{user.first_name}}`); an object
 * serializes with its keys inert. Any other object is the app's own and
 * reaches the parser as it is, since the parser may format it (a `Date`).
 */
export declare const inertPayload: (value: unknown) => unknown;
