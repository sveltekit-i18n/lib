import { init } from '$lib/component/index.svelte';

/** @type {import('@sveltejs/kit').Load} */
export const load = async () => {
  const cs = init('cs');
  const de = init('de');

  await Promise.all([cs.loading.toPromise(), de.loading.toPromise()]);

  return { cs, de };
};