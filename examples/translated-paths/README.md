# Translated paths

Each page at a pathname of its own language, from one route tree with no
`[lang]` segment: `/about` is English, `/cs/o-nas` Czech and `/de/ueber-uns`
German, and `src/routes/about` renders all three. The pathname gives the
locale, so a link is all a language switch takes.

Runs on `@sveltejs/adapter-node`: home and about are prerendered at every
pathname, the products render per request, and a server `handle` redirects a
pathname to its locale's own.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/translated-paths?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `translatePathnames()` in the `pathnames` option: per canonical pathname, the pathname each locale serves it at, and a catch-all that gives every other pathname the locale of its prefix. Loader `routes` name the canonical `/about` and `/products/…` once |
| [`src/hooks.ts`](./src/hooks.ts) | `export { reroute }` — the universal hook that renders `/cs/o-nas` from `src/routes/about`, on the server and in the browser |
| [`src/hooks.server.ts`](./src/hooks.server.ts) | sends `/cs/about`, Czech by its prefix but not the Czech about page's pathname, to `/cs/o-nas` with a 308, then the i18n `handle` |
| [`src/routes/+layout.svelte`](./src/routes/+layout.svelte) | links written once, canonical, through `localizePath`; a switcher that links to each locale's pathname of the page shown, through `delocalize`; `hreflang` alternates |
| [`src/routes/about/+page.svelte`](./src/routes/about/+page.svelte) | the pathname requested, the route that rendered it and the canonical path `delocalize` reads off it |
| [`src/routes/products/[id=product]`](./src/routes/products/[id=product]/+page.svelte) | a param: `/cs/produkty/lamp` translates the rest of the pathname and keeps the param as it is |
| [`vite.config.ts`](./vite.config.ts) | `prerender.entries` lists every translated pathname of a prerendered page, and `paths.origin` the origin the alternates name |

## One page, one pathname per locale

`reroute` serves a page only at the pathname `localizePath` gives it. The
catch-all makes `/cs/about` Czech, but the Czech about page lives at
`/cs/o-nas`, so `reroute` leaves `/cs/about` as it is, and no route matches
it: the router in the browser finds no route for it either, so a link to it
loads from the server, and [`src/hooks.server.ts`](./src/hooks.server.ts)
redirects it to `/cs/o-nas`. A pathname the table does not know at all —
`/cs/nic` — is a 404, in Czech.

## Prerendered at each pathname

SvelteKit answers a request it reroutes to a prerendered page with that page's
canonical file, which is English. So each translated pathname of a
prerendered page is a file of its own, `build/prerendered/cs/o-nas.html`
included. The switcher links to all of them, and `prerender.entries` lists
them, so none rests on a link the crawler might not follow.

The `hreflang` alternates name `https://example.com`, from `paths.origin`. A
deployment states its own origin there. An app served at several domains sets
none and builds its alternates with `localizeHref`, as the
[core's docs](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#domains)
describe.

## Verified

Built and served with `node build`:

| URL | answer |
|---|---|
| `/`, `/about`, `/products/desk` | English |
| `/cs`, `/cs/o-nas`, `/cs/produkty/lamp` | Czech, with an `Accept-Language` of `de` too |
| `/de`, `/de/ueber-uns`, `/de/produkte/chair` | German |
| `/cs/about`, `/cs/products/lamp` | 308 to `/cs/o-nas`, `/cs/produkty/lamp` |
| `/cs/nic`, `/cs/produkty/nic` | 404, Czech |
| `/nope` | 404, English |

In a browser, the switcher and the links navigate on the client, and each
navigation shows the new page in its locale at once. A link to `/cs/about`
loads from the server and lands on `/cs/o-nas`.

## Typed keys

As in [`multi-page`](../multi-page#typed-keys): `@sveltekit-i18n/typegen` in
[`vite.config.ts`](./vite.config.ts) writes `src/i18n-schema.d.ts` from the
config's own loaders and registers it, so an unknown key or a payload its
message does not take is a type error. `localizePath` and `delocalize`
complete `en`, `cs` and `de`. Run `vite dev` or `vite build` once before
`npm run check`.

## Run it

```bash
npm install
npm run dev -- --open
```

`npm run build` writes `build/`; `node build` serves it.
