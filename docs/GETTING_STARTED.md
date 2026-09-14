# Getting Started with sveltekit-i18n

This guide walks a SvelteKit app from nothing to a working multilingual site:
translation files, one instance per request, server-side rendering, a language
switcher and route-scoped loading. Everything here is v3.

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Basic Concepts](#basic-concepts)
- [Your First Multilingual App](#your-first-multilingual-app)
- [Route-based Loading](#route-based-loading)
- [Switching Locales](#switching-locales)
- [Placeholders and Modifiers](#placeholders-and-modifiers)
- [TypeScript](#typescript)
- [Testing Components That Translate](#testing-components-that-translate)
- [Next Steps](#next-steps)

## Requirements

- **Svelte 5 or newer.** The instance is built on runes; there are no stores in
  it.
- **Node 22, Bun 1.2 or Deno 2, or newer.** The package imports no `node:`
  module, so every runtime that runs your SvelteKit build runs it.
- **ESM only.** There is no CommonJS entry.

The core ships its rune modules **uncompiled**, for the consumer's bundler to
compile. In a SvelteKit app that happens automatically. In a bare Vite or Vitest
setup, add `@sveltejs/vite-plugin-svelte` and make sure the package is not
externalized (in Vitest: `test.server.deps.inline`).

## Installation

```bash
npm install sveltekit-i18n
# bun add sveltekit-i18n
# deno add npm:sveltekit-i18n
```

That is the whole install. `@sveltekit-i18n/base` (the core) and
`@sveltekit-i18n/parser-curly` (the message parser) come with it: the core's
whole API, the parser's types and its parameter extractor are re-exported
here. **Do not install them
alongside** — an app that depends
on them directly ends up with two copies of the core and two reactive graphs.

## Basic Concepts

### Locales

A **locale** is a language identifier (`en`, `cs`, `de-DE`). Locale values are
normalized before they key anything, so `EN`, `en` and `en-us` do not become
separate entries — see
[`sanitizeLocales`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#sanitizelocales).

### Translation keys

Translations are nested objects, flattened to dot notation:

```json
{ "nav": { "home": "Home" } }
```

is read as `i18n.t('common.nav.home')` — the loader's namespace, then the path
inside the file.

### Loaders

A **loader** says how and when a chunk of translations is fetched. It names a
`locale`, a namespace `key`, an async `loader` function and optionally `routes`.
A loader runs at most once per locale (per freshness window), lazily, and only
when the current route matches its `routes`.

### Namespaces

The loader's `key` is the **namespace** — a prefix for everything that loader
returns (`common`, `home`, `about`). Namespaces are what make lazy loading
possible: one namespace per page, plus a shared one for navigation and errors.
Keys must not contain dots.

### The instance

Everything lives on one reactive object:

| Member | What it is |
| --- | --- |
| `t(key, payload?, props?)` | translates for the active locale |
| `l(locale, key, payload?, props?)` | translates for a locale the call names |
| `locale` | the active locale; assigning it is a fire-and-forget `setLocale()` |
| `locales` | the locales the config knows |
| `loading` | `true` while any load is in flight |
| `initialized` | `true` once a locale and a route are set and translations are present |
| `translations` / `rawTranslations` | the tables, after and before preprocessing |
| `loadTranslations`, `setLocale`, `setRoute` | return the promise of the matching load |
| `loadConfig` | returns the promise of the config load |
| `addTranslations`, `invalidate`, `snapshot`, `destroy` | synchronous |

Reading a property is reactive wherever reads are tracked — a component
template, `$derived`, `$effect`. There are no stores, no `$t`, no `.get()` and
no `.subscribe()`.

**Do not destructure value properties off the instance** — a destructured value
is a one-time snapshot. `t` and `l` are functions and stay reactive even when
destructured, because their tracked reads happen at call time. To read values as
locals in a component, destructure through `$derived`:

```svelte
<script>
  const { loading, locale } = $derived(i18n);
</script>
```

## Your First Multilingual App

We will build an English/Czech app that renders the right language on the
server, hands its data to the client, and switches language without a reload.

### Step 1: Create translation files

```
src/lib/translations/
├── en/
│   └── common.json
├── cs/
│   └── common.json
└── index.js
```

```json
// src/lib/translations/en/common.json
{
  "app.name": "My Application",
  "greeting": "Hello, {{name}}!",
  "nav.home": "Home",
  "nav.about": "About"
}
```

```json
// src/lib/translations/cs/common.json
{
  "app.name": "Moje Aplikace",
  "greeting": "Ahoj, {{name}}!",
  "nav.home": "Domů",
  "nav.about": "O nás"
}
```

### Step 2: Export the config, not an instance

```javascript
// src/lib/translations/index.js

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  fallbackLocale: 'en',
  // Available immediately, in every locale — the language switcher renders
  // each language in its own name from these.
  translations: {
    en: { 'lang.en': 'English', 'lang.cs': 'Czech' },
    cs: { 'lang.en': 'Angličtina', 'lang.cs': 'Čeština' },
  },
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    {
      locale: 'cs',
      key: 'common',
      loader: async () => (await import('./cs/common.json')).default,
    },
  ],
};
```

**Why the config and not the instance?** A module that creates an instance is
evaluated **once per process** on the server, not once per request. A
module-level instance is therefore shared by every visitor being rendered at the
same time: two requests for different languages overwrite each other's `locale`
and tables, and one visitor's language ends up in another visitor's HTML. The
config is inert data — each request builds its own instance from it.

There is **no `parser` slot**: this package fills it with the Curly Message
Format parser. Its options live under
[`parserOptions`](#parser-options-custom-modifiers-defaults-and-reports).

### Step 3: Resolve the visitor's locale

```javascript
// src/hooks.server.js
import { sanitizeLocales } from 'sveltekit-i18n/utils';

const supported = ['en', 'cs'];

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
  const [preferred = ''] = sanitizeLocales(
    event.cookies.get('locale')
      ?? event.request.headers.get('accept-language')?.split(',')[0],
  );

  const [language] = preferred.split('-');

  event.locals.locale = supported.includes(language) ? language : 'en';

  return resolve(event);
};
```

`sanitizeLocales` is the same normalization the instance applies, so a cookie
holding `EN` and one holding `en` end up at the same entry the tables are keyed
by. It canonicalizes spelling, not granularity: `en-us` becomes `en-US` and
stays region-tagged, so an `Accept-Language` header is matched here on its
language subtag — a list of bare `en` and `cs` would otherwise never see a
visitor sending `en-US` or `cs-CZ`. An app that ships region-specific
translations lists the region-tagged locales instead and drops the `split`.

### Step 4: Load on the server, one instance per request

```javascript
// src/routes/+layout.server.js
import { I18n } from 'sveltekit-i18n';
import { config } from '$lib/translations';

/** @type {import('./$types').LayoutServerLoad} */
export const load = async ({ url, locals }) => {
  const i18n = new I18n(config);

  await i18n.loadTranslations(locals.locale, url.pathname);

  return { locale: locals.locale, translations: i18n.snapshot() };
};
```

`snapshot()` serializes what the instance holds for the **active locale** and
the **`fallbackLocale`**, narrowed to the current route. It is shaped like
`config.translations`, so the client hydrates by handing it straight back to a
constructor.

An instance that outlives its work should be released with `destroy()`; after an
awaited `loadTranslations` this one has nothing left in flight, so the `load`
above does not need the call.

### Step 5: Build the instance the app renders with

```javascript
// src/routes/+layout.js
import { browser } from '$app/environment';
import { I18n } from 'sveltekit-i18n';
import { config } from '$lib/translations';

// Assigned in the browser only — on the server this module-level binding
// would be the shared state we are avoiding.
let client;

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ data, url }) => {
  // `data` is null when no route matched: the error page renders through this
  // load too, and on a static host that is every unknown URL.
  const i18n = client ?? new I18n({
    ...config,
    translations: { ...config.translations, ...data?.translations },
  });

  if (browser) client = i18n;

  await i18n.loadTranslations(data?.locale ?? config.fallbackLocale, url.pathname);

  return { i18n };
};
```

This `load` runs on the server for the SSR pass and again in the browser on
hydration. Both start from the server's snapshot, so the loaders behind it do
not run a second time; only what the snapshot left out — the namespaces of pages
the visitor has not opened yet — is fetched. Every later client-side navigation
reuses the same instance, so its cache survives.

The snapshot covers the active locale and the fallback, so the config's own
`translations` are merged underneath it: that keeps the language names of the
locales the visitor is *not* using, which the switcher renders.

### Step 6: Pass it down through context

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { setContext } from 'svelte';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

  let { data, children } = $props();

  setContext('i18n', data.i18n);
</script>

<header>
  <LanguageSwitcher />
</header>

{@render children()}
```

The children render unconditionally: [Step 4](#step-4-load-on-the-server-one-instance-per-request)
already awaited the load, so the markup the server sends is translated, and
gating the whole tree on `loading` would blank text that is already on the page
— on the first paint and again on every locale switch. Where a switch is worth
signalling, show the hint beside the content rather than instead of it:

```svelte
<header>
  <LanguageSwitcher />
  {#if data.i18n.loading}<span class="spinner" aria-live="polite"></span>{/if}
</header>
```

Context is what keeps a per-request instance per-request: nothing imports it, so
nothing can share it between visitors.

### Step 7: Use translations in components

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { getContext } from 'svelte';

  const i18n = getContext('i18n');

  const userName = 'World';
</script>

<h1>{i18n.t('common.app.name')}</h1>
<p>{i18n.t('common.greeting', { name: userName })}</p>
<p>Current locale: {i18n.locale}</p>

<nav>
  <a href="/">{i18n.t('common.nav.home')}</a>
  <a href="/about">{i18n.t('common.nav.about')}</a>
</nav>
```

`t()` reads the reactive translation table and the reactive locale, so the
rendered text updates when either changes — no subscription, no `$` prefix.

### Step 8: Run it

```bash
npm run dev
```

Visit `http://localhost:5173`. View the page source: the translated text is in
the HTML the server sent, not filled in afterwards.

## Route-based Loading

For anything larger than one page, load a namespace only where it is used.

### Add page-specific translations

```
src/lib/translations/
├── en/
│   ├── common.json
│   ├── home.json
│   └── about.json
├── cs/
│   ├── common.json
│   ├── home.json
│   └── about.json
└── index.js
```

```json
// src/lib/translations/en/home.json
{
  "title": "Welcome Home",
  "content": "This is the homepage content."
}
```

```json
// src/lib/translations/en/about.json
{
  "title": "About Us",
  "content": "Learn more about our company."
}
```

### Scope the loaders with `routes`

```javascript
// src/lib/translations/index.js

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  fallbackLocale: 'en',
  translations: {
    en: { 'lang.en': 'English', 'lang.cs': 'Czech' },
    cs: { 'lang.en': 'Angličtina', 'lang.cs': 'Čeština' },
  },
  loaders: [
    // No `routes` → loaded on every page
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    {
      locale: 'cs',
      key: 'common',
      loader: async () => (await import('./cs/common.json')).default,
    },

    // Homepage only
    {
      locale: 'en',
      key: 'home',
      routes: ['/'],
      loader: async () => (await import('./en/home.json')).default,
    },
    {
      locale: 'cs',
      key: 'home',
      routes: ['/'],
      loader: async () => (await import('./cs/home.json')).default,
    },

    // About page only
    {
      locale: 'en',
      key: 'about',
      routes: ['/about'],
      loader: async () => (await import('./en/about.json')).default,
    },
    {
      locale: 'cs',
      key: 'about',
      routes: ['/about'],
      loader: async () => (await import('./cs/about.json')).default,
    },
  ],
};
```

`routes` entries may be exact strings, regular expressions (`[/^\/products/]`)
or anything with a `test(route)` method. The wiring from
[Step 5](#step-5-build-the-instance-the-app-renders-with) already passes
`url.pathname` on every navigation, so nothing else has to change.

```svelte
<!-- src/routes/about/+page.svelte -->
<script>
  import { getContext } from 'svelte';

  const i18n = getContext('i18n');
</script>

<h1>{i18n.t('about.title')}</h1>
<p>{i18n.t('about.content')}</p>
```

**One namespace per route group.** A namespace is loaded once per locale: as
soon as one loader has supplied `common`, every other `common` loader is
skipped, including one whose `routes` never matched. Splitting a single
namespace across routes therefore loses the halves the visitor did not land on —
give each route group a key of its own, as above.

## Switching Locales

Assigning `locale` is a fire-and-forget `setLocale()`: the new language's
translations are fetched, and the property advances once they resolved, so the
UI never shows a locale whose text is not there yet.

```svelte
<!-- src/lib/components/LanguageSwitcher.svelte -->
<script>
  import { getContext } from 'svelte';

  const i18n = getContext('i18n');

  const switchTo = (next) => {
    document.cookie = `locale=${next}; path=/; max-age=31536000; samesite=lax`;
    i18n.locale = next;
  };
</script>

<div class="language-switcher">
  {#each i18n.locales as loc (loc)}
    <button onclick={() => switchTo(loc)} class:active={i18n.locale === loc}>
      {i18n.l(loc, `lang.${loc}`)}
    </button>
  {/each}
</div>

<style>
  .language-switcher {
    display: flex;
    gap: 0.5rem;
  }

  button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
  }

  button.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }
</style>
```

`l(locale, key)` translates for a locale the call names instead of the active
one — which is how each button reads in its own language: `l('cs', 'lang.cs')`
is `Čeština` even while the app is in English. (`t('lang.cs')` would give
`Czech`, the name in the active language.)

The cookie is what the [`handle` hook](#step-3-resolve-the-visitors-locale)
reads on the next full page load, so the choice survives a reload and the server
renders it directly.

**What happens on a click:**

1. The cookie is written, and `i18n.locale = next` starts the load.
2. Missing namespaces for the new locale are fetched; ones already held are not.
3. `loading` is `true` while that runs.
4. `locale` advances, and every `t()` and `l()` read re-renders.

To know when the switch finished, await it instead:

```javascript
await i18n.setLocale('cs');
```

## Placeholders and Modifiers

Messages use the [Curly Message Format](https://github.com/curly-message/spec).

```json
{
  "greeting": "Hello, {{name}}!",
  "welcome": "Welcome, {{name; default:Guest;}}!",
  "items": "You have {{count}} {{count; 1:item; default:items;}}.",
  "price": "Total: {{amount:currency;}}",
  "updated": "Updated {{time:ago;}}"
}
```

```javascript
i18n.t('common.greeting', { name: 'Alice' });                              // → "Hello, Alice!"
i18n.t('common.welcome', {});                                              // → "Welcome, Guest!"
i18n.t('common.items', { count: 1 });                                      // → "You have 1 item."
i18n.t('common.items', { count: 5 });                                      // → "You have 5 items."
i18n.t('common.price', { amount: 99.99 }, { currency: { currency: 'USD' } }); // → "Total: $99.99"
i18n.t('common.updated', { time: -3600000 });                              // → "Updated 1 hour ago"
```

The second argument is the **payload** (the values placeholders name), the third
the per-call **props** (formatting options, keyed by modifier name). Built-in
modifiers are `number`, `date`, `ago` and `currency`, plus the comparisons `eq`,
`ne`, `lt`, `lte`, `gt` and `gte`. The full syntax is in the
[parser's README](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly).

### Parser options: custom modifiers, defaults and reports

```javascript
/** @type {import('sveltekit-i18n').Config} */
export const config = {
  parserOptions: {
    // The bottom formatting layer; call props and payload wrappers layer over it.
    modifierDefaults: {
      number: { maximumFractionDigits: 2 },
      currency: { currency: 'USD' },
    },
    // Your own modifiers, over the built-in ones.
    customModifiers: {
      upper: ({ value }) => value.toUpperCase(),
    },
    // Where parser diagnostics go. Silent by default.
    onReport: (report) => console.warn(report.message, report),
  },
  loaders: [/* … */],
};
```

Reports never raise: a placeholder that cannot resolve takes its fallback and
the rest of the message renders. `onReport` is optional here and defaults to
`null` — nothing is written anywhere unless you pass a channel.

## TypeScript

The config type is exported as `Config`:

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

const config: Config = { loaders: [/* … */] };

export const i18n = new I18n(config);
```

Annotating the config **widens** it, which costs the locale completion a config
literal would have given `setLocale()`, `l()`, `invalidate()` and `locale`. Pass
the literal straight to the constructor where you want that — the locales a
config names then complete those members. The completion is a hint, never a
constraint: a locale can arrive from a URL, a cookie or an `Accept-Language`
header, so any string still compiles.

### Typing keys and payloads with `schema`

```typescript
import { I18n } from 'sveltekit-i18n';

export const i18n = new I18n({
  ...config,
  schema: {} as {
    'common.greeting': { name: string };
    'common.nav.home': never;
  },
});

i18n.t('common.greeting', { name: 'Alice' }); // ok
i18n.t('common.nav.home');                    // ok — takes no payload
i18n.t('common.greting', { name: 'Alice' });  // Error: not a key of the schema
i18n.t('common.greeting', {});                // Error: `name` is required
```

Only the schema's **type** is read, which is why `{} as …` is the idiom. A
schema whose keys are not a closed set (`Record<string, …>`, or no keys at all)
degrades to plain `string` keys rather than rejecting every call.

A schema **generator** is 3.1 work
([#234](https://github.com/sveltekit-i18n/lib/issues/234)); v3 ships the slot
and the piece a generator reads a catalogue with —
[`extractParamsFactory`](./README.md#extractparamsfactory) — not the generator
itself.

### One payload type for every message

State it through the type arguments — annotating the config variable does not:

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

type Payload = { name: string };

const config: Config<Payload> = { loaders: [/* … */] };

export const i18n = new I18n<Config<Payload>, Payload>(config);
```

### `instanceof` does not hold

`new I18n(config)` returns the **core's** instance (and `config.extensions` may
replace it again), so `i18n instanceof I18n` is `false`. Test for a member you
use instead. This is documented, not fixed.

## Testing Components That Translate

A real instance is cheap and synchronous: `translations` are available before
any loader runs, so a test needs no loader, no `await` and no mock.

```javascript
import { render } from '@testing-library/svelte';
import { I18n } from 'sveltekit-i18n';
import Greeting from '$lib/components/Greeting.svelte';

const i18n = new I18n({
  initLocale: 'en',
  translations: { en: { 'common.greeting': 'Hello, {{name}}!' } },
});

render(Greeting, { context: new Map([['i18n', i18n]]) });
```

Where a stub is enough, `t` is a plain function on a plain object:

```javascript
const i18n = { t: (key) => key, locale: 'en', locales: ['en'] };
```

Because each test builds its own instance, there is no state to reset between
cases — the same property that makes per-request instances right on the server.

## Next Steps

### 📚 Learn More

- **[API Documentation](./README.md)** – this package's reference
- **[Core API reference](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md)** – every shared member, in full
- **[Architecture Overview](./ARCHITECTURE.md)** – how everything works
- **[Best Practices](./BEST_PRACTICES.md)** – recommended patterns and organization
- **[Troubleshooting](./TROUBLESHOOTING.md)** – common issues and solutions

### 🔧 Where to go from here

- **Locale-based routing** – `/en/about`, `/cs/about`; resolve the locale from
  the route parameter in the `handle` hook instead of the cookie.
- **Loading translations from an API or a CMS** – a loader is just an async
  function; pair a finite `cache` (or `invalidate()`) with a source that changes
  while the app runs.
- **`preprocess`** – how loaded payloads are flattened (`'full'`,
  `'preserveArrays'`, `'none'`, or your own function).
- **Extensions** – `config.extensions` pipes the constructed instance through
  adapter functions, left to right, and `new I18n(config)` evaluates to the last
  one's output. The `$t` store form is one of them:
  [`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores).
- **A different message format** – this package fills the parser slot itself, so
  another format means building on
  [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) directly.

### 💡 Tips

1. **Export the config, build the instance.** One instance per request on the
   server, handed down through context.
2. **Start with one namespace** (`common`) and split by route when it grows.
3. **Await the load methods** instead of polling `loading` —
   `loadTranslations`, `setLocale` and `setRoute` each return the promise of
   the matching load.
4. **Consistent keys** – dot notation, clear naming (`page.section.item`).

## Need Help?

- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** – common issues
- **[GitHub Issues](https://github.com/sveltekit-i18n/lib/issues)** – report bugs or ask questions
- **[Examples](../examples)** – working code; the examples are being reworked for
  v3 in [#230](https://github.com/sveltekit-i18n/lib/issues/230)

Happy translating! 🌍
