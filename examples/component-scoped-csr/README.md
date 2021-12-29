# Component-scoped app
This app includes multiple instances of `sveltekit-i18n`.

- app translations are loaded using SSR
- component's translations are loaded in component promise (CSR - SvelteKit does not provide server side load method for components, so translation loaders are triggered on client side only)

This approach is good for more complex apps.
