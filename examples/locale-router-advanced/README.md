[![Netlify Status](https://api.netlify.com/api/v1/badges/bcefda87-9dad-4c73-bf5f-d9b4c03cac9c/deploy-status)](https://locale-router-advanced.netlify.app)

# Locale-router-advanced
This app shows how to integrate locale routing using dynamic adapters (e.g. `@sveltejs/adapter-node`). It includes two pages and three language mutations (`en`, `de`, `cs`). Error pages are included as well. The default language (`en`) has no lang prefix in URL path.

## Preview
You can view this demo live on [Netlify](https://locale-router-advanced.netlify.app).

## Noticeable files

### `./src/hooks.server.js`
Takes care about redirects to appropriate language mutation. It fetches pages with the default language mutation on background, and serves it to the client with no lang prefix in the URL path.

### `./src/params/locale.js` (`./src/routes/[...lang=locale]`)
Allows to pass only pages starting with locale or having no `path` (dafault lang index).