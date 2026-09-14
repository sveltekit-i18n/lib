import { FLAVOURS, PANELS, SOURCE } from '$lib/playground.js';
import { highlight } from '$lib/markdown.js';

/** The snippets are highlighted here, so no highlighter reaches the client. */
/** @type {import('./$types').PageServerLoad} */
export const load = async () => ({
  code: {
    parser: Object.fromEntries(await Promise.all(
      FLAVOURS.map(async (flavour) => [flavour, await highlight(SOURCE.parser[flavour], 'javascript')]),
    )),
    ...Object.fromEntries(await Promise.all(
      PANELS.filter((name) => name !== 'parser')
        .map(async (name) => [name, await highlight(SOURCE[name], 'javascript')]),
    )),
  },
});
