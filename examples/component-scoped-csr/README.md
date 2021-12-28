# Component-scoped app
This app includes multiple instances of `sveltekit-i18n`.

- app translations are loaded using SSR
- component's translations are loaded on component mount (CSR only - Svelte does not provide server side load method for components, so translation loaders are triggered asynchronously within onMount function)

This approach is good for more complex apps.
