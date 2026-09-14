import { sveltekit } from '@sveltejs/kit/vite';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [sveltekit()],
  // The documentation lives outside this package: `docs/` is the single source
  // of truth and the site renders it rather than keeping a copy.
  server: { fs: { allow: ['..'] } },
});
