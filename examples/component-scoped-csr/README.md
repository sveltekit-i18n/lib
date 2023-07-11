[![Netlify Status](https://api.netlify.com/api/v1/badges/7e679fc0-9808-4677-be27-fdeccdd6449f/deploy-status)](https://app.netlify.com/sites/component-scoped-csr/deploys)

# Component-scoped app
This app includes multiple instances of `sveltekit-i18n`.

- app translations are loaded using SSR
- component's translations are loaded in component promise (CSR - SvelteKit does not provide server side load method for components, so translation loaders are triggered on client side only)

This approach is good for more complex apps.

## Preview
You can view this demo live on [Netlify](https://compoent-scoped-csr.netlify.app).