import type { Load } from '@sveltejs/kit';
import { loading } from '$lib/translations';

export const load: Load = async () => {
  await loading.toPromise();

  return {};
};