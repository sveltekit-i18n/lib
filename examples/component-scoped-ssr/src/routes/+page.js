import { init } from '$lib/component/index.svelte';

export const load = async () => {
  const { loading: loadingEn, ...restEn } = init('en');
  const { loading: loadingDe, ...restDe } = init('de');
  await Promise.all([loadingEn.toPromise(), loadingDe.toPromise()]);

  return {  props1: { loading: loadingEn, ...restEn }, props2: { loading: loadingDe, ...restDe } };
};