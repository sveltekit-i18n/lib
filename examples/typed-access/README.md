# Typed access

Keys read as members of `t`: `t.home.title()` beside `t('home.title')`. One
extension,
[`@sveltekit-i18n/extension-typed-access`](https://www.npmjs.com/package/@sveltekit-i18n/extension-typed-access),
sits in the config handed to `defineI18n()`, and `use()` and `get()` hand out
its output, whose `t` carries the tree.

One page, on `@sveltejs/adapter-node`, because the locale is negotiated per
request: the `lang` cookie the language switcher writes, then
`Accept-Language`, then `initLocale`.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/typed-access?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `extensions: [typedAccess]` in the **config**, `as const`, and `defineI18n(config, { preferredLocale })` — `handle`, `load`, `use` and `get`, never a module-level instance |
| [`src/routes/+layout.svelte`](./src/routes/+layout.svelte) | `i18n.t.example.name()`, and `i18n.t.lang[locale]()` for a segment held in a variable |
| [`src/routes/+page.svelte`](./src/routes/+page.svelte) | `i18n.t.home.counter.text({ count })` with a typed payload, and the same message through `i18n.t('home.counter.text', { count })` |
| [`src/routes/+error.svelte`](./src/routes/+error.svelte) | `get()` — the error page has no `load` of its own |
| [`vite.config.ts`](./vite.config.ts) | `@sveltekit-i18n/typegen`, which writes `src/i18n-schema.d.ts` on `vite dev` and `vite build` |

## The tree is typed from the schema

The typegen plugin reads the config and registers the schema in
`SvelteKitI18n.Register`, and the extension builds the tree's type from it:
each segment completes in the editor, a leaf takes the payload its key takes,
and `i18n.t.home.titel()` is a type error just as `i18n.t('home.titel')` is.
Run `vite dev` or `vite build` once before `npm run check`: without the
generated schema there is no tree to type, and `t` checks as the plain
function.

The config is a constant `as const`, not only `satisfies Config`: the
constructor's type is folded through `extensions` only while it stays a tuple,
and a widened array would type `use()` and `get()` without the tree.

## One runtime

Every member call goes through the instance's own `t`, so a key resolves,
falls back and fails soft exactly as the string form does, and reading
`i18n.t` in a template re-renders on a locale switch like `i18n.t(…)` does.
A key known only at runtime — from a CMS, or a prop — keeps the string form.

A few names are no segments: at the first level, the names a function answers
(`name`, `length`, `call`, …) read the real `t`, and `then` answers
`undefined` at every level, so a node is never a thenable. A namespace of one
of those names is reached through the string form; the
[extension's README](https://www.npmjs.com/package/@sveltekit-i18n/extension-typed-access)
lists them, along with what the tree costs the checker on a large schema.

## With other extensions

`[typedAccess, stores]` hands out `$t.home.title()`; the other way round it
throws at construction, since the output of `stores` is no instance.
`[typedAccess, html(…)]` adds `T` beside the tree.

## Run it

```bash
npm install
npm run dev -- --open
```
