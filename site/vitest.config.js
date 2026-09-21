import { fileURLToPath } from 'node:url';

import { defineConfig } from 'vitest/config';

export default defineConfig({
  // A `vitest.config.js` shadows `vite.config.js` rather than merging with it,
  // so `$lib` — which SvelteKit's plugin supplies there — is spelled out here.
  // The suite draws text; it needs the alias, not the framework.
  resolve: { alias: { $lib: fileURLToPath(new URL('./src/lib', import.meta.url)) } },
  test: {
    environment: 'node',
    include: ['tests/specs/**/*.spec.js'],
  },
});
