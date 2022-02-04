// eslint-disable-next-line import/no-extraneous-dependencies
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
export default {
  kit: {
    adapter: adapter(),
  },
};
