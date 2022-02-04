// eslint-disable-next-line import/no-extraneous-dependencies
import adapter from '@sveltejs/adapter-static';

const config = {
  kit: {
    adapter: adapter(),
  },
};

export default config;
