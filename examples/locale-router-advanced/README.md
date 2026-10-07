# Advanced locale router

The default locale owns the bare path and every other locale carries a prefix:
`/about` is English, `/cs/about` is Czech. Fully prerendered on
`@sveltejs/adapter-static`, with a fallback shell so an unknown URL still gets a
page of this application's — translated, on the first hit.

This is the routing the [documentation
site](https://sveltekit-i18n.github.io/) itself uses.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/locale-router-advanced?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/params.ts`](./src/params.ts) | matches **only** the prefixed locales — accepting the default one would give every page two addresses, accepting anything would swallow `/about` |
| [`vite.config.ts`](./vite.config.ts) | `fallback: '404.html'`, and explicit `entries` because a prefixed locale is reachable only through the switcher |
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `preferredLocale` reads the locale off `url.pathname`, not off the route params — the fallback shell renders for URLs that matched no route — and an unprefixed path is English whatever the browser asks for; loader `routes` list each path under every prefix |
| [`src/routes/+layout.svelte`](./src/routes/+layout.svelte) | `use(() => data)`, which also sets `<html lang>` and `dir` after hydration, because one shell serves every unknown URL |
| [`src/routes/+error.svelte`](./src/routes/+error.svelte) | `get()`; its strings ship in `config.translations` |

## Why the error page works here

A static host answers an unknown URL with one file. If that file is a shell that
boots the app, the app decides what to render — including which language. Two
things have to hold:

1. everything the error page needs is in `config.translations`, not behind a
   loader, because no `load` ran and no route matched;
2. the locale is derived from `url.pathname`, because there are no route params
   to read it from.

Get either wrong and you see raw keys until the visitor reloads.

## Verified

Built, served the way a static host serves (`404.html` for anything missing) and
driven in a browser with a **fresh context per URL**, so every row is a first
hit:

| URL | `<html lang>` | renders |
|---|---|---|
| `/`, `/about` | `en` | English |
| `/cs`, `/cs/about` | `cs` | Czech |
| `/de`, `/de/about` | `de` | German |
| `/nope` | `en` | English 404 |
| `/cs/nope` | `cs` | Czech 404 |
| `/de/nope` | `de` | German 404 |

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

`npm run build` writes `build/`; `npm run preview` serves it.
