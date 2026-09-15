# mdsvex

A route written in Markdown. `mdsvex` compiles `.svx` to an ordinary Svelte
component, so `t()` works inside it unchanged — the part worth showing is how
such a route joins the route-scoped loaders and the prerender.

Asked in [discussion #67](https://github.com/sveltekit-i18n/lib/discussions/67).

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/mdsvex?startScript=dev&file=src/lib/translations/index.js) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`svelte.config.js`](./svelte.config.js) | `.svx` has to be a page extension, and `smartypants` has to be off |
| [`src/routes/[lang=locale]/guide/+page.svx`](./src/routes/%5Blang%3Dlocale%5D/guide/+page.svx) | `getContext('i18n')` and `t()` in Markdown |
| [`src/lib/translations/index.js`](./src/lib/translations/index.js) | `guide` is route-scoped like any other namespace |

## Three things that are not obvious

**`.svx` must be in `kit.extensions`.** `preprocess` alone is not enough — the
router only looks at files whose extension it knows.

**Turn `smartypants` off.** It rewrites quotes in the Markdown body, and a
`{i18n.t('key')}` inside a `#` heading *is* Markdown body. With smart quotes on,
that expression reaches the compiler as `{i18n.t(‘key’)}` and fails to parse.

**Nothing else is special.** `/guide` matches a route-scoped loader the same way
any path does, and the `entries` under `[lang]` cover it, so after a build the
guide exists in all three locales.

## Out of scope

Translating the Markdown *prose*. One `.svx` per locale is a routing and content
decision, not something this library resolves — here the prose stays English and
everything around it comes from the `guide` namespace.

## Run it

```bash
npm install
npm run dev -- --open
```
