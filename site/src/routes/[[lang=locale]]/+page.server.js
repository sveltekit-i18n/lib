import { CONFIG, INSTALL, USE } from '$lib/landing.js';
import { highlight } from '$lib/markdown.js';

/** @type {import('./$types').PageServerLoad} */
export const load = async () => ({
  install: await highlight(INSTALL, 'bash'),
  config: await highlight(CONFIG, 'javascript'),
  use: await highlight(USE, 'svelte'),
});
