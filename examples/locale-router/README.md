# Locale router

Every locale is a path segment — `/en/about`, `/cs/about`, `/de/about` — and
every page is **prerendered**, one file per locale.

Runs on `@sveltejs/adapter-node`: the prerendered pages are served flat, and
anything you add later can still render per request.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/locale-router?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/locale.ts`](./src/lib/locale.ts) | `entries()` — the list the crawler cannot discover on its own |
| [`src/routes/[lang=locale]/+page.ts`](./src/routes/%5Blang%3Dlocale%5D/+page.ts) | re-exports it, which is what makes `/cs` and `/de` exist |
| [`src/params/locale.ts`](./src/params/locale.ts) | the matcher, without which `[lang]` swallows `/about` |
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `defineI18n` with `preferredLocale` reading the path, and loader `routes` that include the locale segment (`/cs/about`), since loaders match the whole pathname |
| [`src/routes/+layout.ts`](./src/routes/+layout.ts) | `prerender = true` and `export { load }` — the only `load`, so the locale comes off the path at build time and in the browser alike |
| [`src/routes/+layout.svelte`](./src/routes/+layout.svelte) | `use(() => data)`, which switches the tab's instance, and `<html lang>`, as a link to another locale commits |

## Why `entries` is the whole point

The crawler starts at `/`, follows the redirect to `/en` and follows the links
it finds there. It has no way to guess `/cs`. Without `entries` the build either
fails with

```
The following routes were marked as prerenderable, but were not prerendered
because they were not found while crawling your app
```

or — worse — succeeds having written only the language you happened to link to.
That is why the CI check for these examples greps the built HTML instead of
trusting the exit code.

After a build, `build/prerendered/` holds `en.html`, `cs.html`, `de.html` and an
`about.html` under each.

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
