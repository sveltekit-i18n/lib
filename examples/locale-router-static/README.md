# Static locale router

The same URLs as [`locale-router`](../locale-router) — `/en/about`, `/cs/about`,
`/de/about` — on `@sveltejs/adapter-static`. There is no server at runtime: the
build writes one HTML file per page per locale and the deployment is that
directory.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/locale-router-static?startScript=dev&file=src/lib/translations/index.js) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/locale.js`](./src/lib/locale.js) | `entries()` — the list the crawler cannot discover on its own |
| [`src/routes/[lang=locale]/+page.js`](./src/routes/%5Blang%3Dlocale%5D/+page.js) | re-exports it, which is what makes `/cs` and `/de` exist |
| [`src/hooks.server.js`](./src/hooks.server.js) | hooks run during the prerender, so each file gets its own `<html lang>` |

## The one thing to know before deploying

There is **no fallback**. `build/` holds exactly the pages that were prerendered,
so an unknown URL is answered by whatever serves the files — S3, nginx, GitHub
Pages — and not by this application. The `+error.svelte` here only ever renders
for an error raised inside a page that does exist.

If the 404 has to be yours and translated, you want a fallback shell instead:
that is [`locale-router-advanced`](../locale-router-advanced).

## Run it

```bash
npm install
npm run dev -- --open
```

`npm run build` writes `build/`; `npm run preview` serves it.
