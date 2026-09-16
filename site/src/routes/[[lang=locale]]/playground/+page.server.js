import { PANELS, SOURCE } from '$lib/playground.js';
import { highlight } from '$lib/markdown.js';

/** A panel with a switch carries one snippet per position, keyed by it. */
const highlightAll = async (source) => (typeof source === 'string'
  ? highlight(source, 'javascript')
  : Object.fromEntries(await Promise.all(
    Object.entries(source).map(async ([name, text]) => [name, await highlight(text, 'javascript')]),
  )));

/** The snippets are highlighted here, so no highlighter reaches the client. */
/** @type {import('./$types').PageServerLoad} */
export const load = async () => ({
  code: Object.fromEntries(await Promise.all(
    PANELS.map(async (name) => [name, await highlightAll(SOURCE[name])]),
  )),
});
