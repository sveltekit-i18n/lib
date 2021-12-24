# Examples

These examples demonstrate how integrate `sveltekit-i18n` into your app. Currently these setups are present:

`single-load`
- loads all translations for all language mutations during `i18n` initialization
- usually this is not what you are looking for, but it can be handy if you need all your translations in place.

`one-page`
- this approach is useful for one-page apps
- translations are loaded dynamically according to locale

`multi-page`
- this is the most frequent use-case – application with multiple routes
- translations are loaded not only according to locale, but given routes as well

`component-scoped`
- this is the most complex approach, which allows you to scope your translations to components, so they can have their own lexicons
- app translations are loaded the same way as for `multi-page` (SSR)
- component's translations are loaded on component mount (CSR only - Svelte does not provide server side `load` method for components, so translation loaders are triggered asynchronously within `onMount` function)


## How to

- clone or download example you want to use
- run `npm i sveltekit-i18n@latest` to fetch this dependecy from NPM
- run `npm i` to install all other dependencies
- run `npm run dev -- --open`
