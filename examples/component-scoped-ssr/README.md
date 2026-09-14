# Component-scoped translations (SSR)

The same component as [`component-scoped-csr`](../component-scoped-csr) — its own
instance, its own lexicon — but its strings are in the server-rendered HTML.

## What to look at

| File | Why |
|---|---|
| [`src/lib/rates/translations.js`](./src/lib/rates/translations.js) | exports `snapshot(locale)` — the component's stand-in for a `load` |
| [`src/routes/+page.server.js`](./src/routes/+page.server.js) | the page calls it and passes the payload down as a prop |
| [`src/lib/rates/Rates.svelte`](./src/lib/rates/Rates.svelte) | seeds its instance from that payload, then stays reactive |

## Why the first render is complete

A component cannot load anything on the server by itself, so the page does it.
The payload is an ordinary `snapshot()`, and the component hands it straight to
its own instance:

```javascript
const i18n = new I18n({ ...config, initLocale: locale, translations });
```

`initLocale` settles the locale synchronously, and the snapshot's keys count as
loaded, so nothing has to resolve before the first paint — and no loader refetches
what the server already produced.

After that an effect keeps it in step with the application's locale, so
switching the language in the browser loads the component's own lexicon for the
new one.

## Verified

Against the built app:

- `GET /` contains `Shipping rates`, `4 days`, `1 day`;
- `GET /` with `Accept-Language: cs` contains `Ceny dopravy`, `4 dny`, `1 den`;
- switching the language in the browser turns the block from `Shipping rates`
  into `Ceny dopravy` without a page load.

## Run it

```bash
npm install
npm run dev -- --open
```
