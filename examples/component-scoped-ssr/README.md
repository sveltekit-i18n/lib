# Component-scoped translations (SSR)

The same component as [`component-scoped-csr`](../component-scoped-csr) — its own
instance, its own lexicon — but its strings are in the server-rendered HTML.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/component-scoped-ssr?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/rates/translations.ts`](./src/lib/rates/translations.ts) | exports `snapshot(locale)` — the component's stand-in for a `load` |
| [`src/routes/+page.server.ts`](./src/routes/+page.server.ts) | the page calls it with the locale the root layout negotiated (`parent()`) and passes the payload down as a prop |
| [`src/lib/rates/Rates.svelte`](./src/lib/rates/Rates.svelte) | hydrates its instance from that payload, then stays reactive |

The application shell is the [`multi-page`](../multi-page) recipe, wired
through `sveltekit-i18n/kit`; the component's own hand-off is done by hand,
since `/kit` wires the application's instance only.

## Why the first render is complete

A component cannot load anything on the server by itself, so the page does it.
The payload is a `snapshot({ records: true })`, and the component hands it
straight to its own instance:

```javascript
const i18n = new I18n(config);

i18n.hydrate(snapshot);
```

`hydrate()` makes the snapshot's locale active at once, and its records mark the
loaders that delivered it as run, so nothing has to resolve before the first
paint — and no loader refetches what the server already produced.

After that an effect keeps it in step with the application's locale, so
switching the language in the browser loads the component's own lexicon for the
new one.

## Verified

Against the built app:

- `GET /` contains `Shipping rates`, `4 days`, `1 day`;
- `GET /` with `Accept-Language: cs` contains `Ceny dopravy`, `4 dny`, `1 den`;
- switching the language in the browser turns the block from `Shipping rates`
  into `Ceny dopravy` without a page load.

## Typed keys

As in [`multi-page`](../multi-page#typed-keys): `@sveltekit-i18n/typegen` in
[`vite.config.ts`](./vite.config.ts) writes `src/i18n-schema.d.ts` from the
config's own loaders and registers it, so an unknown key or a payload its
message does not take is a type error. Run `vite dev` or `vite build` once
before `npm run check`.

The registered schema is the application's, and types every instance whose
config states none — so the component's config states its own:
[`src/lib/rates/translations.ts`](./src/lib/rates/translations.ts) declares
`RatesSchema` for its five keys.

## Run it

```bash
npm install
npm run dev -- --open
```
