# Examples

These examples demonstrate how to integrate `sveltekit-i18n` into your app. Currently, these setups are present:

`single-load`
- loads all translations for all language mutations during `i18n` initialization
- usually this is not what you are looking for, but it can be handy if you need all your translations in place.

`one-page`
- this approach is useful for one-page apps
- translations are loaded dynamically according to locale

`multi-page`
- this is the most frequent use-case – application with multiple routes
- translations are loaded not only according to locale, but given routes as well

`duplicit-load-prevention`
- this app is based on `multi-page` solution, but uses SvelteKit's `fetch` method to prevent duplicit (server and client) translation load on app enter
- it's useful, when you are fetching your translations from remote API, or using other data-expensive solution

`component-scoped`
- this is the most complex approach, which allows you to scope your translations to components, so they can have their own lexicons
- app translations are loaded the same way as for `multi-page` (SSR)
- component's translations are loaded in component promise (CSR - SvelteKit does not provide server side load method for components, so translation loaders are triggered on client side only)

`fallback-locale`
- this app demonstrates `config.fallbackLocale`

`locale-router-static`
- this `multi-page` app demonstrates locale-based routing (e.g. `https://example.com/en/about`)
- this approach is great if you care about SEO
- optimized for `@sveltejs/adapter-static`

`locale-router`
- this `multi-page` app demonstrates locale-based routing (e.g. `https://example.com/en/about`)
- this approach is great if you care about SEO
- optimized for non-static adapters (e.g. `@sveltejs/adapter-node`)

## Parsers examples
`parser-default`
- this app demonstrates features of the [@sveltekit-i18n/parser-default](https://github.com/sveltekit-i18n/parsers/blob/master/parser-default)

## How to

- clone or download example you want to use
- navigate to downloaded folder using Terminal (`cd ./your/example/destination/`)
- run `npm i sveltekit-i18n@latest` to fetch this dependecy from NPM and install all other dependencies
- run `npm run dev -- --open` to preview
