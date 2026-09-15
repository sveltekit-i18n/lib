# Locale router

Every locale is a path segment — `/en/about`, `/cs/about`, `/de/about` — and
every page is **prerendered**, one file per locale.

Runs on `@sveltejs/adapter-node`: the prerendered pages are served flat, and
anything you add later can still render per request.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/locale-router?startScript=dev&file=src/lib/translations/index.js) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/locale.js`](./src/lib/locale.js) | `entries()` — the list the crawler cannot discover on its own |
| [`src/routes/[lang=locale]/+page.js`](./src/routes/%5Blang%3Dlocale%5D/+page.js) | re-exports it, which is what makes `/cs` and `/de` exist |
| [`src/params/locale.js`](./src/params/locale.js) | the matcher, without which `[lang]` swallows `/about` |
| [`src/routes/+layout.js`](./src/routes/+layout.js) | `prerender = true`, and one instance per browser tab |

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

## Run it

```bash
npm install
npm run dev -- --open
```
