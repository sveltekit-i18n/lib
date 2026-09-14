# Locale in the query

The locale travels in the query string — `/about?lang=cs` — so every page keeps
one path and the language switcher is an ordinary link.

Runs on `@sveltejs/adapter-node`: the server reads `?lang=` before rendering, so
the page arrives in the right language instead of flipping after hydration.

## What to look at

| File | Why |
|---|---|
| [`src/lib/locale.js`](./src/lib/locale.js) | `?lang=` is visitor-controlled — anything outside the configured set is dropped |
| [`src/routes/+layout.server.js`](./src/routes/+layout.server.js) | one instance per request, handed on through `snapshot()` |
| [`src/routes/+layout.svelte`](./src/routes/+layout.svelte) | internal links carry the current locale; the default locale keeps the bare URL |

## When not to use this

A query parameter is not part of the address as far as a search engine is
concerned — `/about` and `/about?lang=cs` are the same page to a crawler. If the
language should be indexable, use [`locale-router`](../locale-router) or
[`locale-router-advanced`](../locale-router-advanced) instead.

## Run it

```bash
npm install
npm run dev -- --open
```
