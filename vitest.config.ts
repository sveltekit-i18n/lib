import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [
    // base ships its rune modules UNCOMPILED for the consumer's bundler to
    // compile; here that bundler is this plugin.
    svelte(),
    // Workaround for vite-plugin-svelte 7.3 on rolldown-vite 8: the plugin
    // assigns its module-compile `transform.filter` in `configResolved`, which
    // the native filter pipeline snapshots too early — rune modules then reach
    // the runtime uncompiled ("$state is not defined"). A filter-less transform
    // forces the JS plugin pipeline, where the late-bound filter is honoured.
    // Remove once the plugin registers its filter statically.
    { name: 'force-js-plugin-pipeline', transform() {} },
  ],
  test: {
    environment: 'node',
    include: ['tests/specs/**/*.spec.ts'],
    server: {
      deps: {
        // A dependency is externalized by default, which would hand the rune
        // modules straight to Node — the plugin above never sees them.
        inline: ['@sveltekit-i18n/base'],
      },
    },
  },
});
