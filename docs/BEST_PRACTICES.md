# Best Practices

This guide covers recommended patterns, conventions, and tips for using
`sveltekit-i18n` in production applications.

It assumes the v3 surface: one reactive instance, no stores, no `$` prefixes —
the tour is in [Getting Started](./GETTING_STARTED.md). Member-level detail
lives in the
[core reference](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md);
this document is about what to do with those members.

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

**The rule:** one instance per request on the server, one instance per app in
the browser. What modules export is the **config** — inert data.

### The module-level singleton hazard

A module that constructs an instance is evaluated **once per process** on the
server, not once per request:

```javascript
// ❌ src/lib/translations/index.js — shared by every concurrent request
import { I18n } from 'sveltekit-i18n';

export const i18n = new I18n(config);
```

Two visitors rendered at the same time overwrite each other's `locale` and
translation tables, and one visitor's language ends up in the other's HTML. The
failure is load-dependent: a single-user dev session never shows it.

```javascript
// ✅ src/lib/translations/index.js — the config is inert data
/** @type {import('sveltekit-i18n').Config} */
export const config = {
  fallbackLocale: 'en',
  loaders: [/* … */],
};
```

Each request builds its own instance from it, and components reach that instance
through Svelte context rather than through an import — see
[SSR and CSR Considerations](#ssr-and-csr-considerations) for the wiring.

### When a singleton is enough

The shared-state problem exists only on the server. A module-level instance is
safe when the server renders nothing visitor-specific:

- the app is client-only (`export const ssr = false`), or
- every request renders the same locale.

Everything else — including "we will add a second language later" — wants the
per-request wiring from the start. Retrofitting it means touching every module
that imported the instance.

### Do not destructure value properties

A destructured value is a one-time snapshot; the property read is what is
reactive.

```svelte
<script>
  // ❌ frozen at the moment of destructuring
  const { locale, loading } = getContext('i18n');
</script>
```

```svelte
<script>
  import { getContext } from 'svelte';

  const i18n = getContext('i18n');

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
no call. A browser instance living as long as the app needs none either.

## Awaiting Loads

Every load-triggering method — `loadTranslations`, `setLocale`, `setRoute`,
`loadConfig` — returns the promise of the **matching** load. Concurrent
duplicate triggers for the same locale and route join the load already in flight
instead of fetching twice, and receive its promise.

That makes `await` the whole coordination story:

```javascript
// ✅ +layout.js — the page renders with translations present
await i18n.loadTranslations(data?.locale ?? config.fallbackLocale, url.pathname);
```

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
broken loader never fails the batch. Anything that throws afterwards — a custom
`preprocess`, a malformed payload — rejects the returned promise, which in a
SvelteKit `load` goes straight to the error boundary. A promise you discard is
safe (the failure is reported through the configured logger and never becomes an
unhandled rejection), but it is then *only* in the log.

**`initialized`** is the flag for "a locale and route are set and translations
are present" — the one to gate a first render on, where anything needs gating at
all. With the SSR wiring below, the server already rendered the text.

## SSR and CSR Considerations

The canonical wiring is four steps: export the config, build per request on the
server, hand the data to the client, pass the instance down through context.
[Getting Started](./GETTING_STARTED.md#step-2-export-the-config-not-an-instance)
walks through it with the translation files in place; the core reference
documents the same flow for `@sveltekit-i18n/base`
([Server-Side Rendering](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#server-side-rendering)).
Condensed:

```javascript
// src/routes/+layout.server.js — one instance per request
import { I18n } from 'sveltekit-i18n';
import { config } from '$lib/translations';

/** @type {import('./$types').LayoutServerLoad} */
export const load = async ({ url, locals }) => {
  const i18n = new I18n(config);

  await i18n.loadTranslations(locals.locale, url.pathname);

  return { locale: locals.locale, translations: i18n.snapshot() };
};
```

```javascript
// src/routes/+layout.js — the instance the app renders with
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

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { setContext } from 'svelte';

  let { data, children } = $props();

  setContext('i18n', data.i18n);
</script>

{@render children()}
```

Context is what keeps a per-request instance per-request: nothing imports it, so
nothing can share it between visitors.

### What the snapshot carries

`snapshot()` serializes what the instance holds for the **active locale** and
the **`fallbackLocale`**, narrowed to the current route. It is shaped like
`config.translations`, so the client hydrates by handing it straight back to a
constructor and the loaders behind it do not run again.

- **Other locales are left out.** Spreading `config.translations` underneath the
  snapshot (as above) keeps the immediately-available strings for the languages
  the visitor is *not* using — the language names a switcher renders.
- **Off-route keys are left out.** A key claimed only by loaders whose `routes`
  do not match is fetched when the visitor navigates there. A key no loader
  claims (added through `addTranslations`) is always kept.
- **The data is pre-preprocess**, so the receiving instance applies its own
  `config.preprocess`.
- **Freshness is not transferred.** A hydrated locale's [`cache`](#caching)
  window starts when the client receives the data.

### No flash of untranslated content

Translations awaited in `+layout.server.js` are in the HTML the server sent —
view the page source to confirm. Gating the render on `i18n.initialized` or
`i18n.loading` is for the client-only case; adding it to an SSR app hides
content that was already there.

### Resolve the locale where the server can see it

A cookie or an `Accept-Language` header is readable in `hooks.server.js`;
`localStorage` is not. Put the visitor's choice in a cookie (write it from the
switcher), resolve it into `event.locals`, and keep browser-only storage for
things the first paint does not depend on.

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

`sanitizeLocales` is the normalization the instance itself applies, so `EN` and
`en` reach the same entry the tables are keyed by. It canonicalizes spelling,
not granularity — `en-us` becomes `en-US` and keeps its region — so a header is
matched here on its language subtag; a list of bare `en` and `cs` would
otherwise never see a visitor sending `en-US`. Drop the `split` where the app
ships region-specific locales and lists them region-tagged.

### Prerendering

A prerendered page is one HTML file, so it can carry exactly one locale. Give
each locale its own URL (see [Dynamic Routes and
Locales](#dynamic-routes-and-locales)) and resolve the locale from the route
parameter instead of from a cookie — a prerendered route cannot read one.

## Translation File Organization

### Directory Structure

Organize translations by locale and namespace:

```
src/lib/translations/
├── index.js              # the config (not an instance)
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

A loader's `key` is the namespace: it prefixes every key the loader returns, so
`{ "greeting": "…" }` loaded under `key: 'common'` is read as
`t('common.greeting')`. A loader `key` must not contain a `.` — the dot is the
separator the flattened tables are keyed by.

#### Common namespace

Keep frequently used translations in a `common` namespace loaded on every page:

```json
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

Give each major page or section its own namespace and scope it with `routes`:

```javascript
/** @type {import('sveltekit-i18n').Config} */
export const config = {
  loaders: [
    // Common (every page)
    { locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default },

    // Page-specific
    { locale: 'en', key: 'home', routes: ['/'], loader: async () => (await import('./en/home.json')).default },
    { locale: 'en', key: 'about', routes: ['/about'], loader: async () => (await import('./en/about.json')).default },
    { locale: 'en', key: 'products', routes: [/^\/products/], loader: async () => (await import('./en/products.json')).default },
  ],
};
```

**⚠️ One namespace per route group.** A namespace is loaded once per locale: as
soon as one loader has supplied `products`, every other `products` loader is
skipped — including one whose `routes` never matched. Splitting a single
namespace across routes therefore loses the halves the visitor did not land on.
Give each route group a key of its own.

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
  { locale: 'en', key: 'auth', routes: ['/login', '/register', '/reset-password'], loader: async () => (await import('./en/auth.json')).default },
  { locale: 'en', key: 'checkout', routes: [/^\/cart/, /^\/checkout/], loader: async () => (await import('./en/checkout.json')).default },
];
```

### File Size Guidelines

**Target sizes:**
- `common.json`: < 5 KB (essential shared content)
- Page-specific: < 20 KB per file
- If larger, split into sub-namespaces — each with its own loader `key`

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

Both are read as `t('<key>.user.profile.name')`, where `<key>` is the loader's
namespace. Arrays flatten too (`items.0`, `items.1`); `preprocess:
'preserveArrays'` keeps them as arrays.

### Descriptive names

```json
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

**Rule of thumb:** max 3–4 levels deep, the loader `key` included.

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

## Performance Optimization

### Lazy loading by route

Load a namespace only where it is used:

```javascript
const loaders = [
  // Always loaded
  { locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default },

  // Loaded on /admin and below
  { locale: 'en', key: 'admin', routes: [/^\/admin/], loader: async () => (await import('./en/admin.json')).default },
];
```

`routes` entries may be exact strings, regular expressions, or anything with a
`test(route)` method. The route reaching them is the bare path
(`/products/123`).

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

SvelteKit's own link preloading (`data-sveltekit-preload-data`) runs the target
route's `load`, which runs `loadTranslations` for that path — the next page's
translations come along with its data, with nothing to wire up.

Calling `loadTranslations(locale, route)` by hand also **sets** the instance's
current route, so reserve it for the case where you are about to navigate:

```javascript
import { goto } from '$app/navigation';

const openProducts = async () => {
  await i18n.loadTranslations(i18n.locale, '/products');
  await goto('/products');
};
```

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
milliseconds. The default is `Number.POSITIVE_INFINITY`: loaders run once per
locale and key, which is right when translation files ship with the app and
change only with a deploy.

```javascript
// Runtime source (CMS, translation service, database): refetch on the first
// load trigger after an hour
const config = { cache: 3600000 };

// Always stale — every load trigger refetches
const config = { cache: 0 };
```

Expiry is evaluated on the **next load trigger** (`loadTranslations`,
`setLocale`, `setRoute`); nothing refetches in the background. And expiry
*refreshes*, it never removes: fresh data merges over what is displayed, so a
message the source dropped since the first load stays until the instance is
recreated.

**⚠️ On the server, `cache` has little to hold on to.** A per-request instance
lives for one render, so its bookkeeping dies with it — the cache that matters
there belongs to the loader's own `fetch` (HTTP caching, or a module-level
memo). In the browser the instance lives for the session, and that is where
`cache` and `invalidate()` do their work.

### Invalidation

`invalidate(locale?)` marks loaded translations stale — one locale, or all of
them. It starts **no** load and removes nothing from the tables; loaders run
again on the next load trigger. A load in flight when it is called is severed:
it settles, but its pre-invalidation data is discarded.

```javascript
// An admin action or a CMS webhook told us the English content changed
i18n.invalidate('en');

// Nothing has happened yet — the next trigger refetches
await i18n.loadTranslations('en', location.pathname);
```

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
      key: 'common',
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
  loaders: [{ locale: 'cs', key: 'common', loader: async () => ({}) }],
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

`config.schema` maps each translation key to the payload its message expects.
Only its **type** is read, which is why `{} as …` is the idiom:

```typescript
import { I18n } from 'sveltekit-i18n';

type TranslationSchema = {
  'common.greeting': { name: string };   // payload required
  'common.about': never;                 // message takes no parameters
  'home.title': { title?: string };      // nothing required — payload optional
};

export const i18n = new I18n({
  ...config,
  schema: {} as TranslationSchema,
});

i18n.t('common.greeting', { name: 'Alice' }); // ok
i18n.t('common.about');                       // ok — takes no payload
i18n.t('common.greting', { name: 'Alice' });  // Error: not a key of the schema
i18n.t('common.greeting', {});                // Error: `name` is required
```

Rules worth knowing:

- `never`, `undefined`, `void` or `null` — the payload argument must be omitted.
- `any` — the payload slot stays unchecked (not the same as "no payload").
- A union of keys (`t(cond ? 'a' : 'b', …)`) takes the **intersection** of their
  payloads.
- A schema whose keys are not a closed set (`Record<string, …>`, or no keys at
  all) degrades to plain `string` keys instead of rejecting every call.
- **Construction time only.** A later `loadConfig()` cannot retype an existing
  instance.

**Keeping it hand-written.** Write the schema next to the translations and let
review catch drift, or generate it from your own build step —
[`extractParamsFactory`](./README.md#extractparamsfactory) reports what each
message expects of its payload, which is what a build step needs to emit the
schema. A generator that does it for you is 3.1 work
([#234](https://github.com/sveltekit-i18n/lib/issues/234)) — v3 ships the slot
and the extractor, not the generator.

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
takes the same shape.

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
`Loader`, `Logger`, `Schema`, `Translations`, and the core's own `Config` and
`Parser` namespaces under the names `BaseConfig` and `BaseParser` (the plain
names are taken).

From `sveltekit-i18n/utils`: `sanitizeLocales`, `toDotNotation` and the
`DotNotation` type.

There is nothing to augment and nothing to declare: the instance is typed by the
config it was constructed from.

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
Ownership](#instance-ownership) — build the extended instance per request and
pass it through context just the same, or reserve the store surface for
client-only apps.

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

const i18n = new I18n({ ...config, schema: {} as TranslationSchema, extensions: [withGreeting] });

i18n.greet('World');
i18n.t('common.greeting', { name: 'World' }); // still key- and payload-checked
```

A generic function signature (`<I>(i18n: I) => I & { … }`) does **not** work:
reading one instantiates its type parameters at their constraints, so the pipe
would fold `unknown`.

### `instanceof` does not hold

`new I18n(config)` returns the core's instance, and an extension may replace it
again, so `i18n instanceof I18n` is `false`. Test for a member you use. This is
documented, not fixed.

## Component-Scoped Translations

**Prefer one instance.** A reusable component with text of its own does not need
an instance of its own — it needs a namespace of its own. Give it a loader `key`
nobody else uses, scope it with `routes` if it only appears on some pages, and
read the app's instance from context:

```javascript
// src/lib/translations/index.js
/** @type {import('sveltekit-i18n').Config} */
export const config = {
  loaders: [
    { locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default },
    { locale: 'en', key: 'dataTable', loader: async () => (await import('./en/data-table.json')).default },
    { locale: 'cs', key: 'dataTable', loader: async () => (await import('./cs/data-table.json')).default },
  ],
};
```

```svelte
<!-- src/lib/components/DataTable.svelte -->
<script>
  import { getContext } from 'svelte';

  const i18n = getContext('i18n');
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
to keep in sync.

**A second instance is for genuine isolation**: an embedded widget that must
render in a locale of its own, or a surface whose translations come from a
different source entirely. Then it owns its whole lifecycle:

```svelte
<script>
  import { getContext } from 'svelte';
  import { I18n } from 'sveltekit-i18n';
  import { widgetConfig } from './translations';

  const app = getContext('i18n');
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
    "sveltekit-i18n": "^3.0.0",
    "svelte": ">=5"
  },
  "devDependencies": {
    "sveltekit-i18n": "^3.0.0"
  }
}
```

A regular dependency would install a second copy of the package — and with it a
second copy of the core, whose state the app's instance knows nothing about.

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
    key: 'acmeTable',
    loader: async () => (await FILES[locale]()).default,
  }));
```

- The `key` is the library's namespace — one nobody else is likely to claim, and
  free of `.` characters. Every message is then read as `t('acmeTable.…')`.
- The app says which locales it supports; the library contributes the ones it
  has. Locales it does not translate fall back through the app's
  `fallbackLocale`.
- Keep the loaders lazy (`import()`), so an app that never renders the component
  never fetches its strings.

The app composes them into its own config:

```javascript
// src/lib/translations/index.js
import { tableLoaders } from 'acme-table/i18n';

const locales = ['en', 'cs', 'de'];

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  fallbackLocale: 'en',
  loaders: [
    { locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default },
    { locale: 'cs', key: 'common', loader: async () => (await import('./cs/common.json')).default },
    ...tableLoaders(locales),
  ],
};
```

Nothing else changes: the library's namespace is cached, invalidated,
snapshotted and route-scoped exactly like the app's own.

### 3. For a handful of strings, ship an extension instead

`addTranslations` is the synchronous path — it takes locale-indexed data, merges
it branch by branch, and marks the keys as loaded so matching loaders do not
refire. Packaged as an extension, it runs for every instance the app builds,
per request included:

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
// src/lib/translations/index.js
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

Keys added this way are claimed by no loader, so `snapshot()` always keeps them —
they reach the client with the server's payload.

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
  import { setContext } from 'svelte';
  import { setTableI18n } from 'acme-table';

  let { data, children } = $props();

  setContext('i18n', data.i18n);
  setTableI18n(data.i18n);
</script>

{@render children()}
```

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
// src/hooks.server.js
const supported = ['en', 'cs', 'de'];

/** @type {import('@sveltejs/kit').Handle} */
export const handle = async ({ event, resolve }) => {
  const [, lang] = event.url.pathname.split('/');

  event.locals.locale = supported.includes(lang) ? lang : 'en';

  return resolve(event);
};
```

The root wiring from [SSR and CSR
Considerations](#ssr-and-csr-considerations) is unchanged: `locals.locale` now
comes from the path instead of a cookie, and `url.pathname` still carries the
route. Nothing under `[lang]/` has to load translations again.

### Locale-aware links

```javascript
// src/lib/utils/i18n.js
export const localePath = (path, locale) => `/${locale}${path}`;
```

```svelte
<script>
  import { getContext } from 'svelte';
  import { localePath } from '$lib/utils/i18n';

  const i18n = getContext('i18n');
</script>

<a href={localePath('/about', i18n.locale)}>{i18n.t('common.nav.about')}</a>
```

### Language switcher

`l(locale, key)` reads a locale the call names, which is how each language
renders in its own name:

```svelte
<script>
  import { page } from '$app/state';
  import { getContext } from 'svelte';

  const i18n = getContext('i18n');

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

## Content Management

### Loading from a CMS or an API

A loader is just an async function:

```javascript
/** @type {import('sveltekit-i18n').Config} */
export const config = {
  loaders: [
    {
      locale: 'en',
      key: 'content',
      loader: async ({ locale }) => {
        const response = await fetch(`https://api.cms.example/translations/${locale}`);

        return response.json();
      },
    },
  ],
  cache: 300000, // the browser instance refetches after 5 minutes
};
```

A loader receives `{ locale, route }`, so one factory can serve every locale.

**⚠️ The server builds an instance per request**, so a loader hitting a remote
source runs on every render. Put the caching where it survives that: HTTP cache
headers, a CDN in front of the CMS, or a module-level memo in the loader. The
`cache` window is what keeps the **browser** instance from refetching on every
navigation.

### Keep server-only code out of the shared config

The config is imported by `+layout.server.js` *and* `+layout.js`, so a loader
reaching a database drags server-only code into the client bundle. Put the query
behind an endpoint and let the loader fetch it:

```javascript
// src/routes/api/translations/[locale]/+server.js
import { json } from '@sveltejs/kit';
import { db } from '$lib/server/database';

export const GET = async ({ params }) => json(await db.translations.find({ locale: params.locale }));
```

```javascript
{
  locale: 'en',
  key: 'dynamic',
  loader: async ({ locale }) => (await fetch(`/api/translations/${locale}`)).json(),
}
```

### Mixing static and dynamic

```javascript
const loaders = [
  // Static: fast, versioned with the code
  { locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default },

  // Dynamic: updates without a deployment
  { locale: 'en', key: 'content', loader: async () => (await fetch('/api/translations/en/content')).json() },
];
```

Editors publishing a change can be reflected without a finite `cache`: call
`invalidate()` on the browser instance when the app learns of it (a websocket
message, a poll, an explicit "reload content" action), then trigger a load.

## Testing

### Use a real instance

An instance built from `translations` alone is cheap and **synchronous** — no
loader runs, so there is nothing to await and nothing to mock:

```javascript
import { render } from '@testing-library/svelte';
import { I18n } from 'sveltekit-i18n';
import Greeting from '$lib/components/Greeting.svelte';

const i18n = new I18n({
  initLocale: 'en',
  translations: { en: { 'common.greeting': 'Hello, {{name}}!' } },
});

// Greeting reads the instance from context and renders
// i18n.t('common.greeting', { name })
test('greets the user', () => {
  const { getByText } = render(Greeting, {
    props: { name: 'Alice' },
    context: new Map([['i18n', i18n]]),
  });

  expect(getByText('Hello, Alice!')).toBeInTheDocument();
});
```

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
import { dev } from '$app/environment';

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  cache: dev ? 0 : Number.POSITIVE_INFINITY,
  log: { level: dev ? 'debug' : 'warn' },
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
argument where there is one. The runtime skips a method a logger does not
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
  key: 'common',
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
  key: 'common',
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
  key: 'common',
  loader: async ({ locale, route }) => {
    const start = performance.now();
    const translations = await (await fetch(`/api/translations/${locale}`)).json();

    analytics.track('translations_loaded', { locale, route, duration: performance.now() - start });

    return translations;
  },
}
```

## Summary

**Key takeaways:**

1. **Ownership** – export the config; one instance per request on the server,
   one per app in the browser, reached through context.
2. **Awaiting** – await the promise the trigger returned; `loading` is for UI,
   never for coordination.
3. **Organization** – one loader `key` per route group, scoped with `routes`,
   loaded through dynamic imports.
4. **Caching** – keep the infinite default for files that ship with the app;
   `invalidate()` for event-driven refreshes; cache the fetch, not the instance,
   on the server.
5. **TypeScript** – a config literal for locale completion, `schema` for typed
   keys and payloads, `Extension.Operator` so the pipe keeps both.
6. **Libraries** – ship loaders and translations, never an instance; peer-depend
   on `sveltekit-i18n`; take the instance as a prop or through context.
7. **Testing** – a real instance with inline `translations` is synchronous, so
   there is nothing to mock and nothing to reset.

## See Also

- [Getting Started](./GETTING_STARTED.md) – step-by-step setup tutorial
- [API Documentation](./README.md) – this package's reference
- [Core API reference](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md) – every shared member, in full
- [Curly Message Format parser](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly) – message syntax and `parserOptions`
- [Architecture Overview](./ARCHITECTURE.md) – how it all works
- [Troubleshooting](./TROUBLESHOOTING.md) – common issues and solutions
- [Examples](../examples) – working code examples
