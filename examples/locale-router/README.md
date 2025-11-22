# Locale-router
This app shows how to integrate locale routing using dynamic adapters (e.g. `@sveltejs/adapter-node`). It includes two pages and three language mutations (`en`, `de`, `cs`). Error pages are included as well.

## How to use this example

- Download this example
- Run `npm i` to install all dependencies (or `pnpm i`, `yarn`, etc.)
- Run `npm run dev -- --open` to preview (or `pnpm run dev -- --open`, `yarn dev --open`, etc.)

## Setup

### `./src/hooks.server.js`
Takes care about redirects to appropriate language mutation.