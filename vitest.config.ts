import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

// The suite runs once per way a consumer's bundler compiles base's rune
// modules: for the server, and for the browser, where deep `$state` hands back
// proxies and `svelte` resolves to the runtime that runs effects and tracks
// reads. Both module graphs resolve with `browser` in the client project,
// since Vitest runs its specs through the SSR one.
const compiled = (['server', 'client'] as const).map((generate) => ({
  ...(generate === 'client' ? { resolve: { conditions: ['browser'] }, ssr: { resolve: { conditions: ['browser'] } } } : {}),
  plugins: [
    // base ships its rune modules UNCOMPILED for the consumer's bundler to
    // compile; here that bundler is this plugin.
    svelte({ dynamicCompileOptions: () => ({ generate }) }),
    // Workaround for vite-plugin-svelte 7.3 on rolldown-vite 8: the plugin
    // assigns its module-compile `transform.filter` in `configResolved`, which
    // the native filter pipeline snapshots too early — rune modules then reach
    // the runtime uncompiled ("$state is not defined"). A filter-less transform
    // forces the JS plugin pipeline, where the late-bound filter is honoured.
    // Remove once the plugin registers its filter statically.
    { name: 'force-js-plugin-pipeline', transform() {} },
  ],
  test: {
    name: generate,
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
}));

export default defineConfig({
  test: {
    projects: compiled,
  },
});
