[![Netlify Status](https://api.netlify.com/api/v1/badges/c5bbe5c2-c9b9-4175-aa68-fd4aec778589/deploy-status)](https://app.netlify.com/sites/multi-page-example/deploys)

# Multi-page app
In this app, translations are loaded dynamically according to user navigation and `$locale` change. It has built-in mechanism to prevent duplicit (server and client) translation load on app enter. It's useful, when you are fetching your translations from remote API, or using other data-expensive solution.

## Preview
You can view this demo live on [Netlify](https://multi-page-example.netlify.app).

## How to use this example

- Download this example
- Run `npm i` to install all dependencies (or `pnpm i`, `yarn`, etc.)
- Run `npm run dev -- --open` to preview (or `pnpm run dev -- --open`, `yarn dev --open`, etc.)