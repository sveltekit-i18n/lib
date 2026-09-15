# Component-scoped translations (CSR)

A component that owns its own instance and its own lexicon, so it can move to
another application without that application knowing any of its keys.

The application shell is the [`multi-page`](../multi-page) recipe; the only
difference here is the `Rates` block.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/component-scoped-csr?startScript=dev&file=src/lib/translations/index.js) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/rates/translations.js`](./src/lib/rates/translations.js) | the component's config — keys beside the component, not in the app |
| [`src/lib/rates/Rates.svelte`](./src/lib/rates/Rates.svelte) | `new I18n(config)` in the component, `setLocale` in an effect, `destroy()` on unmount |

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

## Run it

```bash
npm install
npm run dev -- --open
```
