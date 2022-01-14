// eslint-disable-next-line import/no-extraneous-dependencies
import adapter from '@sveltejs/adapter-node';

/** @type {import('@sveltejs/kit').Config} */
export default {
  kit: {
    // hydrate the `body` element in src/app.html
    target: 'body',
    adapter: adapter(),
  },
};
