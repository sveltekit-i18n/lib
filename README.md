[![npm version](https://badge.fury.io/js/sveltekit-i18n.svg)](https://badge.fury.io/js/sveltekit-i18n) ![](https://github.com/jarda-svoboda/sveltekit-i18n/workflows/CI/badge.svg)

# sveltekit-i18n
`sveltekit-i18n` is a tiny, dependency-less library built for [Svelte](https://github.com/sveltejs/svelte) and [SvelteKit](https://github.com/sveltejs/kit).

_This project is currently in beta as long as tests are missing, but in case you are ok with that, you are ready to go.)_

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

export const { t, translation, translations, locale, locales, loading, loadConfig } = new i18n();
```

...include your translations in `__layout.svelte`...

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

...and use your placeholders within pages and components.

```svelte
<script>
  import { t } from '$lib/translations';

  const pageName = 'This page is Home page!';
</script>

<div>
  <h2>{$t('common.page', { pageName })}</h2>
  <p>{$t('home.content')}</p>
</div>
```

## Config

### `loaders`?: __Array<{ locale: string; key: string; loader: () => Promise<Record<any, any>>; routes?: string[]; }>__

You can use `loaders` to define your asyncronous translation load. All loaded data are stored so loader is triggered only once – in case there is no previous version of the translation.
Each loader can include:

`locale`: __string__ – locale (e.g. `en`, `de`) which is this loader for.

`key`: __string__ – represents the translation module. This key is used as a translation prefix so you can access your translation later using `$('key.yourTranslation')`. It must not include `.` (dot) character.

`loader`:__() => Promise<Record<any, any>>__ – is a function returning a Promise with translation data. You can use it to load files locally, fetch it from your API etc...

`routes`?: __string[]__ – can define routes this loader should be triggered for. You can use Regular expressions (e.g. `["/.ome"]` will be triggered for `/home` and `/rome` route as well (but still only once). Leave this `undefined` in case you want to load this module with any route (useful for common translations).


### `translations`?: __{ [locale: string]: { [translationKey: string]: string; } }__
In case there is no need to load data, you can insert your translations directly to this object.


### `locale`?: __string__
You can define current locale using this parameter.


### `route`?: __string__
Current route can be specified by this parameter (see `loaders.routes`).
