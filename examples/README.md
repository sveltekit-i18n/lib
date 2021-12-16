# Examples

These examples demonstrates how integrate `sveltekit-i18n` into your app. Currently these setups are present:

`single-load`
- loads all translations for all language mutations during `i18n` initialization
- usually this is not what you are looking for, but it can be handy if you need all your translations in place.

`one-page`
- this approach is useful for one-page apps
- translations are loaded dynamically according to locale

`multi-page`
- this is the most frequent use-case – application with multiple routes
- translations are loaded not only according to locale, but given routes as well


## How to

- Clone or download example you want to use
- run `npm i sveltekit-i18n@latest` to fetch this dependecy from NPM
- run `npm i` to install all other dependencies
- run `npm run dev -- --open`