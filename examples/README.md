# Examples

Each directory is a standalone SvelteKit application on `sveltekit-i18n` 3.x.
They cover the **application-shaped** decisions — an adapter, a
`svelte.config.js`, a `hooks.server.js`, a route tree — the things that are hard
to get right from a snippet.

Everything that is really three lines of configuration lives on the
[playground](https://sveltekit-i18n.github.io/playground) instead, where a real
instance answers as you change it: message formats (`parser-curly`,
`parser-icu`), `config.preprocess`, `config.loaders` matching and freshness, and
`config.fallbackLocale`.

## Routing

[`multi-page`](./multi-page) — the common case
- several routes, no locale in the URL
- the locale is negotiated per request from a cookie, then `Accept-Language`
- one namespace per route, and a translated error page
- `@sveltejs/adapter-node`

[`locale-param`](./locale-param) — the locale in the query string
- `/about?lang=cs`, resolved on the server before rendering
- internal links carry the locale; the default locale keeps the bare URL
- not the SEO option — a query parameter is the same page to a crawler
- `@sveltejs/adapter-node`

[`locale-router`](./locale-router) — the locale in the path, prerendered
- `/en/about`, `/cs/about`, `/de/about`
- `entries()` for what the crawler cannot discover on its own
- `@sveltejs/adapter-node`, everything prerendered

[`locale-router-static`](./locale-router-static) — the same, with no server
- one HTML file per page per locale
- an unknown URL is the host's 404, not the app's
- `@sveltejs/adapter-static`

[`locale-router-advanced`](./locale-router-advanced) — the default locale has no prefix
- `/about` is English, `/cs/about` is Czech
- a `404.html` fallback shell, so the error page is **yours** and arrives
  translated on the first hit
- the configuration the [documentation site](https://sveltekit-i18n.github.io/)
  itself runs on
- `@sveltejs/adapter-static`

## Component-scoped translations

[`component-scoped-csr`](./component-scoped-csr)
- a component with its own instance and its own lexicon, loaded in the browser
- not in the server-rendered HTML — the trade-off, shown deliberately

[`component-scoped-ssr`](./component-scoped-ssr)
- the same component, loaded by the page and handed down through `snapshot()`
- complete on the first render, still reactive afterwards

## Content

[`mdsvex`](./mdsvex)
- a `.svx` route: `t()` in Markdown, route-scoped loading, prerendered per locale

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
is checked for a known translated string. An exit code proves nothing here: once
`handleError` returns a well-formed error, a prerender writes an error page for
every route and still succeeds.
