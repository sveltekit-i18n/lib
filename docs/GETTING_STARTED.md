# Getting Started with sveltekit-i18n

This guide walks a SvelteKit app from nothing to a working multilingual site:
translation files, the SvelteKit wiring, server-side rendering, a language
switcher, route-scoped loading and generated types. Everything here is 3.3.

## Table of Contents

- [Requirements](#requirements)
- [Installation](#installation)
- [Basic Concepts](#basic-concepts)
- [Your First Multilingual App](#your-first-multilingual-app)
- [Route-based Loading](#route-based-loading)
- [Switching Locales](#switching-locales)
- [Locale-based Routing](#locale-based-routing)
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
whole API, its SvelteKit wiring (`sveltekit-i18n/kit`), its helpers
(`sveltekit-i18n/utils`), the parser's types and its build-time
`extractParamsFactory` and `cst` are re-exported here. **Do not install them
alongside** — an app that depends on them directly ends up with two copies of
the core and two reactive graphs.

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
`locale`, a `namespace`, an async `loader` function and optionally `routes`.
`locale` and `namespace` may be lists: the loader is then called once per
locale and namespace pair, with the pair in its props. A loader runs lazily,
only when the current route matches its `routes`, and at most once per
freshness window and route params.

### Namespaces

A loader's `namespace` is a prefix for everything that loader returns
(`common`, `home`, `about`). Namespaces are what make lazy loading possible:
one per page, plus a shared one for navigation and errors. A namespace must not
contain dots. (3.0 called it `key`; that spelling still works and logs a
deprecation warning.)

### The instance

Everything lives on one reactive object:

| Member | What it is |
| --- | --- |
| `t(key, payload?, props?)` | translates for the active locale |
| `l(locale, key, payload?, props?)` | translates for a locale the call names |
| `locale` | the active locale; assigning it is a fire-and-forget `setLocale()` |
| `locales` | the locales the config knows |
| `loading` | `true` while any activating load is in flight |
| `initialized` | `true` once a locale and a route are set and translations are present |
| `translations` / `rawTranslations` | the tables, after and before preprocessing |
| `loadTranslations`, `loadNamespace`, `setLocale`, `setRoute` | return the promise of the matching load |
| `loadConfig` | returns the promise of the config load |
| `addTranslations`, `invalidate`, `snapshot`, `hydrate`, `destroy` | synchronous |

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

We will build an English/Czech app that renders the visitor's language on the
server, hands its state to the browser, and switches language without a
reload. `sveltekit-i18n/kit` does the wiring: one instance per request on the
server, one per tab in the browser.

### Step 1: Create translation files

```
src/lib/
├── i18n.js
└── translations/
    ├── en/
    │   └── common.json
    └── cs/
        └── common.json
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

### Step 2: Define the config and wire it

```javascript
// src/lib/i18n.js
import { defineI18n } from 'sveltekit-i18n/kit';

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
      locale: ['en', 'cs'],
      namespace: 'common',
      loader: async ({ locale, namespace }) => (await import(`./translations/${locale}/${namespace}.json`)).default,
    },
  ],
};

export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
```

**Why no instance here?** A module that creates an instance is evaluated
**once per process** on the server, not once per request, so a module-level
instance would be shared by every visitor rendered at the same time — one
visitor's language would end up in another visitor's HTML. `defineI18n` builds
an instance per request on the server and one per tab in the browser; the
module exports the config and the four functions that do that.

**Which locale.** Each request takes the first of these that matches a locale
the config serves: `preferredLocale(event)` (here the `lang` cookie the
switcher below writes), the `Accept-Language` header, `initLocale`,
`fallbackLocale`, then the first locale the config serves. A visitor asking for
`en-GB` gets `en`.

There is **no `parser` slot**: this package fills it with the Curly Message
Format parser. Its options live under
[`parserOptions`](#parser-options).

### Step 3: Hook the server

```javascript
// src/hooks.server.js
export { handle } from '$lib/i18n';
```

```html
<!-- src/app.html -->
<html lang="%lang%" dir="%dir%">
```

`handle` fills `%lang%` with the negotiated locale and `%dir%` with its
direction (`ltr` or `rtl`), in the `<html>` tag.

### Step 4: Load in the root layout

```javascript
// src/routes/+layout.server.js
export { load } from '$lib/i18n';
```

```javascript
// src/routes/+layout.js
export { load } from '$lib/i18n';
```

One `load` serves both files. On the server it negotiates the locale, loads it
for the route into a fresh instance and returns that instance's state. The
universal half builds the instance the app renders with from that state, so
the loaders the server ran do not run again in the browser, and returns it as
`data.i18n`.

### Step 5: Provide the instance

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { use } from '$lib/i18n';
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';

  let { data, children } = $props();

  use(() => data);
</script>

<header>
  <LanguageSwitcher />
</header>

{@render children()}
```

`use()` provides the instance to every component below, switches the locale
and follows the route as each navigation commits, and keeps
`<html lang>` and `dir` in sync. Call it once, here.

The children render unconditionally: [Step 4](#step-4-load-in-the-root-layout)
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

### Step 6: Use translations in components

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { get } from '$lib/i18n';

  const i18n = get();

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

`get()` returns the instance `use()` provided, in any component below the root
layout — the error page included. `t()` reads the reactive translation table
and the reactive locale, so the rendered text updates when either changes — no
subscription, no `$` prefix. Translate in markup, not in `load`: a string built
in `load` stays in the locale of that pass.

### Step 7: Run it

```bash
npm run dev
```

Visit `http://localhost:5173`. View the page source: the translated text and
`<html lang>` are in the HTML the server sent, not filled in afterwards.

## Route-based Loading

For anything larger than one page, load a namespace only where it is used.

### Add page-specific translations

```
src/lib/translations/
├── en/
│   ├── common.json
│   ├── home.json
│   └── about.json
└── cs/
    ├── common.json
    ├── home.json
    └── about.json
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
// src/lib/i18n.js
const fromFile = async ({ locale, namespace }) => (await import(`./translations/${locale}/${namespace}.json`)).default;

export const config = {
  fallbackLocale: 'en',
  translations: {
    en: { 'lang.en': 'English', 'lang.cs': 'Czech' },
    cs: { 'lang.en': 'Angličtina', 'lang.cs': 'Čeština' },
  },
  loaders: [
    // No `routes` → loaded on every page
    { locale: ['en', 'cs'], namespace: 'common', loader: fromFile },

    // Homepage only
    { locale: ['en', 'cs'], namespace: 'home', routes: ['/'], loader: fromFile },

    // About page only
    { locale: ['en', 'cs'], namespace: 'about', routes: ['/about'], loader: fromFile },
  ],
};
```

`routes` entries may be exact strings, regular expressions (`[/^\/products/]`)
or anything with a `test(route)` method. The wiring hands every navigation's
`url.pathname` to the instance, so nothing else has to change.

```svelte
<!-- src/routes/about/+page.svelte -->
<script>
  import { get } from '$lib/i18n';

  const i18n = get();
</script>

<h1>{i18n.t('about.title')}</h1>
<p>{i18n.t('about.content')}</p>
```

**A namespace may be split.** Each loader is recorded on its own, so several
loaders can fill one namespace from different routes — each part loads where
its route matches and merges into what the others delivered.

**Route params.** A named capture group in a route `RegExp` reaches the loader
as `params`, and the loader runs again when the params change, replacing what
it delivered for the previous ones:

```javascript
import { PUBLIC_API_ORIGIN } from '$env/static/public';

{
  locale: ['en', 'cs'],
  namespace: 'article',
  routes: [/^\/article\/(?<slug>[^/]+)/],
  loader: async ({ locale, params }) => (await fetch(`${PUBLIC_API_ORIGIN}/api/articles/${params.slug}/i18n/${locale}`)).json(),
}
```

A loader runs on the server too, where `fetch` takes only an absolute URL
(the core hands a loader no `fetch` of its own), so build the URL from an
origin, as `PUBLIC_API_ORIGIN` does here, or back the loader with a remote
`query`.

A loader receives `{ locale, namespace, route, params }`. `route` is context,
not a cache key: a loader runs once per freshness window and route params, so
data that varies by route belongs in a param or in `routes`.

## Switching Locales

```svelte
<!-- src/lib/components/LanguageSwitcher.svelte -->
<script>
  import { get } from '$lib/i18n';

  const i18n = get();

  const switchTo = (next) => {
    document.cookie = `lang=${next}; path=/; max-age=31536000; samesite=lax`;
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

**The server's answer rules.** A switch in the browser stands across
navigations until the server answers differently. The cookie is what
`preferredLocale` reads, so the server's next answer is the new locale: the
choice survives a reload, and the server renders it directly. Without the
cookie, the switch lasts until a reload.

**What happens on a click:**

1. The cookie is written, and `i18n.locale = next` starts the load.
2. Missing namespaces for the new locale are fetched; ones already held are not.
3. `loading` is `true` while that runs.
4. `locale` advances, every `t()` and `l()` read re-renders, and `use()`
   updates `<html lang>` and `dir`.

To know when the switch finished, await it instead:

```javascript
await i18n.setLocale('cs');
```

## Locale-based Routing

For `/en/about` and `/cs/about`, put the routes under a `[lang]` parameter and
let `preferredLocale` read it:

```
src/routes/
├── +layout.js
├── +layout.server.js
├── +layout.svelte
└── [lang]/
    ├── +page.svelte
    └── about/
        └── +page.svelte
```

```javascript
// src/lib/i18n.js
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.params.lang,
});
```

The locale then comes from the URL — which is also what a prerendered page
needs, since it has no visitor to read a cookie from. A link to another
locale's URL switches the tab when the navigation commits. Loader `routes` see
the locale segment, since they match `url.pathname`: scope them with a pattern
such as `/^\/[^/]+\/about$/`.

## Placeholders and Modifiers

Messages use the [Curly Message Format](https://curlymessage.dev).

```json
{
  "greeting": "Hello, {{name}}!",
  "welcome": "Welcome, {{name; default:Guest;}}!",
  "items": "You have {{count}} {{count:plural; one:item; other:items;}}.",
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
modifiers are `number`, `date`, `ago` and `currency`, the plural selections
`plural` and `ordinal`, which select by the locale's CLDR plural categories, and
the comparisons `eq`, `ne`, `lt`, `lte`, `gt` and `gte`. The full syntax is in the
[parser's README](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly).

### Parser options

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

Two more options govern how a payload's values are read —
[`recognizeWrappers`](./README.md#parseroptionsrecognizewrappers) and
[`onSuspectValue`](./README.md#parseroptionsonsuspectvalue). All five are in
the [reference](./README.md#parser-options).

## TypeScript

The config type is exported as `Config`:

```typescript
import { type Config } from 'sveltekit-i18n';
import { defineI18n } from 'sveltekit-i18n/kit';

export const config = { loaders: [/* … */] } as const satisfies Config;

export const { handle, load, use, get } = defineI18n(config);
```

`satisfies` checks the config, and `as const` keeps its locales as literals:
`satisfies Config` alone widens them to `string`, since `Config` types a locale
as a `string`. Annotating it instead (`const config: Config = …`) makes the
annotation, not the literal, the type `defineI18n` sees. Either way costs the
locale completion the literal would have given `setLocale()`, `l()`,
`invalidate()` and `locale`; passing the literal straight to `defineI18n`
keeps it too. The completion is a
hint, never a constraint: a locale can arrive from a URL, a cookie or an
`Accept-Language` header, so any string still compiles.

### Typing keys and payloads with `schema`

A schema maps each key to the payload its message expects. Register it once
for the app — a global script filling the global `SvelteKitI18n.Register`
interface — and every instance whose config states no `schema` is typed by it:
`get()`, `use()` and `data.i18n` from `defineI18n(config)`, and
`new I18n(config)`. [typegen](#generating-the-schema) writes that file for you;
by hand, it is:

```typescript
// src/i18n-schema.d.ts — a global script: no top-level import or export
interface TranslationSchema {
  'common.greeting': { name: string };
  'common.nav.home': never;
}

declare namespace SvelteKitI18n {
  interface Register {
    schema: TranslationSchema;
  }
}
```

```typescript
export const { handle, load, use, get } = defineI18n(config);

const i18n = get();

i18n.t('common.greeting', { name: 'Alice' }); // ok
i18n.t('common.nav.home');                    // ok — takes no payload
i18n.t('common.greting', { name: 'Alice' });  // Error: not a key of the schema
i18n.t('common.greeting', {});                // Error: `name` is required
```

The registry needs `sveltekit-i18n` 3.1 or newer; an older core ignores it
without a diagnostic. A config may instead state its own `schema`, which wins
over the registry. Only the schema's **type** is read, which is why `{} as …`
is the idiom:

```typescript
defineI18n({ ...config, schema: {} as TranslationSchema });
```

A schema whose keys are not a closed set (`Record<string, …>`, or no keys at
all) degrades to plain `string` keys rather than rejecting every call, so
`schema: {}` opts an instance out of the registry where the constructor infers
the config's type (a type argument decides on its own) — for a second instance
with a catalogue of its own, a test, a story. The registry covers the whole
program, so only the app registers: a library never does.

### Generating the schema

Writing the schema by hand does not scale.
[`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen) is a
Vite plugin that writes it from your translations:

```bash
npm install -D @sveltekit-i18n/typegen
```

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { typegen } from '@sveltekit-i18n/typegen';

export default {
  plugins: [
    sveltekit(),
    typegen({
      config: 'src/lib/i18n.js',
      extractParams: { from: 'sveltekit-i18n' },
    }),
  ],
};
```

It evaluates `src/lib/i18n.js` the way `vite dev` would, reads its `config`
export, runs the loaders, and writes `src/i18n-schema.d.ts` on `vite build` and
whenever a translation changes under `vite dev`. The payloads come from this
package's `extractParamsFactory`, which `extractParams: { from: 'sveltekit-i18n' }`
points at. The file declares a global `TranslationSchema` and registers it, so the config module needs nothing more:

```javascript
// src/lib/i18n.js
// @ts-check
import { defineI18n } from 'sveltekit-i18n/kit';

export const config = {/* as in Step 2 */};

export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
```

sveltekit-i18n 3.0 has neither `/kit` nor the registry: there point the slot
of the config handed to `new I18n()` at it, `schema: /** @type {TranslationSchema} */ ({})`,
in TypeScript `schema: {} as TranslationSchema`.
JavaScript files need `// @ts-check` (or `checkJs`) for the types to be
checked at all. Add `src/i18n-schema.d.ts` to
`.gitignore`: it is reproducible from your translations. The file does not
exist until Vite first runs the plugin: `vite dev` or `vite build` writes an
empty placeholder first, under which `t()` takes plain strings, then the
generated schema. A type check that runs before any Vite run — a fresh clone,
or CI running only `svelte-kit sync && svelte-check` — sees no schema: keys
are plain strings, and a config that casts to `TranslationSchema` fails on the
missing name. Run `vite build` first.

### One payload type for every message

State it through the type arguments — annotating the config variable does not:

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

type Payload = { name: string };

const config: Config<Payload> = { loaders: [/* … */] };

export const i18n = new I18n<Config<Payload>, Payload>(config);
```

This is for an app without a registered schema: `Config<Payload>` leaves the
schema slot `any`, so a registered schema types the instance instead. See the
[opt-out](./README.md#one-payload-type-for-every-message).

### `instanceof` does not hold

`new I18n(config)` returns the **core's** instance (and `config.extensions` may
replace it again), so `i18n instanceof I18n` is `false`. Test for a member you
use instead. This is documented, not fixed.

## Testing Components That Translate

A real instance is cheap and synchronous: `translations` are available before
any loader runs, so a test needs no loader, no `await` and no mock.

```javascript
import { I18n } from 'sveltekit-i18n';

const i18n = new I18n({
  initLocale: 'en',
  translations: { en: { 'common.greeting': 'Hello, {{name}}!' } },
});

i18n.t('common.greeting', { name: 'Alice' }); // → "Hello, Alice!"
```

A component that reads the instance through `get()` finds it where `use()` put
it, which a test renders without. Hand it a real instance by mocking your
module's `get`:

```javascript
import { render } from '@testing-library/svelte';
import { vi } from 'vitest';
import Greeting from '$lib/components/Greeting.svelte';

vi.mock('$lib/i18n', async () => {
  const { I18n } = await import('sveltekit-i18n');
  const i18n = new I18n({
    initLocale: 'en',
    translations: { en: { 'common.greeting': 'Hello, {{name}}!' } },
  });

  return { get: () => i18n };
});

render(Greeting);
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

- **What `/kit` does, and its pitfalls** – prerendering, caching negotiated
  responses, combining `handle` and `load` with your own:
  [SvelteKit](./README.md#sveltekit).
- **Loading translations from an API or a CMS** – a loader is just an async
  function; pair a finite `cache` (or `invalidate()`) with a source that changes
  while the app runs, or set `cache: false` on a loader whose source caches on
  its own.
- **Namespaces on demand** – `loadNamespace('editor')` loads one namespace for
  a modal or a panel, whatever the route.
- **An app under a base path** – set `config.basePath` to `kit.paths.base`.
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

1. **Export the config, let `/kit` build the instances.** One per request on
   the server, one per tab in the browser, reached through `get()`.
2. **Start with one namespace** (`common`) and split by route when it grows.
3. **Await the load methods** instead of polling `loading` —
   `loadTranslations`, `loadNamespace`, `setLocale` and `setRoute` each return
   the promise of the matching load.
4. **Consistent keys** – dot notation, clear naming (`page.section.item`).

## Need Help?

- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** – common issues
- **[GitHub Issues](https://github.com/sveltekit-i18n/lib/issues)** – report bugs or ask questions
- **[Examples](../examples)** – nine standalone applications on v3

Happy translating! 🌍
