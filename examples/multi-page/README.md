# Multi-page

Several routes, no locale in the URL. The locale is negotiated per request from
a `lang` cookie, falling back to `Accept-Language` and then to the default.

Runs on `@sveltejs/adapter-node`, because that negotiation needs a server.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/multi-page?startScript=dev&file=src/lib/translations/index.js) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/translations/index.js`](./src/lib/translations/index.js) | exports the **config**, not an instance — a module is evaluated once per process |
| [`src/hooks.server.js`](./src/hooks.server.js) | resolves the locale into `locals`, sets `<html lang>`, and returns a well-formed `App.Error` |
| [`src/routes/+layout.server.js`](./src/routes/+layout.server.js) | one instance per request, handed on through `snapshot()` |
| [`src/routes/+layout.js`](./src/routes/+layout.js) | one instance per browser tab, hydrated from that snapshot |
| [`src/routes/+error.svelte`](./src/routes/+error.svelte) | reads the instance from context — the error page has no `load` |

## Route-scoped loading

`home` and `about` each have their own loader and their own `routes`. Open
`/about` and the `about` loader runs; come back and nothing runs, because a
loader fires once per freshness window.

The strings the shell itself needs — navigation, language names, the error page
— are inline in `config.translations`. They have to be: the error page renders
when no route matched, so nothing that sits behind a loader is guaranteed to be
there.

## Run it

```bash
npm install
npm run dev -- --open
```
