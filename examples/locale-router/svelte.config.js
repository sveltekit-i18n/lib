/* eslint-disable */
import adapter from '@sveltejs/adapter-netlify';

/** @type {import('@sveltejs/kit').Config} */
const config = {
  kit: {
    adapter: adapter(),
    trailingSlash: 'never',
  },
};

export default config;
