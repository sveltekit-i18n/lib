[![Netlify Status](https://api.netlify.com/api/v1/badges/7b79a988-ea49-40a0-bad9-842312b1c647/deploy-status)](https://app.netlify.com/sites/component-scoped-ssr/deploys)

# Component-scoped app (SSR)
This app includes multiple instances of `sveltekit-i18n`.

- SvelteKit does not provide server side load method for components.
- component's `load` in this example is replaced by exported init method. This method initializes related language mutation within parent page's `load` method.
- after the load, appropriate props are delegated back to the component instance.

This approach is good for more complex apps.

## Preview
You can view this demo live on [Netlify](https://component-scoped-ssr.netlify.app).