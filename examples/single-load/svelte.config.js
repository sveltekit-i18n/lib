// eslint-disable-next-line import/no-extraneous-dependencies
import adapter from '@sveltejs/adapter-static';

const config = {
  kit: {
    adapter: adapter(),

    // hydrate the <div id="svelte"> element in src/app.html
    target: '#svelte',
  },
};

export default config;
