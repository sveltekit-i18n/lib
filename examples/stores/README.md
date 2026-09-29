# Stores

The `$t` store surface v2 had, on a 3.x core. One extension,
[`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores),
sits in the config handed to `defineI18n()`, and `use()` and `get()` hand out
`$t`, `$l`, `$locale` and `$loading` instead of the instance.

One page, on `@sveltejs/adapter-node`, because the locale is negotiated per
request: the `lang` cookie the language switcher writes, then
`Accept-Language`, then `initLocale`.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/stores?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `extensions: [stores]` in the **config**, and `defineI18n(config, { preferredLocale })` — `handle`, `load`, `use` and `get`, never a module-level instance |
| [`src/routes/+layout.svelte`](./src/routes/+layout.svelte) | `const { t, locale, loading } = use(() => data)`, and a `<select bind:value={$locale}>` |
| [`src/routes/+page.svelte`](./src/routes/+page.svelte) | `const { t, l } = get()`: `$t` with a payload, and `$l('en', …)` |
| [`src/routes/+error.svelte`](./src/routes/+error.svelte) | `get()` — the error page has no `load` of its own |
| [`vite.config.ts`](./vite.config.ts) | `@sveltekit-i18n/typegen`, which writes `src/i18n-schema.d.ts` on `vite dev` and `vite build` |

## Still one instance per request

The stores are a view of an instance, so where they come from matters. The v2
habit of destructuring them from a module-level instance would share that
instance between every request the server handles, and one visitor's language
would leak into another's page. Here the extension sits in the config instead:
`defineI18n()` builds an instance per request on the server and one per tab in
the browser, runs the extension on each, and `use()` and `get()` hand out the
stores of that instance. The wiring keeps driving the instance underneath —
the locale the server negotiated, the route of each navigation.

## Switching the language

`$locale` is a writable store. The switcher binds to it, so choosing a language
sets it, and the store emits the new locale once its translations have loaded,
never before. `$loading` is `true` meanwhile. The cookie is written only on an
explicit choice, so a language that came from `Accept-Language` does not stick
once the browser asks for another.

For an awaitable switch that receives a loader's rejection, the instance's
`setLocale()` is still there: the extension's output carries it next to the
stores.

## `$l` and `fallbackLocale`

`$l('en', …)` reads English whatever the active locale is, but only what is
loaded. `fallbackLocale: 'en'` loads English next to the active locale, so the
page can show the same message in both, and a key the active locale lacks falls
back to it.

## Typed keys

The typegen plugin reads the config — the extension included — and registers
the schema in `SvelteKitI18n.Register`. The extension's output is typed from
the instance it wraps, so `$t('home.nope')` is a type error just as
`i18n.t('home.nope')` would be. Run `vite dev` or `vite build` once before
`npm run check`, which otherwise sees plain string keys.

## Run it

```bash
npm install
npm run dev -- --open
```
