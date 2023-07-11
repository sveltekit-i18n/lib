# Examples

These examples demonstrate how to integrate `sveltekit-i18n` into your app. Currently, these setups are present:

[`single-load`](./single-load) – [Demo](https://single-load.netlify.app)
- loads all translations for all language mutations during `i18n` initialization
- usually this is not what you are looking for, but it can be useful if you need all your translations in place.

[`one-page`](./one-page) – [Demo](https://one-page-example.netlify.app)
- this approach is useful for one-page apps
- translations are loaded dynamically according to locale

[`multi-page`](./multi-page) – [Demo](https://multi-page-example.netlify.app)
- this is the most frequent use-case – application with multiple routes
- translations are loaded not only according to the locale, but given routes as well
- it prevents duplicit (server and client) translation load on app enter

[`locale-router-static`](./locale-router-static) – [Demo](https://locale-router-static.netlify.app)
- this `multi-page` app demonstrates locale-based routing (e.g. `https://example.com/en/about`)
- this approach is great if you care about SEO
- optimized for `@sveltejs/adapter-static`

[`locale-router`](./locale-router) – [Demo](https://locale-router.netlify.app)
- this `multi-page` app demonstrates locale-based routing (e.g. `https://example.com/en/about`)
- this approach is great if you care about SEO
- optimized for non-static adapters (e.g. `@sveltejs/adapter-node`)

[`locale-router-advanced`](./locale-router-advanced) – [Demo](https://locale-router-advanced.netlify.app)
- this `multi-page` app demonstrates locale-based routing (e.g. `https://example.com/en/about`)
- this approach is great if you care about SEO
- optimized for non-static adapters (e.g. `@sveltejs/adapter-node`)
- default locale routes do not have any lang prefix in path

[`component-scoped-csr`](./component-scoped-csr) – [Demo](https://component-scoped-csr.netlify.app)
- this is the most complex approach, which allows you to scope your translations to components, so they can have their own lexicons
- app translations are loaded the same way as for `multi-page` (SSR)
- component's translations are loaded in component promise (CSR - SvelteKit does not provide server side load method for components, so translation loaders are triggered on client side only)

[`component-scoped-ssr`](./component-scoped-ssr) – [Demo](https://component-scoped-ssr.netlify.app)
- SvelteKit does not provide server side load method for components.
- component's `load` is replaced by exported init method. This method initializes related language mutation within parent page's `load` method.
- after the load, appropriate props are delegated back to the component instance.
### Parsers
[`parser-default`](./parser-default) – [Demo](https://parser-default.netlify.app)
- this app demonstrates features of the [@sveltekit-i18n/parser-default](https://github.com/sveltekit-i18n/parsers/blob/master/parser-default)

[`parser-icu`](./parser-icu) – [Demo](https://parser-icu.netlify.app)
- this app demonstrates features of the [@sveltekit-i18n/parser-icu](https://github.com/sveltekit-i18n/parsers/blob/master/parser-icu)

### Other
[`preprocess`](./preprocess) – [Demo](https://preprocess-example.netlify.app)
- this app demonstrates different `config.preprocess` configurations

[`fallback-locale`](./fallback-locale) – [Demo](https://fallback-locale.netlify.app)
- this app demonstrates `config.fallbackLocale`

## How to

- clone or download example you want to use
- navigate to downloaded folder using Terminal (`cd ./your/example/destination/`)
- run `npm i sveltekit-i18n@latest` to fetch this dependecy from NPM and install all other dependencies\
_(or `npm i @sveltekit-i18n/PACKAGE_NAME@latest` for parser examples - see related dependencies)_
- run `npm run dev -- --open` to preview
