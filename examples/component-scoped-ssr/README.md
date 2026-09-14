# Component-scoped app (SSR)
This app includes multiple instances of `sveltekit-i18n`.

- SvelteKit does not provide server side load method for components.
- component's `load` in this example is replaced by exported init method. This method initializes related language mutation within parent page's `load` method.
- after the load, appropriate props are delegated back to the component instance.

This approach is good for more complex apps.

## How to use this example

- Download this example
- Run `npm i` to install all dependencies (or `pnpm i`, `yarn`, etc.)
- Run `npm run dev -- --open` to preview (or `pnpm run dev -- --open`, `yarn dev --open`, etc.)