[![npm version](https://badge.fury.io/js/sveltekit-i18n.svg)](https://badge.fury.io/js/sveltekit-i18n) ![](https://github.com/sveltekit-i18n/lib/workflows/Tests/badge.svg)

# sveltekit-i18n
`sveltekit-i18n` is a tiny library with no external dependencies, built for [Svelte](https://github.com/sveltejs/svelte) and [SvelteKit](https://github.com/sveltejs/kit). It glues [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base) and [@sveltekit-i18n/parser-default](https://github.com/sveltekit-i18n/parsers/tree/master/parser-default) together to provide you the most straightforward `sveltekit-i18n` solution.

__Note this README is related to `sveltekit-i18n@2.x`. If you are looking for version `1.x` you can find it [here](https://github.com/sveltekit-i18n/lib/tree/1.x).__
&nbsp;

&nbsp;

## Key features

✅ SvelteKit ready\
✅ SSR support\
✅ Custom data sources – no matter if you are using local files or remote API to get your translations\
✅ Module-based – your translations are loaded for visited pages only (and only once!)\
✅ Component-scoped translations – you can create multiple instances with custom definitions\
✅ Custom modifiers – you can modify the input data the way you really need\
✅ TS support\
✅ No external dependencies
&nbsp;

&nbsp;

## Usage

Setup `translations.js/ts` in your `lib` folder...
```typescript
import i18n from 'sveltekit-i18n';
import type { Config } from 'sveltekit-i18n';

const config: Config = ({
  loaders: [
    {
      locale: 'en',
      key: 'home',
      loader: async () => (
        await import('./en/common.json')
      ).default,
    },
    {
      locale: 'cs',
      key: 'home',
      loader: async () => (
        await import('./cs/common.json')
      ).default,
    },
    {
      locale: 'en',
      key: 'about',
      loader: async () => (
        await import('./en/about.json')
      ).default,
    },
    {
      locale: 'cs',
      key: 'about',
      loader: async () => (
        await import('./cs/about.json')
      ).default,
    }
  ],
});

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
```

...load your translations in `+page.ts` or `+layout.ts`...

```typescript
<script lang="ts">
  import type { PageLoad } from "./$types";
  import { locale, loadTranslations } from '$lib/translations';

  export const load: PageLoad = async ({ url }) => {
    const { pathname } = url;

    // Get from localStorage, cookie, etc...
    const defaultLocale = 'en';
    
    // Set default if no locale already set
    const initLocale = locale.get() || defaultLocale;

    // Keep this just before the `return`
    await loadTranslations(initLocale, pathname);

    return {};
  }
</script>
```

...include your translations within pages and components...

```typescript
<script>
  import { t } from '$lib/translations';

  const pageName = 'This page is Home page!';
</script>
```
```svelte
<div>
  <!-- you can use `placeholders` and `modifiers` in your definitions (see docs) -->
  <h2>{$t('home.page', { pageName })}</h2>
  <p>{$t('about.title')}</p>
</div>
```
...and switch `$locale` between preferred languages `"en"` > `"cs"` to see the results.
&nbsp;

&nbsp;

## More info
[Docs](https://github.com/sveltekit-i18n/lib/tree/master/docs/README.md)\
[Examples](https://github.com/sveltekit-i18n/lib/tree/master/examples) (made before latest routing/load updates)\
[Changelog](https://github.com/sveltekit-i18n/lib/releases)
