# Examples

These examples demonstrate how to integrate `sveltekit-i18n` into your app. Each
one is a standalone SvelteKit application covering an **application-shaped**
decision — an adapter, a `svelte.config.js`, a `hooks.server.js`, a route tree.

Everything that is really three lines of configuration lives on the
[playground](https://sveltekit-i18n.github.io/playground) instead, where a real
instance responds as you change it: message formats (`parser-curly`,
`parser-icu`), `config.preprocess`, `config.loaders` matching and freshness, and
`config.fallbackLocale`.

Currently, these setups are present:

[`multi-page`](./multi-page)
- this is the most frequent use-case – application with multiple routes
- translations are loaded not only according to the locale, but given routes as well
- it prevents duplicit (server and client) translation load on app enter

[`locale-param`](./locale-param)
- this `multi-page` app demonstrates lang routing based on URL parameter (e.g. `https://example.com/?lang=en`)

[`locale-router-static`](./locale-router-static)
- this `multi-page` app demonstrates locale-based routing (e.g. `https://example.com/en/about`)
- this approach is great if you care about SEO
- optimized for `@sveltejs/adapter-static`

[`locale-router`](./locale-router)
- this `multi-page` app demonstrates locale-based routing (e.g. `https://example.com/en/about`)
- this approach is great if you care about SEO
- optimized for non-static adapters (e.g. `@sveltejs/adapter-node`)

[`locale-router-advanced`](./locale-router-advanced)
- this `multi-page` app demonstrates locale-based routing (e.g. `https://example.com/en/about`)
- this approach is great if you care about SEO
- optimized for non-static adapters (e.g. `@sveltejs/adapter-node`)
- default locale routes do not have any lang prefix in path

[`component-scoped-csr`](./component-scoped-csr)
- this is the most complex approach, which allows you to scope your translations to components, so they can have their own lexicons
- app translations are loaded the same way as for `multi-page` (SSR)
- component's translations are loaded in component promise (CSR - SvelteKit does not provide server side load method for components, so translation loaders are triggered on client side only)

[`component-scoped-ssr`](./component-scoped-ssr)
- SvelteKit does not provide server side load method for components.
- component's `load` is replaced by exported init method. This method initializes related language mutation within parent page's `load` method.
- after the load, appropriate props are delegated back to the component instance.
## How to use an example

- Clone or download the example you want to use
- Navigate to the downloaded folder using Terminal (e.g. `cd ./your/example/destination/`)
- Install dependencies using your preferred package manager:
  - `npm i sveltekit-i18n@latest`
  - `pnpm i sveltekit-i18n@latest`
  - `yarn add sveltekit-i18n@latest`
  - Or any other package manager you prefer
- Run the dev server to preview:
  - `npm run dev -- --open`
  - `pnpm run dev -- --open`
  - `yarn dev --open`
  - Or the equivalent command for your package manager
