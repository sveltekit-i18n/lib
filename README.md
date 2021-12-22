[![npm version](https://badge.fury.io/js/sveltekit-i18n.svg)](https://badge.fury.io/js/sveltekit-i18n) ![](https://github.com/jarda-svoboda/sveltekit-i18n/workflows/Tests/badge.svg)

# sveltekit-i18n
`sveltekit-i18n` is a tiny, dependency-less library built for [Svelte](https://github.com/sveltejs/svelte) and [SvelteKit](https://github.com/sveltejs/kit).

___NOTE: This project is currently in RC! 1.0.0 will be released as soon as tests are completed...___

## Key features

✅ SvelteKit ready\
✅ SSR support\
✅ Custom data sources – no matter if you are using local files or remote API to get your translations\
✅ Module-based – your translations are loaded only for visited pages (and only once!)\
✅ Component-scoped translations – you can create multiple instances with custom definitions\
✅ TS support\
✅ No dependencies

## TODO
- tests

## Usage

Setup `translations.js` in your lib folder...
```javascript
import i18n from 'sveltekit-i18n';

export const config = ({
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => (
        await import('./en/common.json')
      ).default,
    },
    {
      locale: 'en',
      key: 'home',
      routes: ['/'],
      loader: async () => (
        await import('./en/home.json')
      ).default,
    },
    {
      locale: 'en',
      key: 'about',
      routes: ['/about'],
      loader: async () => (
        await import('./en/about.json')
      ).default,
    },
    {
      locale: 'cs',
      key: 'common',
      loader: async () => (
        await import('./cs/common.json')
      ).default,
    },
    {
      locale: 'cs',
      key: 'home',
      routes: ['/'],
      loader: async () => (
        await import('./cs/home.json')
      ).default,
    },
    {
      locale: 'cs',
      key: 'about',
      routes: ['/about'],
      loader: async () => (
        await import('./cs/about.json')
      ).default,
    },
  ],
});

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
```

...include your translations in `__layout.svelte`...

```svelte
<script context="module">
  import { loadTranslations } from '$lib/translations';

  export const load = async ({ page }) => {
    const { path } = page;

    const locale = 'en'; // get from cookie or user session...
    await loadTranslations(locale, path);

    return {};
  }
</script>
```

...and use your placeholders within pages and components.

```svelte
<script>
  import { t } from '$lib/translations';

  const pageName = 'This page is Home page!';
</script>

<div>
  <!-- you can use `placeholders` and `modifiers` in your definitions (see docs) -->
  <h2>{$t('common.page', { pageName })}</h2>
  <p>{$t('home.content')}</p>
</div>
```

## More info
[Docs](https://github.com/jarda-svoboda/sveltekit-i18n/tree/master/docs/README.md)\
[Examples](https://github.com/jarda-svoboda/sveltekit-i18n/tree/master/examples)
