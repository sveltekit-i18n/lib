# Examples

Each directory is a standalone SvelteKit application on `sveltekit-i18n` 3.x.
They cover the **application-shaped** decisions — an adapter, a
`vite.config.ts`, a `hooks.server.ts`, a route tree — the things that are hard
to get right from a snippet. Every one of them wires SvelteKit through
`sveltekit-i18n/kit`; what sets them apart is mostly where `preferredLocale`
reads the locale from.

They are written in TypeScript, and each generates its schema with
[`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen), so a
key that is not in the catalogue is a type error — see
[`multi-page`](./multi-page#typed-keys).

Everything that is really three lines of configuration lives on the
[playground](https://sveltekit-i18n.github.io/playground) instead, where a real
instance answers as you change it: message formats (`parser-curly`,
`parser-icu`, `parser-mf2`, `parser-i18next`), `config.preprocess`,
`config.loaders` matching and freshness, and `config.fallbackLocale`.

Each **run it** below opens that directory in
[StackBlitz](https://stackblitz.com), which boots Node and the dev server inside
the browser tab and lands on the example's `config`. Nothing is installed, and
nothing is deployed that could drift from what is in this repository.

The `@rolldown/binding-wasm32-wasi` entry in each example's
`optionalDependencies` is what lets that work. Vite 8 builds with rolldown,
which loads a native binding no browser sandbox can execute; rolldown ships a
WebAssembly fallback but stopped declaring it in 1.2.2, so nothing installs it
on its own. Drop the entry once rolldown declares it again.

## Routing

[`multi-page`](./multi-page) — the common case · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/multi-page?startScript=dev&file=src/lib/translations/index.ts)
- several routes, no locale in the URL
- `preferredLocale` reads a `lang` cookie; `Accept-Language` comes next
- one namespace per route, and a translated error page
- Arabic as a right-to-left locale: `dir` follows the locale
- `@sveltejs/adapter-node`

[`locale-param`](./locale-param) — the locale in the query string · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/locale-param?startScript=dev&file=src/lib/translations/index.ts)
- `/about?lang=cs`: `preferredLocale` reads the query, on the server before
  rendering
- internal links carry the locale; the default locale keeps the bare URL
- not the SEO option — a query parameter is the same page to a crawler
- `@sveltejs/adapter-node`

[`locale-router`](./locale-router) — the locale in the path, prerendered · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/locale-router?startScript=dev&file=src/lib/translations/index.ts)
- `/en/about`, `/cs/about`, `/de/about`: `preferredLocale` reads the path
- `entries()` for what the crawler cannot discover on its own
- `@sveltejs/adapter-node`, everything prerendered

[`locale-router-static`](./locale-router-static) — the same, with no server · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/locale-router-static?startScript=dev&file=src/lib/translations/index.ts)
- one HTML file per page per locale
- an unknown URL is the host's 404, not the app's
- `@sveltejs/adapter-static`

[`locale-router-advanced`](./locale-router-advanced) — the default locale has no prefix · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/locale-router-advanced?startScript=dev&file=src/lib/translations/index.ts)
- `/about` is English, `/cs/about` is Czech, whatever the browser asks for
- a `404.html` fallback shell, so the error page is **yours** and arrives
  translated on the first hit
- the routing the [documentation site](https://sveltekit-i18n.github.io/)
  itself uses
- `@sveltejs/adapter-static`

## Component-scoped translations

[`component-scoped-csr`](./component-scoped-csr) · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/component-scoped-csr?startScript=dev&file=src/lib/translations/index.ts)
- a component with its own instance and its own lexicon, loaded in the browser
- not in the server-rendered HTML — the trade-off, shown deliberately

[`component-scoped-ssr`](./component-scoped-ssr) · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/component-scoped-ssr?startScript=dev&file=src/lib/translations/index.ts)
- the same component, loaded by the page and handed down as a
  `snapshot({ records: true })` its instance applies with `hydrate()`
- complete on the first render, still reactive afterwards

## Content

[`mdsvex`](./mdsvex) · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/mdsvex?startScript=dev&file=src/lib/translations/index.ts)
- a `.svx` route: `t()` in Markdown, route-scoped loading, prerendered per locale

## Extensions

[`stores`](./stores) — the `$t` store surface · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/stores?startScript=dev&file=src/lib/translations/index.ts)
- [`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores)
  in the config handed to `defineI18n()`: `use()` and `get()` hand out `$t`,
  `$l`, `$locale` and `$loading`
- a language switcher bound to `$locale`, the way v2 wrote it
- one page, `@sveltejs/adapter-node`

[`typed-access`](./typed-access) — keys as members of `t` · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/typed-access?startScript=dev&file=src/lib/translations/index.ts)
- [`@sveltekit-i18n/extension-typed-access`](https://www.npmjs.com/package/@sveltekit-i18n/extension-typed-access)
  in the config handed to `defineI18n()`: `t.home.title()` beside
  `t('home.title')`, typed from the generated schema
- a typed payload, `t.home.counter.text({ count })`
- one page, `@sveltejs/adapter-node`

[`html`](./html) — markup in a message, rendered as elements · [run it](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/html?startScript=dev&file=src/lib/translations/index.ts)
- [`@sveltekit-i18n/extension-html`](https://github.com/sveltekit-i18n/extensions/tree/extension-html@3.0.0/extension-html)
  in the config handed to `defineI18n()`: `<i18n.T key="…" />` renders the
  markup, `t()` still returns it as text
- an escaped payload, a tag rendered as a component, block elements per usage,
  and what is dropped and reported
- one page, `@sveltejs/adapter-node`

## How to use an example

Copy the directory out of this repository and install:

```bash
npm install          # or pnpm install, yarn, …
npm run dev -- --open
```

Inside this repository the examples resolve `sveltekit-i18n` through the
workspace, so they always build against the current source. On their own they
resolve the published package.

## In CI

Every example is built on each change under `examples/**`, and the build output
is checked for a known translated string. An exit code proves nothing here: a
page that renders without its translations still builds.
