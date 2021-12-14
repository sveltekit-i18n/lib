[![npm version](https://badge.fury.io/js/sveltekit-i18n.svg)](https://badge.fury.io/js/sveltekit-i18n) ![](https://github.com/jarda-svoboda/sveltekit-i18n/workflows/CI/badge.svg)

# sveltekit-i18n
`sveltekit-i18n` is a tiny, dependency-less library built for [Svelte](https://github.com/sveltejs/svelte) and [SvelteKit](https://github.com/sveltejs/kit). This project is currently in beta while tests are missing, but in case you are ok with that, you are ready to go.)

## Key features

✅ Simple API\
✅ SvelteKit ready\
✅ SSR support\
✅ Custom data sources – no matter if you are using local files or remote API to get your translations\
✅ Module-based – your translations are loaded only in time they are really needed (and only once!)\
✅ TS support\
✅ No dependencies

## TODO
- [ ] documentation
- [ ] examples
- [ ] tests

## Usage

In your `__layout.svelte` include your translations like this:

```svelte
<script context="module">
  import { config, loadConfig } from '$lib/translations';

  export const load = async ({ page }) => {
    const { path as route } = page;

    const locale = 'en'; // get from cookie or user session...
    await loadConfig({...config, locale, route });

    return {};
  }
</script>
```
