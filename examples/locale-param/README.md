# Locale in the query

The locale travels in the query string — `/about?lang=cs` — so every page keeps
one path and the language switcher is an ordinary link.

Runs on `@sveltejs/adapter-node`: the server reads `?lang=` before rendering, so
the page arrives in the right language instead of flipping after hydration. A
link to another `?lang=` switches the tab's instance as the navigation commits.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/locale-param?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `defineI18n` with `preferredLocale` reading `?lang=`, the default locale for the bare URL; a value outside the configured set matches nothing |
| [`src/routes/+layout.server.ts`](./src/routes/+layout.server.ts) and [`+layout.ts`](./src/routes/+layout.ts) | the same `export { load }`: one instance per request, handed to the browser as `snapshot({ records: true })` and applied with `hydrate()` |
| [`src/routes/+layout.svelte`](./src/routes/+layout.svelte) | `use(() => data)`; internal links carry the current locale, and the default locale keeps the bare URL |

## When not to use this

A query parameter is not part of the address as far as a search engine is
concerned — `/about` and `/about?lang=cs` are the same page to a crawler. If the
language should be indexable, use [`locale-router`](../locale-router) or
[`locale-router-advanced`](../locale-router-advanced) instead.

## Typed keys

As in [`multi-page`](../multi-page#typed-keys): `@sveltekit-i18n/typegen` in
[`vite.config.ts`](./vite.config.ts) writes `src/i18n-schema.d.ts` from the
config's own loaders and registers it, so an unknown key or a payload its
message does not take is a type error. Run `vite dev` or `vite build` once
before `npm run check`.

## Run it

```bash
npm install
npm run dev -- --open
```
