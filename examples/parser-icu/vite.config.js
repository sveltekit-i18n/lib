import { sveltekit } from "@sveltejs/kit/vite";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: true, // or ['@sveltekit-i18n/*', 'intl-messageformat', '@formatjs/*']
  },
});
