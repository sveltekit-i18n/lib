# Best Practices

This guide covers recommended patterns, conventions, and tips for using
`sveltekit-i18n` in production applications.

It assumes the v3 surface: one reactive instance, no stores, no `$` prefixes —
the tour is in [Getting Started](./GETTING_STARTED.md). Member-level detail
lives in the
[core reference](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md);
this document is about what to do with those members.

The snippets import from `src/lib` through `#lib`, the entry `sv create`
scaffolds in the `imports` field of a SvelteKit 3 app's `package.json`, and name
the file's extension, which TypeScript needs to resolve such an import. A
SvelteKit 2 app adds the same entry, `"imports": { "#lib/*": "./src/lib/*" }`,
or imports from `$lib` instead, without the extension — as it must on Vite 5
when a `.ts` file is imported from a `.js` module or a plain `<script>`.

## Table of Contents

- [Instance Ownership](#instance-ownership)
- [Awaiting Loads](#awaiting-loads)
- [SSR and CSR Considerations](#ssr-and-csr-considerations)
- [Translation File Organization](#translation-file-organization)
- [Key Naming Conventions](#key-naming-conventions)
- [Performance Optimization](#performance-optimization)
- [TypeScript Patterns](#typescript-patterns)
- [Extensions](#extensions)
- [Component-Scoped Translations](#component-scoped-translations)
- [Library Authors: Shipping Translations](#library-authors-shipping-translations)
- [Dynamic Routes and Locales](#dynamic-routes-and-locales)
- [Content Management](#content-management)
- [Testing](#testing)
- [Production Deployment](#production-deployment)

## Instance Ownership

An instance owns a locale and the tables loaded for it. Whoever holds the
instance shares that state, which makes **where it is created** the most
consequential decision in the whole setup.

**The rule:** one instance per request on the server, one instance per tab in
the browser. What modules export is the **config** — inert data — and the
functions [`sveltekit-i18n/kit`](./README.md#sveltekit) builds from it.

### The module-level singleton hazard

A module that constructs an instance is evaluated **once per process** on the
server, not once per request:

```javascript
// ❌ src/lib/i18n.js — shared by every concurrent request
import { I18n } from 'sveltekit-i18n';

export const i18n = new I18n(config);
```

Two visitors rendered at the same time overwrite each other's `locale` and
translation tables, and one visitor's language ends up in the other's HTML. The
failure is load-dependent: a single-user dev session never shows it.

```javascript
// ✅ src/lib/i18n.js — the config is inert data, the wiring builds instances
import { defineI18n } from 'sveltekit-i18n/kit';

export const config = {
  initLocale: 'en',
  loaders: [/* … */],
};

export const { handle, load, use, get } = defineI18n(config);
```

Each request builds its own instance from it, and components reach that
instance through `get()` — Svelte context under the hood — rather than through
an import of the instance. See
[SSR and CSR Considerations](#ssr-and-csr-considerations) for the wiring.

### When a singleton is enough

The shared-state problem exists only on the server. A module-level instance is
safe when the server renders nothing visitor-specific:

- the app is client-only (`export const ssr = false`), or
- every request renders the same locale, no loader's `routes` capture params
  (concurrent requests would compete for whose params are shown), and no loader
  throws a `redirect()` or an `error()` that depends on the visitor —
  concurrent requests share a load, so every one of them would reject with it.

In the browser, a singleton's root `load` runs for a preload too — the page a
hovered link leads to. Load it as steps 3 and 4 of the
[manual recipe](./README.md#3-build-the-instance-the-application-renders-with)
do, so a hovered link does not switch it: the first pass calls
`loadTranslations()`, every later one `preload()`, and the root layout commits
the navigation. A module-level flag the first pass sets in the browser only
(`let started = false`) tells that pass apart, as `client` does in step 3.

Everything else — including "we will add a second language later" — wants the
per-request wiring from the start. Retrofitting it means touching every module
that imported the instance.

### Do not destructure value properties

A destructured value is a one-time snapshot; the property read is what is
reactive.

```svelte
<script>
  // ❌ frozen at the moment of destructuring
  const { locale, loading } = get();
</script>
```

```svelte
<script>
  import { get } from '#lib/i18n.js';

  const i18n = get();

  // ✅ each binding stays in sync with the instance
  const { locale, loading } = $derived(i18n);
</script>

{#if loading}Loading…{:else}<p>{locale}</p>{/if}
```

`t` and `l` are the exception: they are functions, and their tracked reads
happen at call time, so `const { t } = i18n` stays reactive and can be passed to
a child component.

### Release instances that outlive their work

[`destroy()`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#destroy)
detaches an instance from its loading lifecycle: in-flight loads settle with
their data discarded, `loading` drops to `false`, further load calls are ignored
with a warning, and reads keep working so a component still tearing down
renders instead of breaking.

```svelte
<script>
  import { I18n } from 'sveltekit-i18n';
  import { widgetConfig } from './translations';

  const i18n = new I18n(widgetConfig);

  $effect(() => () => i18n.destroy());
</script>
```

A per-request instance that has awaited its load has nothing in flight and needs
no call. A browser instance living as long as the app needs none either — the
instances `/kit` builds included.

## Awaiting Loads

Every load-triggering method — `loadTranslations`, `loadNamespace`,
`setLocale`, `setRoute`, `loadConfig` — returns the promise of the **matching**
load. Concurrent duplicate triggers for the same locale and route join the load
already in flight instead of fetching twice, and receive its promise.

That makes `await` the whole coordination story:

```javascript
// ✅ the panel opens with its namespace present
await i18n.loadNamespace('editor');
editorOpen = true;
```

With [`/kit`](./README.md#sveltekit), the root layout's `load` awaits the
route's translations for you, so a page renders with them present — on a
client navigation, `load` preloads them and the navigation shows them as it
commits.

**Never poll `loading`.** It is a UI flag — `true` while *any* load is in
flight — not a synchronization primitive. A wall-clock wait is worse: it flakes
on slow CI and races on fast networks.

```javascript
// ❌ waits for the wrong thing, or for nothing at all
while (i18n.loading) await tick();
await new Promise((resolve) => setTimeout(resolve, 100));
```

**Assigning `locale` is deliberately fire-and-forget.** `i18n.locale = 'cs'` is
a shorthand for `setLocale('cs')` whose promise nobody holds; the property
advances once the new locale's translations resolved, so the UI never shows a
language whose text is not there. Await the method where the next step depends
on the switch having happened:

```javascript
await i18n.setLocale('cs');

document.documentElement.lang = i18n.locale;
```

**Errors.** A loader that throws is caught and logged individually, so one
broken loader never fails the batch. The exception is SvelteKit's `redirect()`
and `error()` below 500: thrown from a loader, they reject the load once the
others settled, the locale does not advance, and the call is undone — awaited
in a `load`, SvelteKit follows them; in an event handler, your code does
(`isRedirect()`, `isHttpError()`). Anything that throws after the loaders — a
custom `preprocess`, a malformed payload — rejects the returned promise, which
in a SvelteKit `load` goes to the error page. A promise you discard is safe (the
failure is reported through the configured logger and never becomes an
unhandled rejection), but it is then *only* in the log.

**`initialized`** is the flag for "a locale and route are set and translations
are present" — the one to gate a first render on, where anything needs gating at
all. With the SSR wiring below, the server already rendered the text.

## SSR and CSR Considerations

[`sveltekit-i18n/kit`](./README.md#sveltekit) is the wiring: the server builds
an instance per request, negotiates the locale, loads it for the route and
hands its state to the browser, which keeps one instance per tab and does not
fetch again what the server loaded.
[Getting Started](./GETTING_STARTED.md#your-first-multilingual-app) walks
through it with the translation files in place. Condensed:

```javascript
// src/lib/i18n.js
import { defineI18n } from 'sveltekit-i18n/kit';

export const config = {/* … */};

export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
```

```javascript
// src/hooks.server.js
export { handle } from '#lib/i18n.js';

// src/routes/+layout.server.js and src/routes/+layout.js
export { load } from '#lib/i18n.js';
```

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { use } from '#lib/i18n.js';

  let { data, children } = $props();

  use(() => data);
</script>

{@render children()}
```

Context is what keeps a per-request instance per-request: `get()` reads it, and
nothing imports the instance, so nothing can share it between visitors.

An app that needs something the wiring does not do builds the same flow by
hand — [Server-Side Rendering](./README.md#server-side-rendering) is the recipe:
`snapshot({ records: true })` on the server, `hydrate()` on the client.

### What the hand-off carries

`snapshot({ records: true })` serializes what the server instance holds for the
**active locale** and the **`fallbackLocale`**, together with the records of the
loaders that delivered it, the locale and the route. `hydrate()` displays the
data and keeps those loaders from running again for the same route params:

- **Other locales are left out.** The client instance is built from the config,
  so its own `translations` — the language names a switcher renders — stay.
- **Seeds do not count as loaded.** Data passed to `addTranslations()` or
  `config.translations` fills the tables but records nothing, so its
  namespace's loaders still run. Handing a snapshot over with
  `addTranslations()` makes the client fetch everything again.
- **The data is pre-preprocess**, so the receiving instance applies its own
  `config.preprocess`.
- **Freshness is not transferred.** A hydrated locale's [`cache`](#caching)
  window starts when the client receives the data.

### No flash of untranslated content

Translations awaited in the root layout's `load` are in the HTML the server
sent — view the page source to confirm. Gating the render on
`i18n.initialized` or `i18n.loading` is for the client-only case; adding it to
an SSR app hides content that was already there.

### Resolve the locale where the server can see it

A cookie, a route param or the `Accept-Language` header is readable on the
server; `localStorage` is not. Put the visitor's choice in a cookie (write it
from the switcher) and read it in `preferredLocale`:

```javascript
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
```

The wiring tries that first, then `Accept-Language`, then `initLocale` and
`fallbackLocale`, and matches each against the configured locales with
[`matchLocale`](./README.md#matchlocalerequested-available): a visitor sending
`en-GB` gets `en`, and a region-tagged configured locale is matched as it is
spelled. When none matches, the first locale the config serves is taken — set
`initLocale` to choose the locale such a visitor gets, rather than leave it to
the order of the loaders.
`preferredLocale` runs on every navigation and every preload, so it only reads
the event.

### Prerendering

A prerendered page is one HTML file, so it can carry exactly one locale. Give
each locale its own URL (see [Dynamic Routes and
Locales](#dynamic-routes-and-locales)) and resolve the locale from the route
parameter in `preferredLocale` instead of from a cookie — a prerendered route
has no visitor to read one from.

The build's answer travels with the page: a link or Back to a prerendered page
switches the tab to the locale `preferredLocale` gave it at build time. With
an optional segment (`[[lang]]`), let the unprefixed pages name the default
locale, or they keep whatever locale the tab shows:

```javascript
preferredLocale: (event) => event.params.lang ?? 'en',
```

A default for visitors whose cookie or header names no locale belongs in
`initLocale` instead: one returned from `preferredLocale` says the URL names
that locale.

## Translation File Organization

### Directory Structure

Organize translations by locale and namespace:

```
src/lib/
├── i18n.js                   # the config, and what defineI18n builds from it
└── translations/
    ├── en/
    │   ├── common.json       # shared UI, navigation
    │   ├── home.json         # homepage
    │   ├── about.json        # about page
    │   ├── products.json     # product pages
    │   └── errors.json       # error messages
    ├── cs/
    │   ├── common.json
    │   ├── home.json
    │   ├── about.json
    │   ├── products.json
    │   └── errors.json
    └── de/
        ├── common.json
        └── ...
```

**✅ Benefits:**
- Easy to find translations
- Clear separation by locale
- Scalable structure

### Namespace Strategy

A loader's `namespace` prefixes every key the loader returns, so
`{ "greeting": "…" }` loaded under `namespace: 'common'` is read as
`t('common.greeting')`. A namespace must not contain a `.` — the dot is the
separator the flattened tables are keyed by. (`key` is the deprecated 3.0
spelling of `namespace`; it still works and logs a warning once per loader.)

#### Common namespace

Keep frequently used translations in a `common` namespace loaded on every page:

```jsonc
// common.json
{
  "app.name": "My App",
  "nav.home": "Home",
  "nav.about": "About",
  "button.save": "Save",
  "button.cancel": "Cancel",
  "error.required": "This field is required"
}
```

**Keep it small** – only essentials that appear across multiple pages.

#### Page-specific namespaces

Give each major page or section its own namespace and scope it with `routes`.
A descriptor may list several locales, and the loader computes its file from
its props:

```javascript
const fromFile = async ({ locale, namespace }) => (await import(`./translations/${locale}/${namespace}.json`)).default;
const locale = ['en', 'cs', 'de'];

export const config = {
  loaders: [
    // Common (every page)
    { locale, namespace: 'common', loader: fromFile },

    // Page-specific
    { locale, namespace: 'home', routes: ['/'], loader: fromFile },
    { locale, namespace: 'about', routes: ['/about'], loader: fromFile },
    { locale, namespace: 'products', routes: [/^\/products/], loader: fromFile },
  ],
};
```

**A namespace may be split across routes.** Each loader is recorded on its own,
so several loaders can fill one namespace: each part loads where its route
matches and merges into what the others delivered. That keeps one prefix for
what belongs together while each page fetches only its part:

```javascript
{ locale, namespace: 'shop', routes: ['/shop'], loader: async ({ locale }) => (await import(`./translations/${locale}/shop-list.json`)).default },
{ locale, namespace: 'shop', routes: [/^\/shop\/[^/]+$/], loader: async ({ locale }) => (await import(`./translations/${locale}/shop-detail.json`)).default },
```

Where both parts declare the same key, the data applied last wins. The
collision is logged (at `warn`) only when both parts are applied together — one
load delivering both, or the namespace rebuilt because one of its loaders
delivered again (for new params, after expiry or `invalidate()`, or as a
`cache: false` loader); parts that arrive in separate loads, as route-scoped
ones usually do, overwrite each other silently otherwise. Keep their keys disjoint.

#### Feature-based organization

For large apps, organize by feature instead of page:

```
translations/
├── en/
│   ├── common.json
│   ├── auth.json         # login, register, password reset
│   ├── checkout.json     # cart, payment, confirmation
│   ├── profile.json      # user profile, settings
│   └── admin.json        # admin panel
```

```javascript
const loaders = [
  { locale, namespace: 'auth', routes: ['/login', '/register', '/reset-password'], loader: fromFile },
  { locale, namespace: 'checkout', routes: [/^\/cart/, /^\/checkout/], loader: fromFile },
];
```

### File Size Guidelines

**Target sizes:**
- `common.json`: < 5 KB (essential shared content)
- Page-specific: < 20 KB per file
- If larger, split it — into sub-namespaces, or into route-scoped loaders of
  one namespace

```
products/
├── list.json      # product listing page
├── detail.json    # product detail page
├── compare.json   # product comparison
└── reviews.json   # product reviews
```

## Key Naming Conventions

### Use dot notation

Organize keys hierarchically with dots — either in the key itself, or as nested
JSON, which the default `preprocess: 'full'` flattens to the same thing:

```json
{
  "user.profile.name": "Name",
  "user.profile.email": "Email"
}
```

```json
{
  "user": {
    "profile": { "name": "Name", "email": "Email" }
  }
}
```

Both are read as `t('<namespace>.user.profile.name')`, where `<namespace>` is
the loader's namespace. Arrays flatten too (`items.0`, `items.1`); `preprocess:
'preserveArrays'` keeps them as arrays.

### Descriptive names

```jsonc
// ❌ Bad
{ "t1": "Welcome", "btn": "Click", "txt": "Hello" }

// ✅ Good
{
  "home.welcome.title": "Welcome",
  "common.button.submit": "Submit",
  "greeting.message": "Hello"
}
```

### Consistency patterns

Establish naming patterns and stick to them:

```json
{
  "home.title": "Home",
  "about.title": "About",

  "form.label.name": "Name",
  "form.placeholder.search": "Search...",
  "form.error.required": "Required",

  "button.submit": "Submit",
  "button.cancel": "Cancel",

  "message.success.saved": "Successfully saved",
  "message.error.failed": "Operation failed"
}
```

### Avoid deep nesting

**❌ Too deep (harder to maintain):**

```json
{ "pages.user.profile.settings.privacy.options.visibility.public": "Public" }
```

**✅ Better (balanced):**

```json
{ "profile.privacy.public": "Public" }
```

**Rule of thumb:** max 3–4 levels deep, the namespace included.

### Context in keys

Include context when the same word has different meanings:

```json
{
  "common.button.close": "Close",
  "common.adjective.close": "Near",
  "store.status.open": "Open",
  "action.open": "Open file"
}
```

### Avoid prototype names as key segments

A lookup is an own-property read, so `toString`, `constructor`, `valueOf` and
`__proto__` resolve as **missing translations**, never as inherited members.
That is deliberate — a visitor-controlled key cannot reach the prototype chain —
but it means a message whose **whole** key is such a name can never be read: a
top-level `toString` in `config.translations`, say. A namespaced key is safe —
preprocessing stores `common.toString` as one own property of that name, so the
lookup finds it.

The same applies to locale codes: they are keys too, and they key the tables
through `sanitizeLocales`.

With [`extension-typed-access`](#keys-as-members-of-t), the first-level
members of `t` named like what a function answers (`name`, `length`, `call`,
`toString`, …) read the real `t`, so avoid these as namespace names, or reach
their keys through the string form (`t('name.first')`). The extension's README
lists them:
[reserved names](https://github.com/sveltekit-i18n/extensions/tree/master/extension-typed-access#the-tree).
`then` reads `undefined` at every level, so a key under it, at any depth, takes
the string form too.

## Performance Optimization

### Lazy loading by route

Load a namespace only where it is used:

```javascript
// `locale` and `fromFile` as under Namespace Strategy
const loaders = [
  // Always loaded
  { locale, namespace: 'common', loader: fromFile },

  // Loaded on /admin and below
  { locale, namespace: 'admin', routes: [/^\/admin/], loader: fromFile },
];
```

`routes` entries may be exact strings, regular expressions, or anything with a
`test(route)` method. The route reaching them is the bare path
(`/products/123`), without [`basePath`](./README.md#basepath).

What an interaction needs rather than a route — a modal, an editor — loads on
demand with `loadNamespace()`, whatever the loader's `routes` say:

```javascript
await i18n.loadNamespace('editor');
```

**⚠️ A dev-supplied route regex is the one ReDoS surface here** — the route
comes from `url.pathname`, which a visitor controls. Keep route patterns simple
and anchored (`/^\/products/`), and never build one from user input.

### Dynamic imports

```javascript
// ❌ static import — always in the initial bundle
import translations from './large-translations.json';

// ✅ dynamic import — its own chunk, fetched when the loader runs
loader: async () => (await import('./large-translations.json')).default
```

### Preloading the next page

With [`/kit`](./README.md#sveltekit), SvelteKit's own link preloading
(`data-sveltekit-preload-data`) runs the root layout's `load`, which preloads
the target route's translations without changing what is shown — the next
page's translations come along with its data, and the navigation shows them as
it commits, with nothing to wire up. Where preloading costs too much, turn it
off: `data-sveltekit-preload-data="false"`.

By hand, [`preload()`](./README.md#preloadlocale-route) is the request of a
navigation that may never commit. It fetches what a locale and route need —
judging the `cache` window and running `cache: false` loaders as the
navigation would — without switching to them: neither the locale, the route
nor `loading` changes. It resolves to a token, which the call that commits the
navigation takes as `{ preloaded }` to show what the preload fetched instead of
fetching it again:

```javascript
// Hovering a link to the German about page
const preloaded = await i18n.preload('de', '/about');

// Following it
await i18n.loadTranslations('de', '/about', { preloaded });
```

A plain `loadTranslations(locale, route)` **activates** the locale and sets the
route, so keep it for the case where you are switching.
`loadTranslations(locale, route, { activate: false })` only fills the tables,
for data a page may need later: it leaves expiry to the call that activates,
and runs a `cache: false` loader, which the activating call then runs again.

### Synchronous translations for the first paint

`config.translations` is available before any loader runs — the right place for
the handful of strings a language switcher needs in every language:

```javascript
/** @type {import('sveltekit-i18n').Config} */
export const config = {
  translations: {
    en: { 'lang.en': 'English', 'lang.cs': 'Czech' },
    cs: { 'lang.en': 'Angličtina', 'lang.cs': 'Čeština' },
  },
  loaders: [/* … */],
};
```

### `fallbackLocale` costs a second load

A fallback locale is loaded alongside the active one, roughly doubling the
fetched payload:

```javascript
// Loads 'cs' and 'en' on every page
const config = { fallbackLocale: 'en' };
```

Use it for a gradual rollout (new features in one language, translated later) or
for genuinely partial catalogues — not as a permanent default once the
translations are complete.

### Caching

`config.cache` is how long a locale's loaded translations stay **fresh**, in
milliseconds. The default is `Number.POSITIVE_INFINITY`: each loader runs once
per locale and route params, which is right when translation files ship with
the app and change only with a deploy.

```javascript
// Runtime source (CMS, translation service, database): refetch on the first
// load trigger after an hour
const config = { cache: 3600000 };

// Always stale — every load trigger refetches
const config = { cache: 0 };
```

Expiry is evaluated on the **next activating load trigger**
(`loadTranslations`, `setLocale`, `setRoute`) or `preload()`; nothing refetches
in the background, a warm load (`{ activate: false }`, `loadNamespace()`)
leaves expiry to the next activating one, and a call handed a preload's token
leaves it to that preload. And expiry *refreshes*, it never removes by
itself: what is displayed stays until the refetch lands, and then the fresh data
replaces what that loader delivered before, so a message the source dropped
goes and falls back to `fallbackLocale`.

**A source that caches on its own** — a SvelteKit remote `query`, an SWR layer,
an HTTP cache — gets `cache: false` on its loader. The core then keeps no
freshness for it: it runs on every trigger that selects it, and its source
decides what is fresh. Without it, a loader that answers from its own cache
after `invalidate()` hands back the same stale table, and the core stamps it
fresh anyway.

**⚠️ On the server, `cache` has little to hold on to.** A per-request instance
lives for one render, so its bookkeeping dies with it — the cache that matters
there belongs to the loader's own `fetch` (HTTP caching, or a module-level
memo). In the browser the instance lives for the session, and that is where
`cache` and `invalidate()` do their work.

### Invalidation

`invalidate(locale?, namespace?)` marks loaded translations stale — one
locale or all of them, one namespace or all of them. It starts **no** load and
removes nothing from the tables; loaders run again on the next load trigger. A
loader in flight when it is called is severed: its pre-invalidation data is
discarded, while the rest of its load lands.

```javascript
// An admin action or a CMS webhook told us the English content changed
i18n.invalidate('en');

// Only the CMS-backed namespace changed, in every language
i18n.invalidate(undefined, 'content');

// Nothing has happened yet — the next trigger refetches
await i18n.loadTranslations('en', location.pathname);
```

Invalidate the narrowest thing that changed: a namespace invalidation leaves
every other namespace loaded.

Keep the infinite `cache` default and call `invalidate()` for event-driven
refreshes; the two compose, and a finite `cache` can still be forced early this
way.

## TypeScript Patterns

### The config type

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

const config: Config = {
  loaders: [
    {
      locale: 'en',
      namespace: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
  ],
};

export const i18n = new I18n(config);
```

`Config` is the core's config **without the `parser` slot** (this package fills
it) and **with `parserOptions`** for the Curly Message Format's options.

**Annotating widens.** `const config: Config = …` makes the annotation, not the
literal, the type the constructor sees — which costs the locale completion the
literal would have given `setLocale()`, `l()`, `invalidate()` and `locale`. Pass
the literal straight to the constructor, or keep the literal type with
`as const satisfies Config`:

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

export const config = {
  initLocale: 'en',
  loaders: [{ locale: 'cs', namespace: 'common', loader: async () => ({}) }],
} as const satisfies Config;

const i18n = new I18n(config);

i18n.locale;  // 'en' | 'cs' | (string & {}) | undefined
```

The completion is a **hint, never a constraint** — a locale can arrive from a
URL, a cookie or an `Accept-Language` header, so any string still compiles. One
dynamic source (loaders built by mapping over a `string[]`) degrades the whole
union to `string`, on purpose: a half-known set would complete some locales
while hiding the rest.

### Typed keys and payloads with `schema`

A schema maps each translation key to the payload its message expects.
**Register it once for the app**: a global script fills the global
`SvelteKitI18n.Register` interface, and every instance whose config states no
`schema` is typed by it — `new I18n(config)`, and `get()`, `use()` and
`data.i18n` from `defineI18n(config)` — with nothing to wire:

```typescript
// src/i18n-schema.d.ts — a global script: no top-level import or export
interface TranslationSchema {
  'common.greeting': { name: string };   // payload required
  'common.about': never;                 // message takes no parameters
  'home.title': { title?: string };      // nothing required — payload optional
}

declare namespace SvelteKitI18n {
  interface Register {
    schema: TranslationSchema;
  }
}
```

```typescript
import { I18n } from 'sveltekit-i18n';

export const i18n = new I18n(config); // typed by TranslationSchema

i18n.t('common.greeting', { name: 'Alice' }); // ok
i18n.t('common.about');                       // ok — takes no payload
i18n.t('common.greting', { name: 'Alice' });  // Error: not a key of the schema
i18n.t('common.greeting', {});                // Error: `name` is required
```

A config may state its own schema instead, which wins over the registry. Only
its **type** is read, which is why `{} as …` is the idiom:
`new I18n({ ...config, schema: {} as TranslationSchema })`.

Rules worth knowing:

- `never`, `undefined`, `void` or `null` — the payload argument must be omitted.
- `any` — the payload slot stays unchecked (not the same as "no payload").
- A union of keys (`t(cond ? 'a' : 'b', …)`) takes the **intersection** of their
  payloads.
- A schema whose keys are not a closed set (`Record<string, …>`, or no keys at
  all) degrades to plain `string` keys instead of rejecting every call — so
  `schema: {}` opts an instance out of the registry, where the constructor
  infers the config's type (a type argument decides on its own). A second
  instance with a catalogue of its own, a test or a story states its closed
  schema, or opts out.
- **The registry covers the whole program: only the app registers.** A library
  never ships a registration — its own instances state their schema, or
  `schema: {}`. Two registrations whose `schema` differs are a type error
  (TS2717) with `skipLibCheck: false`, and silent with SvelteKit's default
  `skipLibCheck: true`, where the first one wins.
- **The registry needs `sveltekit-i18n` 3.1** or newer; an older core ignores
  it without a diagnostic, so state the schema per instance there.
- **Construction time only.** A later `loadConfig()` cannot retype an existing
  instance. With `/kit`, the config handed to `defineI18n()` — or the registry,
  when it states no schema — types `get()`, `use()` and `data.i18n`.

**Generate it.** A hand-written schema drifts from the catalogue it describes.
[`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen) is a
Vite plugin, installed on its own, that writes it from your translations on
`vite build` and while `vite dev` runs:

```javascript
// vite.config.js
import { sveltekit } from '@sveltejs/kit/vite';
import { typegen } from '@sveltekit-i18n/typegen';

export default {
  plugins: [
    sveltekit(),
    typegen({ config: 'src/lib/i18n.js', extractParams: { from: 'sveltekit-i18n' } }),
  ],
};
```

The file typegen writes registers the schema, so the config needs no `schema`:

```typescript
export const { handle, load, use, get } = defineI18n(config);
```

A cast of the slot still types the instance, and overrides the registered schema
for it:

```typescript
export const { handle, load, use, get } = defineI18n({ ...config, schema: {} as TranslationSchema });
```

sveltekit-i18n 3.0 has neither `/kit` nor the registry: cast the slot of the
config handed to the constructor, `new I18n({ ...config, schema: {} as TranslationSchema })`.

It runs the config's loaders as the app's server would, so the keys are the
ones `preprocess` produces; `extractParams` reads payloads through the
re-exported [`extractParamsFactory`](./README.md#extractparamsfactory). Its
`options` reach the extractor as JSON, so a custom modifier (a function) never
does, and what it changes about a payload goes unreported — see
[`extractParams`](https://github.com/sveltekit-i18n/typegen#extractparams).
Keep the generated `src/i18n-schema.d.ts` out of Git, and let CI's
`vite build` regenerate it. A namespace whose loader cannot run at build time
(a remote `query`, `routes` that capture params) is typed open: any key under
it, unchecked.

The same schema types keys as members of `t` — `t.home.title()` — with
[`extension-typed-access`](#keys-as-members-of-t), which reads the levels the
generated file registers (typegen 3.1 and newer).

### One payload type for every message

State it through the type arguments. Annotating the config variable does not
type the payload:

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

type Payload = { name: string };

const config: Config<Payload> = { loaders: [/* … */] };

export const i18n = new I18n<Config<Payload>, Payload>(config);

i18n.t('greeting', { name: 'Jarda' }); // ok
i18n.t('greeting', { nmae: 'Jarda' }); // Error: typo caught
```

Use `schema` for per-key payloads, this for a catalogue where every message
takes the same shape. It holds only while no schema is registered:
`Config<Payload>` leaves the schema slot `any`, so a registered schema types
the instance instead — the
[opt-out](./README.md#one-payload-type-for-every-message) replaces the slot in
the type argument.

### Custom modifier props

A custom modifier's per-call options ride the third argument of `t`. Type them
once and spell them as the third type argument:

```typescript
import { I18n, type Config, type Modifier } from 'sveltekit-i18n';

type Payload = { name: string };
type Props = { truncate?: { maxLength?: number } };

const truncate: Modifier.T<{ maxLength?: number }, Props> = ({ value, props }) =>
  (value.length > (props.maxLength ?? 50) ? `${value.slice(0, props.maxLength ?? 50)}…` : value);

const i18n = new I18n<Config<Payload, Props>, Payload, Props>({
  ...config,
  parserOptions: { customModifiers: { truncate } },
});

i18n.t('greeting', { name: 'Jarda' }, { truncate: { maxLength: 20 } });
```

### The exported types

From the package root: `Config`, `Parser`, `Modifier`, `Report` and `Cst` (this
package's parser surface), plus everything the core publishes — `Extension`,
`Loader`, `Logger`, `Schema`, `Snapshot`, `Translations`, and the core's own
`Config` and `Parser` namespaces under the names `BaseConfig` and `BaseParser`
(the plain names are taken).

From `sveltekit-i18n/kit`: `defineI18n` and the `Kit` types.

From `sveltekit-i18n/utils`: `matchLocale`, `resolveLoaders`,
`sanitizeLocales`, `textDirection`, `toDotNotation` and the `DotNotation` type.

The instance is typed by the config it was constructed from, or, when that
config states no schema, by the schema registered in `SvelteKitI18n.Register`,
which the typegen writes for you.

## Extensions

`config.extensions` pipes the constructed instance through adapter functions,
left to right; `new I18n(config)` evaluates to the **last one's output**. The
pipe runs once, inside the constructor — a later `loadConfig()` cannot re-pipe.

### The `$t` store surface

Teams that want the store form back add
[`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores):

```javascript
import { I18n } from 'sveltekit-i18n';
import stores from '@sveltekit-i18n/extension-stores';

const { t, locale, loading, instance } = new I18n({ ...config, extensions: [stores] });
```

**⚠️ It is still one instance.** Destructuring stores at module level
reintroduces exactly the sharing described in [Instance
Ownership](#instance-ownership). Put the extension in the config handed to
`defineI18n()` instead: `data.i18n`, `use()` and `get()` then hand out the
store surface of each per-request and per-tab instance, while the wiring keeps
driving the instance itself. The [`stores`](../examples/stores) example does
exactly that.

### Keys as members of `t`

[`@sveltekit-i18n/extension-typed-access`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-typed-access)
reads a key as a path of members on `t`, typed from the schema:
`t.cart.summary.itemCount({ count: 3 })` beside
`t('cart.summary.itemCount', { count: 3 })`.

```javascript
import { defineI18n } from 'sveltekit-i18n/kit';
import typedAccess from '@sveltekit-i18n/extension-typed-access';

export const { handle, load, use, get } = defineI18n({ ...config, extensions: [typedAccess] });
```

- **Generate the schema with typegen 3.1 or newer.** The file it writes also
  registers the keys nested by segment, so a level of the tree costs the checker its own
  segments. Without them the extension groups the keys itself, at a cost that
  grows with the square of the keys under one segment: keep namespaces to
  hundreds of keys there.
- **Keep the string form for keys known only at runtime** — CMS content,
  `t(item.labelKey)` — and for a namespace with a reserved name (see
  [Key Naming Conventions](#avoid-prototype-names-as-key-segments)).
- **Call the leaf.** `{t.home.title}` without the call renders missing-key
  text — or throws, with an object `fallbackValue` — and markup accepts a
  function, so `svelte-check` does not catch it; a `string` annotation does.

The [`typed-access`](../examples/typed-access) example reads its keys through
the tree.

### Markup in a message

[`@sveltekit-i18n/extension-html`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-html)
adds a `T` component that renders the markup a message carries as elements and
Svelte components, without `{@html}`: tags come from an allowlist, an `href`
is gated by scheme, and the payload is escaped.

```javascript
import { defineI18n } from 'sveltekit-i18n/kit';
import html from '@sveltekit-i18n/extension-html';

export const { handle, load, use, get } = defineI18n({
  ...config,
  extensions: [html({ onReport: null })],
});
```

```svelte
<i18n.T key="intro" params={{ name }} />
```

- **`<T>` where the markup renders, `t()` everywhere else.** An attribute, a
  `<title>` or an `aria-label` takes the message with its markup as text.
- **Map a tag to a component of your own** — a router-aware link, say:
  `html({ onReport: null, components: { a: Link } })` renders `<a>` as
  `<Link>`, with the tag's attributes as props.
- **Block elements are off by default.** A `<T>` inside a `<p>` or a `<button>`
  cannot hold a `<p>` or a `<div>`; enable `BLOCK_ELEMENTS` where the context
  allows, and pass `components={{ a: null }}` to a `<T>` inside a link.
- **Send `onReport` somewhere in development.** An unmapped tag, a dropped
  attribute or a blocked URL is reported, not thrown, on every render — so a
  channel that counts should deduplicate.

The [`html`](../examples/html) example renders an escaped payload, a tag as a
component and block elements per usage.

### Pipe order

`extension-stores` goes last, since it returns no instance; `extension-html`
goes after `extension-typed-access`. What each order hands out is in
[the API reference](./README.md#pipe-order).

### Writing your own

An extension is a function. It may augment the instance in place or return a
different surface entirely:

```javascript
const withGreeting = (i18n) => Object.assign(i18n, {
  greet: (name) => i18n.t('common.greeting', { name }),
});

export const config = { ...base, extensions: [withGreeting] };
```

In TypeScript, declare that the output depends on the input with an
`Extension.Operator` — otherwise the pipe folds the extension's fixed return
type and the schema and locale narrowing are erased:

```typescript
import { I18n, type Extension } from 'sveltekit-i18n';

interface WithGreeting extends Extension.Operator {
  readonly output: this['input'] & { greet: (name: string) => string };
}

const withGreeting: Extension.Generic<WithGreeting> = (i18n) => Object.assign(i18n, {
  greet: (name: string) => i18n.t('common.greeting', { name }),
});

const i18n = new I18n({ ...config, extensions: [withGreeting] });

i18n.greet('World');
i18n.t('common.greeting', { name: 'World' }); // still key- and payload-checked
```

The pipe folds a tuple. A config kept in a variable, as the one handed to
`defineI18n()`, widens its `extensions` to an array, and the surface is then
typed as the bare instance while the call still returns the extension's output.
Keep that config `as const` (`{ ...base, extensions: [withGreeting] } as const`),
or hand the extensions over in the call as above.

A generic function signature (`<I>(i18n: I) => I & { … }`) does **not** work:
reading one instantiates its type parameters at their constraints, so the pipe
would fold `unknown`.

### `instanceof` does not hold

`new I18n(config)` returns the core's instance, and an extension may replace it
again, so `i18n instanceof I18n` is `false`. Test for a member you use. This is
documented, not fixed.

## Component-Scoped Translations

**Prefer one instance.** A reusable component with text of its own does not need
an instance of its own — it needs a namespace of its own. Give it a
`namespace` nobody else uses, scope it with `routes` if it only appears on some
pages, and read the app's instance with `get()`:

```javascript
// src/lib/i18n.js — `fromFile` as under Namespace Strategy
export const config = {
  loaders: [
    { locale: ['en', 'cs'], namespace: 'common', loader: fromFile },
    { locale: ['en', 'cs'], namespace: 'dataTable', loader: fromFile },
  ],
};
```

```svelte
<!-- src/lib/components/DataTable.svelte -->
<script>
  import { get } from '#lib/i18n.js';

  const i18n = get();
</script>

<table>
  <thead>
    <tr>
      <th>{i18n.t('dataTable.column.name')}</th>
      <th>{i18n.t('dataTable.column.date')}</th>
    </tr>
  </thead>
</table>
```

One instance means one locale, one loading flag and one set of tables — nothing
to keep in sync. A component that appears on interaction rather than on a
route — a dialog, a panel — can give its loader `routes: []`, which no page
selects, and load it as it opens with `await i18n.loadNamespace('dataTable')`,
which selects a namespace's loaders whatever their `routes` say.

**A second instance is for genuine isolation**: an embedded widget that must
render in a locale of its own, or a surface whose translations come from a
different source entirely. Then it owns its whole lifecycle:

```svelte
<script>
  import { I18n } from 'sveltekit-i18n';
  import { get } from '#lib/i18n.js';
  import { widgetConfig } from './translations';

  const app = get();
  const widget = new I18n(widgetConfig);

  // Follow the app's language; drop the `$effect` to pin it to its own.
  $effect(() => {
    if (app.locale) widget.setLocale(app.locale);
  });

  $effect(() => () => widget.destroy());
</script>

<p>{widget.t('widget.title')}</p>
```

## Library Authors: Shipping Translations

A component library that ships its own translations must not ship its own
instance. The app owns the single `new I18n(…)`; the library contributes
loaders, translations and components that read whatever instance they are
handed.

**Why:** two instances mean two reactive graphs and two locales that drift
apart, and a module-level instance inside a library is the [singleton
hazard](#instance-ownership) again — one that every consuming app inherits on
the server.

### 1. Declare `sveltekit-i18n` as a peer dependency

```json
{
  "name": "acme-table",
  "peerDependencies": {
    "sveltekit-i18n": "^3.1.0",
    "svelte": ">=5"
  },
  "devDependencies": {
    "sveltekit-i18n": "^3.1.0"
  }
}
```

A regular dependency would install a second copy of the package — and with it a
second copy of the core, whose state the app's instance knows nothing about.
`^3.1.0` is the floor for loaders spelled with `namespace`, as below; a library
that must still serve 3.0 apps spells it `key` and states `^3.0.0`, and 3.1
logs a deprecation warning for it.

### 2. Export loaders, not an instance

```javascript
// acme-table/src/i18n.js
const FILES = {
  en: () => import('./translations/en.json'),
  cs: () => import('./translations/cs.json'),
};

/**
 * @param {readonly string[]} locales
 * @returns {import('sveltekit-i18n').Loader.LoaderModule[]}
 */
export const tableLoaders = (locales) => locales
  .filter((locale) => Object.hasOwn(FILES, locale))
  .map((locale) => ({
    locale,
    namespace: 'acmeTable',
    loader: async () => (await FILES[locale]()).default,
  }));
```

- The `namespace` is the library's — one nobody else is likely to claim, and
  free of `.` characters. Every message is then read as `t('acmeTable.…')`.
- The app says which locales it supports; the library contributes the ones it
  has. Locales it does not translate fall back through the app's
  `fallbackLocale`.
- Keep the loaders lazy (`import()`), so an app that never renders the component
  never fetches its strings.

The app composes them into its own config:

```javascript
// src/lib/i18n.js
import { tableLoaders } from 'acme-table/i18n';

const locales = ['en', 'cs', 'de'];

export const config = {
  fallbackLocale: 'en',
  loaders: [
    {
      locale: locales,
      namespace: 'common',
      loader: async ({ locale }) => (await import(`./translations/${locale}/common.json`)).default,
    },
    ...tableLoaders(locales),
  ],
};
```

Nothing else changes: the library's namespace is cached, invalidated,
snapshotted and route-scoped exactly like the app's own.

### 3. For a handful of strings, ship an extension instead

`addTranslations` is the synchronous path — it takes locale-indexed data and
merges it branch by branch. It only seeds: a loader of the same namespace still
runs and merges over it. Packaged as an extension, it runs for every instance
the app builds, per request included:

```javascript
// acme-table/src/i18n.js
const TRANSLATIONS = {
  en: { acmeTable: { empty: 'No rows', loading: 'Loading…' } },
  cs: { acmeTable: { empty: 'Žádné řádky', loading: 'Načítání…' } },
};

/** @type {import('sveltekit-i18n').Extension.T} */
export const withTable = (i18n) => {
  i18n.addTranslations(TRANSLATIONS);

  return i18n;
};
```

```javascript
// src/lib/i18n.js
import { withTable } from 'acme-table/i18n';

export const config = { ...appConfig, extensions: [withTable] };
```

In TypeScript, brand it so the pipe keeps the surface it was handed:

```typescript
import type { Extension } from 'sveltekit-i18n';

interface WithTable extends Extension.Operator {
  readonly output: this['input'];
}

export const withTable: Extension.Generic<WithTable> = (i18n) => {
  i18n.addTranslations(TRANSLATIONS);

  return i18n;
};
```

The extension runs wherever an instance is handed out — with `/kit`, on the
instance each universal `load` builds, on the server's rendering pass and in
the browser — so the strings are present on both sides without travelling in
the snapshot.

### 4. Let components receive the instance

A library component must not import an instance. Take it as a prop:

```svelte
<!-- acme-table/src/AcmeTable.svelte -->
<script>
  let { i18n, rows } = $props();
</script>

{#if !rows.length}<p>{i18n.t('acmeTable.empty')}</p>{/if}
```

…or agree on a context key the library owns and the app sets once:

```javascript
// acme-table/src/context.js
import { getContext, setContext } from 'svelte';

const KEY = Symbol.for('acme-table:i18n');

export const setTableI18n = (i18n) => setContext(KEY, i18n);

export const getTableI18n = () => getContext(KEY);
```

```svelte
<!-- src/routes/+layout.svelte — the app, once -->
<script>
  import { setTableI18n } from 'acme-table';
  import { use } from '#lib/i18n.js';

  let { data, children } = $props();

  setTableI18n(use(() => data));
</script>

{@render children()}
```

`use()` returns the instance it provides, so the app hands the library the same
one its own components reach through `get()`.

Context is per component tree, so a per-request instance stays per-request — the
property that makes this the right mechanism on the server as well.

### What a library must not do

- **Export a constructed instance** (`export const i18n = new I18n(config)`) —
  the app then has two.
- **Call `loadConfig()`** on the app's instance — it replaces the whole config,
  including the app's loaders.
- **Call `destroy()`** on an instance it did not create.
- **Depend on `@sveltekit-i18n/base` or `@sveltekit-i18n/parser-curly`
  directly** — `sveltekit-i18n` re-exports the core's whole surface and the
  parser's build-time half, and a direct dependency is another way to end up
  with two copies of the core.
- **Count on seeded strings to keep a loader from running.** In 3.1, data from
  `addTranslations()` or `config.translations` records nothing.
- **Register a schema in `SvelteKitI18n.Register`.** The registry types every
  schema-less instance of the program it is part of, so only the app fills it;
  a library's own instances state their schema, or `schema: {}`.

## Dynamic Routes and Locales

### Locale in the URL path

For SEO-friendly locale routing:

```
src/routes/[lang]/
├── +layout.svelte
├── +page.svelte
└── about/
    └── +page.svelte
```

Resolve the locale from the route parameter — this is also what makes
prerendering possible:

```javascript
// src/lib/i18n.js
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.params.lang,
});
```

The root wiring from [SSR and CSR
Considerations](#ssr-and-csr-considerations) is unchanged: the locale now comes
from the path instead of a cookie, and a value no configured locale matches
falls through to `Accept-Language`, `initLocale`, `fallbackLocale` and the
first locale the config serves. A link to another locale's URL switches the tab
as the navigation commits. Nothing under `[lang]/` has to load translations
again.

Loader `routes` match `url.pathname`, so they see the locale segment
(`/cs/about`). Match it in the pattern:

```javascript
{ locale, namespace: 'about', routes: [/^\/[^/]+\/about$/], loader: fromFile }
```

### Locale-aware links

```javascript
// src/lib/utils/i18n.js
export const localePath = (path, locale) => `/${locale}${path}`;
```

```svelte
<script>
  import { get } from '#lib/i18n.js';
  import { localePath } from '#lib/utils/i18n.js';

  const i18n = get();
</script>

<a href={localePath('/about', i18n.locale)}>{i18n.t('common.nav.about')}</a>
```

### Language switcher

`l(locale, key)` reads a locale the call names, which is how each language
renders in its own name:

```svelte
<script>
  import { page } from '$app/state';
  import { get } from '#lib/i18n.js';

  const i18n = get();

  const pathWithout = (path) => path.replace(/^\/[a-z]{2}(?=\/|$)/, '') || '/';
</script>

{#each i18n.locales as loc (loc)}
  <a href={`/${loc}${pathWithout(page.url.pathname)}`} class:active={i18n.locale === loc}>
    {i18n.l(loc, `lang.${loc}`)}
  </a>
{/each}
```

The `lang.*` keys come from `config.translations`, so they are present in every
language before anything loads.

### Right-to-left locales

With `/kit`, `<html dir="%dir%">` in `app.html` and `use()` keep the document's
direction in step with the locale. For an element of its own — a widget pinned
to another locale — take the direction from
[`textDirection`](./README.md#textdirectionlocale):

```svelte
<script>
  import { textDirection } from 'sveltekit-i18n/utils';
</script>

<div dir={textDirection(widget.locale)}>…</div>
```

It reads the script, not a list of languages, so `ar`, `he`, `fa` and `ckb` are
`'rtl'`. Spell the script where a region could change it (`ku-Arab`): engines
disagree on some likely scripts, and the server's `%dir%` and the browser's
would then too.

## Content Management

### Loading from a CMS or an API

A loader is just an async function:

```javascript
export const config = {
  loaders: [
    {
      locale: ['en', 'cs'],
      namespace: 'content',
      loader: async ({ locale, namespace }) => {
        const response = await fetch(`https://api.cms.example/translations/${locale}/${namespace}`);

        return response.json();
      },
    },
  ],
  cache: 300000, // the browser instance refetches after 5 minutes
};
```

A loader receives `{ locale, namespace, route, params }` — plain data — so one
function can serve every locale and namespace, and `params` carries what a
named group in its `routes` captured (an article id, a product slug).

**⚠️ The server builds an instance per request**, so a loader hitting a remote
source runs on every render. Put the caching where it survives that: HTTP cache
headers, a CDN in front of the CMS, or a module-level memo in the loader. The
`cache` window is what keeps the **browser** instance from refetching on every
navigation.

**A source that caches on its own** — a SvelteKit remote `query` (SvelteKit
2.27 or newer, with `experimental.remoteFunctions` on), an SWR layer — gets
`cache: false`, so the core leaves freshness to it and runs the loader on
every trigger that selects it:

```javascript
// src/lib/i18n.remote.js
import { query } from '$app/server';
import { db } from '#lib/server/database.js';

export const messages = query('unchecked', ({ locale, namespace }) => db.messages(locale, namespace));
```

```javascript
// src/lib/i18n.js
import { messages } from './i18n.remote.js';

// in `config.loaders`:
{
  locale: ['en', 'cs'],
  namespace: 'editor',
  cache: false,
  loader: async ({ locale, namespace }) => {
    const data = await messages({ locale, namespace });

    // A remote query that redirected resolves `undefined`: throw, to retry.
    if (data === undefined) throw new Error(`No ${namespace} messages for ${locale}`);

    return data;
  },
}
```

Refreshing the source is the app's business (`messages(…).refresh()`); the next
trigger picks the new data up. A loader backed by a remote function has to
mind how SvelteKit treats one on the client — its `redirect()`, its 4xx — which
[base — `loader`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#loader-required)
spells out.

### Keep server-only code out of the shared config

The config is imported by `+layout.server.js` *and* `+layout.js`, so a loader
reaching a database drags server-only code into the client bundle. Put the query
behind an endpoint and let the loader fetch it:

```javascript
// src/routes/api/translations/[locale]/+server.js
import { json } from '@sveltejs/kit';
import { db } from '#lib/server/database.js';

export const GET = async ({ params }) => json(await db.translations.find({ locale: params.locale }));
```

```javascript
{
  locale: ['en', 'cs'],
  namespace: 'dynamic',
  loader: async ({ locale }) => (await fetch(`${import.meta.env.VITE_API_ORIGIN}/api/translations/${locale}`)).json(),
}
```

The loader runs on the server too, where `fetch` takes only an absolute URL
(the core hands a loader no `fetch` of its own), so it builds the URL from an
origin, `VITE_API_ORIGIN` here — or back it with a remote `query` instead.

### Mixing static and dynamic

```javascript
const loaders = [
  // Static: fast, versioned with the code
  { locale: 'en', namespace: 'common', loader: async () => (await import('./en/common.json')).default },

  // Dynamic: updates without a deployment
  { locale: 'en', namespace: 'content', loader: async () => (await fetch(`${import.meta.env.VITE_API_ORIGIN}/api/translations/en/content`)).json() },
];
```

Editors publishing a change can be reflected without a finite `cache`: call
`invalidate(undefined, 'content')` on the browser instance when the app learns
of it (a websocket message, a poll, an explicit "reload content" action), then
trigger a load. Only that namespace refetches.

## Testing

### Use a real instance

An instance built from `translations` alone is cheap and **synchronous** — no
loader runs, so there is nothing to await. A component that reads it through
`get()` finds it where `use()` put it, which a test renders without, so hand
the component a real instance through your module's `get`:

```javascript
import { render } from '@testing-library/svelte';
import { expect, test, vi } from 'vitest';
import Greeting from '#lib/components/Greeting.svelte';

vi.mock('#lib/i18n.js', async () => {
  const { I18n } = await import('sveltekit-i18n');
  const i18n = new I18n({
    initLocale: 'en',
    translations: { en: { 'common.greeting': 'Hello, {{name}}!' } },
  });

  return { get: () => i18n };
});

// Greeting calls get() and renders i18n.t('common.greeting', { name })
test('greets the user', () => {
  const { getByText } = render(Greeting, { props: { name: 'Alice' } });

  expect(getByText('Hello, Alice!')).toBeInTheDocument();
});
```

A component that takes the instance as a prop needs no mock at all.

Per-test instances mean there is no state to reset between cases — the same
property that makes per-request instances right on the server.

### Stub where a stub is enough

`t` is a plain function on a plain object; nothing subscribes to anything:

```javascript
const i18n = { t: (key) => key, l: (locale, key) => key, locale: 'en', locales: ['en'] };
```

Assert on keys instead of copy — a test that asserts on translated strings fails
every time a wording changes.

### Testing the loaders themselves

Await the promise the trigger returns; never sleep:

```javascript
const i18n = new I18n({ ...config, log: { level: 'error' } });

await i18n.loadTranslations('en', '/products');

expect(i18n.translations.en['products.title']).toBe('Products');
```

`log: { level: 'error' }` keeps the debug chatter out of the test output.

### Vitest setup

The core ships its rune modules **uncompiled**, for the consuming bundler to
compile. A SvelteKit app's Vite config already has the Svelte plugin; what a
node-environment test run still needs is for the core not to be externalized:

```javascript
// vite.config.js
export default defineConfig({
  plugins: [sveltekit()],
  test: {
    server: {
      deps: {
        // Externalized dependencies never reach the Svelte plugin, and the
        // rune modules then hit Node uncompiled ("$state is not defined").
        inline: ['@sveltekit-i18n/base'],
      },
    },
  },
});
```

## Production Deployment

### Environment-specific config

```javascript
/** @type {import('sveltekit-i18n').Config} */
export const config = {
  cache: import.meta.env.DEV ? 0 : Number.POSITIVE_INFINITY,
  log: { level: import.meta.env.DEV ? 'debug' : 'warn' },
  loaders: [/* … */],
};
```

### Logging

`config.log` configures a **module-level** logger shared by every instance in
the process — set it from the one config every instance is built from, rather
than per instance.

```javascript
import * as Sentry from '@sentry/sveltekit';

export const config = {
  log: {
    prefix: '[acme i18n]: ',
    logger: {
      error: (message, error) => Sentry.captureException(error ?? new Error(message)),
      warn: (message) => Sentry.captureMessage(message, 'warning'),
      debug: () => {},
    },
  },
};
```

Every level takes the prefixed message, and a thrown value follows as a second
argument where there is one. A loader's `redirect()` that rejects a load arrives
at `error` too, as SvelteKit threw it — navigation, not a fault — so a logger
feeding an error tracker skips it with `isRedirect(error)` from
`@sveltejs/kit`. The runtime skips a method a logger does not
define, but the `Logger.T` type names all three levels — spell the ones you do
not want as no-ops when you type the object.

### Parser reports

Reports (`unknown-modifier`, `failed-modifier`, `missing-options`, …) are
**silent by default**: nothing is written anywhere unless you pass a channel.
They never raise — the placeholder takes its fallback and the rest of the
message renders — which makes them exactly the kind of defect that survives to
production unnoticed.

```javascript
export const config = {
  parserOptions: {
    onReport: (report) => {
      // `origin` says who fixes it: `message`, `payload` or a parser `limit`
      if (report.origin !== 'limit') Sentry.captureMessage(report.message, 'warning');
    },
  },
};
```

A report's `message` is a self-contained English sentence carrying nothing from
the payload, and `text` is an escaped, truncated excerpt — both safe to ship to a
log aggregator.

### Loader failures

A loader that throws is caught and logged on its own, so the rest of the batch
still lands. Where a namespace is critical, degrade explicitly instead:

```javascript
{
  locale: 'en',
  namespace: 'common',
  loader: async () => {
    try {
      return (await fetch('https://cdn.example.com/translations/en/common.json')).json();
    } catch {
      return (await import('./en/common.json')).default; // bundled copy
    }
  },
}
```

### CDN-hosted translations

```javascript
{
  locale: 'en',
  namespace: 'common',
  loader: async ({ locale }) => (await fetch(`https://cdn.example.com/translations/${locale}/common.json`)).json(),
}
```

Version the URL (or rely on immutable cache headers) so a deploy cannot serve a
stale catalogue, and keep a bundled fallback for the fetch above.

### Monitoring

Measure inside the loader — that is the boundary the network crosses:

```javascript
{
  locale: 'en',
  namespace: 'common',
  loader: async ({ locale, route }) => {
    const start = performance.now();
    const translations = await (await fetch(`${import.meta.env.VITE_API_ORIGIN}/api/translations/${locale}`)).json();

    analytics.track('translations_loaded', { locale, route, duration: performance.now() - start });

    return translations;
  },
}
```

## Summary

**Key takeaways:**

1. **Ownership** – export the config and let `sveltekit-i18n/kit` build the
   instances: one per request on the server, one per tab in the browser,
   reached through `get()`.
2. **Awaiting** – await the promise the trigger returned; `loading` is for UI,
   never for coordination.
3. **Organization** – namespaces scoped with `routes`, split across routes
   where that fits, loaded through dynamic imports; `loadNamespace()` for what
   an interaction needs.
4. **Caching** – keep the infinite default for files that ship with the app;
   `invalidate(locale?, namespace?)` for event-driven refreshes; `cache: false`
   for a source that caches itself; cache the fetch, not the instance, on the
   server.
5. **TypeScript** – a config literal for locale completion, a schema for typed
   keys and payloads, generated and registered by `@sveltekit-i18n/typegen`,
   and `Extension.Operator` so the pipe keeps both.
6. **Libraries** – ship loaders and translations, never an instance or a
   schema registration; peer-depend on `sveltekit-i18n`; take the instance as a
   prop or through context.
7. **Testing** – a real instance with inline `translations` is synchronous, so
   there is nothing to await and nothing to reset.

## See Also

- [Getting Started](./GETTING_STARTED.md) – step-by-step setup tutorial
- [API Documentation](./README.md) – this package's reference
- [Core API reference](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md) – every shared member, in full
- [Curly Message Format parser](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly) – message syntax and `parserOptions`
- [Architecture Overview](./ARCHITECTURE.md) – how it all works
- [Troubleshooting](./TROUBLESHOOTING.md) – common issues and solutions
- [typegen](https://github.com/sveltekit-i18n/typegen) – generates the `schema` type
- [Extensions](https://github.com/sveltekit-i18n/extensions) – the official extensions: stores, typed access and markup
- [Examples](../examples) – working code examples
