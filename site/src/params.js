import { defineParams } from '@sveltejs/kit/params';

import { PREFIXED } from '#lib/locale.js';

export const params = defineParams({
  locale: (param) => (PREFIXED.includes(param) ? param : undefined),
});
