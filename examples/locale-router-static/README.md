# Static locale router

The same URLs as [`locale-router`](../locale-router) — `/en/about`, `/cs/about`,
`/de/about` — on `@sveltejs/adapter-static`. There is no server at runtime: the
build writes one HTML file per page per locale and the deployment is that
directory.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/locale-router-static?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/locale.ts`](./src/lib/locale.ts) | `entries()` — the list the crawler cannot discover on its own |
| [`src/routes/[lang=locale]/+page.ts`](./src/routes/%5Blang%3Dlocale%5D/+page.ts) | re-exports it, which is what makes `/cs` and `/de` exist |
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `defineI18n` with `preferredLocale` reading the path, and loader `routes` that include the locale segment (`/cs/about`), since loaders match the whole pathname |
| [`src/hooks.server.ts`](./src/hooks.server.ts) | `export { handle }` — hooks run during the prerender, so each file gets its own `<html lang>` and `dir` |

## The one thing to know before deploying

There is **no fallback**. `build/` holds exactly the pages that were prerendered,
so an unknown URL is answered by whatever serves the files — S3, nginx, GitHub
Pages — and not by this application. The `+error.svelte` here only ever renders
for an error raised inside a page that does exist.

If the 404 has to be yours and translated, you want a fallback shell instead:
that is [`locale-router-advanced`](../locale-router-advanced).

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
