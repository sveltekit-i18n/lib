# Multi-page

Several routes, no locale in the URL. `sveltekit-i18n/kit` negotiates the
locale per request: the `lang` cookie the language switcher writes, then
`Accept-Language`, then `initLocale`.

Runs on `@sveltejs/adapter-node`, because that negotiation needs a server.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/multi-page?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | exports the **config** (`as const satisfies Config`) and `defineI18n(config, { preferredLocale })` — `handle`, `load`, `use` and `get`, never a module-level instance |
| [`src/hooks.server.ts`](./src/hooks.server.ts) | `export { handle }` fills `%lang%` and `%dir%`; `handleError` returns a well-formed `App.Error` |
| [`src/routes/+layout.server.ts`](./src/routes/+layout.server.ts) and [`+layout.ts`](./src/routes/+layout.ts) | the same `export { load }`: one instance per request, handed to the browser as `snapshot({ records: true })` and applied with `hydrate()`, so no loader runs twice |
| [`src/routes/+layout.svelte`](./src/routes/+layout.svelte) | `use(() => data)`, and a switcher that writes the cookie and calls `setLocale()` |
| [`src/routes/+error.svelte`](./src/routes/+error.svelte) | `get()` — the error page has no `load` of its own |
| [`vite.config.ts`](./vite.config.ts) | `@sveltekit-i18n/typegen`, which writes `src/i18n-schema.d.ts` on `vite dev` and `vite build` |

## Route-scoped loading

`home` and `about` each have their own loader and their own `routes`. Open
`/about` and the `about` loader runs; come back and nothing runs, because a
loader runs once per freshness window and route params.

The strings the shell itself needs — navigation, language names, the error page
— are inline in `config.translations`. They have to be: the error page renders
when no route matched, so nothing that sits behind a loader is guaranteed to be
there.

## Right to left

Arabic is the fourth locale, and it is written right to left. `handle` fills
`dir="%dir%"` in [`src/app.html`](./src/app.html) from the negotiated locale,
so the server-rendered page arrives as `dir="rtl"`, and `use()` sets
`document.documentElement.dir` again whenever the locale changes in the
browser. The direction comes from the locale itself (`textDirection` from
`sveltekit-i18n/utils`), not from a list in the config. What is left to the app
is its CSS: [`src/app.css`](./src/app.css) spells horizontal spacing as logical
properties (`margin-inline-end`), which follow the direction, and isolates
`code` as left to right, so a path such as `/about` keeps its slash in front.
Inside a message, a Latin term that begins or ends in punctuation is wrapped in
U+200E (the left-to-right mark) for the same reason.

Arabic also has six plural forms, and `few` and `many` are chosen by the last
two digits of the number (`103` takes the same form as `3`), which the format's
comparisons cannot express. The config registers a `plural` modifier under
`parserOptions.customModifiers` that asks `Intl.PluralRules` for the category,
so the message names the forms: `{{count:plural; one:…; few:…; default:…;}}`.

## Typed keys

The typegen plugin declares `TranslationSchema` from the config's own loaders
and registers it in `SvelteKitI18n.Register`, so the instance needs no cast: a
key that is not in the English catalogue, or a payload its message does not
take, is a type error in every component. The config is
`as const satisfies Config`: `satisfies` checks it, and `as const` keeps its
locales literal, so `setLocale()` and `locale` complete `en`, `cs`, `de` and `ar`.
The generated file is reproducible, so it is in `.gitignore`; run `vite dev` or
`vite build` once before `npm run check`, which otherwise sees plain string
keys and misses those errors. An editor already open when the file first
appears may keep showing plain strings until you restart its Svelte and
TypeScript language servers.

## Run it

```bash
npm install
npm run dev -- --open
```
