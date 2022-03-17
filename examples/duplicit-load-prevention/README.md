# Duplicit load prevention
This app is based on `multi-page` solution, but uses SvelteKit's `fetch` method to prevent duplicit (server and client) translation load on app enter. It's useful, when you are fetching your translations from remote API, or using other data-expensive solution.

__Note you should secure your `/addTranslations` endpoint to prevent external requests which can modify your app translations (see https://github.com/sveltekit-i18n/lib/issues/44).__
