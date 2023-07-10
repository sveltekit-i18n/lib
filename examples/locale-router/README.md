[![Netlify Status](https://api.netlify.com/api/v1/badges/474b5633-14d8-4e1b-846f-f122f2ad4c25/deploy-status)](https://locale-router.netlify.app)

# Locale-router
This app shows how to integrate locale routing using dynamic adapters (e.g. `@sveltejs/adapter-node`). It includes two pages and three language mutations (`en`, `de`, `cs`). Error pages are included as well.

## Preview
You can view this demo live on [Netlify](https://locale-router.netlify.app).

## Naticeable files

### `./src/hooks.server.js`
Takes care about redirects to appropriate language mutation.
