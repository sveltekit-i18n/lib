# mdsvex

A route written in Markdown. `mdsvex` compiles `.svx` to an ordinary Svelte
component, so `t()` works inside it unchanged — the part worth showing is how
such a route joins the route-scoped loaders and the prerender.

Asked in [discussion #67](https://github.com/sveltekit-i18n/lib/discussions/67).

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/mdsvex?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`svelte.config.js`](./svelte.config.js) | `.svx` has to be a page extension, and `smartypants` has to be off |
| [`src/routes/[lang=locale]/guide/+page.svx`](./src/routes/%5Blang%3Dlocale%5D/guide/+page.svx) | `get()` and `t()` in Markdown |
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `guide` is route-scoped like any other namespace; `preferredLocale` reads the locale off the path |

## Three things that are not obvious

**`.svx` must be in `kit.extensions`.** `preprocess` alone is not enough — the
router only looks at files whose extension it knows.

**Turn `smartypants` off.** It rewrites quotes in the Markdown body, and a
`{i18n.t('key')}` inside a `#` heading *is* Markdown body. With smart quotes on,
that expression reaches the compiler as `{i18n.t(‘key’)}` and fails to parse.

**Nothing else is special.** `/cs/guide` matches a route-scoped loader the same
way any path does — loaders see the whole pathname, locale segment included —
and the `entries` under `[lang]` cover it, so after a build the guide exists in
all three locales.

## Out of scope

Translating the Markdown *prose*. One `.svx` per locale is a routing and content
decision, not something this library resolves — here the prose stays English and
everything around it comes from the `guide` namespace.

## Typed keys

As in [`multi-page`](../multi-page#typed-keys): `@sveltekit-i18n/typegen` in
[`vite.config.ts`](./vite.config.ts) writes `src/i18n-schema.d.ts` from the
config's own loaders and registers it, so an unknown key or a payload its
message does not take is a type error. Run `vite dev` or `vite build` once
before `npm run check`.

`svelte-check` does not read `.svx` files, so the keys the guide page uses are
not checked; the `.svelte` and `.ts` files are.

## Run it

```bash
npm install
npm run dev -- --open
```
