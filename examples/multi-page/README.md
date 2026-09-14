# Multi-page app
In this app, translations are loaded dynamically according to user navigation and `$locale` change. It has built-in mechanism to prevent duplicit (server and client) translation load on app enter. It's useful, when you are fetching your translations from remote API, or using other data-expensive solution.

## How to use this example

- Download this example
- Run `npm i` to install all dependencies (or `pnpm i`, `yarn`, etc.)
- Run `npm run dev -- --open` to preview (or `pnpm run dev -- --open`, `yarn dev --open`, etc.)