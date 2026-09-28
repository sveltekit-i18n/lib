# Component-scoped translations (CSR)

A component that owns its own instance and its own lexicon, so it can move to
another application without that application knowing any of its keys.

The application shell is the [`multi-page`](../multi-page) recipe, wired
through `sveltekit-i18n/kit`; the only difference here is the `Rates` block.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/component-scoped-csr?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/rates/translations.ts`](./src/lib/rates/translations.ts) | the component's config — keys beside the component, not in the app |
| [`src/lib/rates/Rates.svelte`](./src/lib/rates/Rates.svelte) | `new I18n(config)` in the component, `loadTranslations` in an effect, `destroy()` on unmount |

## The trade-off

A component has no `load` of its own. Its loaders therefore run **after
hydration**, which means:

- the block is not in the server-rendered HTML — a crawler will not see it;
- there is a moment where it has nothing to render, so it needs a placeholder.

`i18n.initialized` is what the component waits on. If the block has to be in the
HTML, hand it a snapshot from the page's `load` instead — that is
[`component-scoped-ssr`](../component-scoped-ssr).

## Two instances, on purpose

The page's instance and the component's are unrelated: separate configs,
separate loaders, separate `loading` state. Only the locale is passed in, as a
prop, so the component follows the application's language without reaching for
its instance.

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
