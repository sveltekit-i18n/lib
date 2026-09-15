# Architecture Overview

This document explains how `sveltekit-i18n` is put together: what each package of
the family owns, what this one adds, and how a translation travels from a loader
to the screen. Read it when you want to know *why* the API behaves the way it
does — the member-by-member reference lives in the
[API documentation](./README.md), and the core's own detail in
[base's documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md).

## Table of Contents

- [Package Overview](#package-overview)
- [Package Relationships](#package-relationships)
- [The Reactive Engine](#the-reactive-engine)
- [Data Flow](#data-flow)
- [Loading Strategy](#loading-strategy)
- [Instance Lifetime](#instance-lifetime)
- [Core Concepts](#core-concepts)
- [When to Use Each Package](#when-to-use-each-package)
- [Performance Considerations](#performance-considerations)
- [See Also](#see-also)

## Package Overview

Three packages, one concern each.

### 1. @sveltekit-i18n/base

**Role:** the engine.

**Owns:**
- translation state — the locale, the tables, the loading flag
- loading, deduplication, caching and invalidation
- route matching
- preprocessing (nested payloads to dot notation)
- the extension pipe and the whole public typing

**Does not own:** message interpolation. The core never imports a parser; it
calls the one `config.parser` hands it.

Zero runtime dependencies, `svelte >= 5` as a peer dependency. Its state lives
in `.svelte.ts` modules as `$state` / `$derived` class fields.

### 2. @sveltekit-i18n/parser-curly

**Role:** the message format.

A parser is one function — `parse(value, params, locale, key)` — turning a
stored message and a call's parameters into text. `parser-curly` implements the
[Curly Message Format](https://curlymessage.dev): placeholders,
default values, modifiers and comparisons in double curly braces. It resolves
every message through `@curly-message/parser`, the format's reference
implementation and its only dependency.

`@sveltekit-i18n/parser-icu` is the alternative, wrapping `intl-messageformat`.

### 3. sveltekit-i18n (this package)

**Role:** the composition.

It fills the core's parser slot with `parser-curly`, states the parser's report
channel so an application need not, retypes `loadConfig` to accept the
parser-less config, and re-exports the core's whole surface along with the
parser's types and its parameter extractor. That is
all it is — roughly sixty lines of source. Every member you call afterwards is
the core's.

**One install:**

```bash
npm install sveltekit-i18n
```

Installing `@sveltekit-i18n/base` or `@sveltekit-i18n/parser-curly` beside it
is never necessary and actively harmful: the app then carries two copies of the
core and two reactive graphs, and the instance one module imports is not the one
another module reads.

## Package Relationships

```
┌──────────────────────────────────────────────────────────────┐
│                      Your SvelteKit App                      │
│                                                              │
│   import { I18n } from 'sveltekit-i18n';                     │
│   export const config = { loaders: [...] };                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  sveltekit-i18n                                              │
│                                                              │
│  • builds parser-curly from `config.parserOptions`           │
│  • prepends the parser extension to `config.extensions`      │
│  • re-exports everything base and the parser publish         │
└──────────┬─────────────────────────────────┬─────────────────┘
           │ config.parser                   │ the instance
┌──────────▼──────────────────┐   ┌──────────▼─────────────────┐
│  @sveltekit-i18n/           │   │  @sveltekit-i18n/base      │
│  parser-curly               │◄──┤                            │
│                             │   │  state, loading, caching,  │
│  parse(value, params,       │   │  routes, preprocessing,    │
│        locale, key)         │   │  extensions, typing        │
└─────────────────────────────┘   └────────────────────────────┘
```

### Composition, not inheritance

base v3 exports a **typed facade** over its class, not the class itself — there
is nothing to subclass. So this package does not extend the core and does not
wrap it either: its constructor builds the parser, hands the core a config
carrying it, and returns the core's own instance. In essence:

```javascript
class I18nCurlyParser {
  constructor(config) {
    return new Base({
      ...withParser(config),
      extensions: [withCurlyParser, ...(config?.extensions ?? [])],
    });
  }
}
```

Two consequences worth knowing:

- **Nothing is re-implemented.** There is no method of this package's own
  between you and the core, so behavior cannot drift between the two packages
  and nothing has to be kept in sync.
- **`i18n instanceof I18n` is `false`.** The constructor returns a different
  object than the one `new` created, and `config.extensions` may replace it once
  more. The core makes no `instanceof` guarantee either whenever extensions are
  in play. Documented, not fixed — test for members, not for identity.

### The parser extension

A config passed to the constructor is easy: strip `parserOptions`, put the built
parser in `config.parser`. A config passed **later**, to `loadConfig()`, is the
interesting case — it is a parser-less config too, and the core would take it at
face value and lose the parser.

So the parser is also injected by an extension that patches `loadConfig`:

```
config.extensions = [withCurlyParser, ...yours]
                     └─ patches loadConfig to run every config through
                        the same `withParser` the constructor used
```

It is **prepended** to your pipe, because an extension that augments the
instance copies the properties it finds — a patch applied first is carried by
everything layered on top. And it **returns its input**, so it contributes
nothing to the piped type: the runtime patch cannot drift from the declared one.

The declared one is an intersection:

```typescript
type Instance<C, P, M> = Base<...> & { loadConfig: (config: Config<P, M>) => Promise<void> };
```

Never an `Omit` rewrite. The emitted instance type carries `#private` fields, so
an `Omit`-based rewrite stops being assignable to the core instance, and every
`Extension.Operator` extension in the pipe then resolves its input to `never`.

### Dependency tree

```
sveltekit-i18n
├── @sveltekit-i18n/base          (no runtime dependencies; peer: svelte >=5)
└── @sveltekit-i18n/parser-curly
    └── @curly-message/parser

@sveltekit-i18n/parser-icu        (an alternative to parser-curly)
├── intl-messageformat
└── @formatjs/icu-messageformat-parser
```

Everything is ESM-only, and runs on Node 22+, Bun 1.2+ or Deno 2+. There is no
CJS entry.

## The Reactive Engine

The engine is Svelte 5's. The core's state is `$state` / `$derived` class fields
in `.svelte.ts` modules, and the public surface is **one reactive instance**:

```javascript
export const i18n = new I18n(config);
```

- reactive properties: `locale` (assignable), `locales`, `loading`,
  `initialized`, `translations`, `rawTranslations`
- reactive functions: `t(key, payload?, props?)`, `l(locale, key, payload?, props?)`
- promise-returning methods: `loadTranslations`, `loadConfig`, `setLocale`, `setRoute`
- synchronous methods: `addTranslations`, `invalidate`, `snapshot`, `destroy`

There are **no stores anywhere**: no `$t` / `$locale` / `$loading`
auto-subscription, no `.get()`, `.set()` or `.subscribe()`, no
`loading.toPromise()`. Reading a property is reactive wherever reads are
tracked — a component template, a `$derived`, an `$effect` — and is a plain
property read everywhere else.

**Do not destructure value properties.** A destructured value is a one-time
snapshot; the instance updates, the local binding does not. `t` and `l` survive
destructuring, because their tracked reads happen when they are called. In a
component, destructure through `$derived`:

```svelte
<script>
  import { i18n } from '$lib/translations';

  const { loading, locale } = $derived(i18n);
</script>

{#if loading}Loading…{:else}{locale}{/if}
```

If you want the `$t` form back, add
[`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores)
to `config.extensions` — it adapts the instance to stores without the core
knowing about them.

### The rune modules ship uncompiled

`svelte-package` leaves `.svelte.ts` modules uncompiled on purpose: runes are
compiled by the **consumer's** bundler, against the consumer's Svelte version.
In a SvelteKit app that happens automatically. In a bare Vite or Vitest setup
you have to arrange it yourself — add `@sveltejs/vite-plugin-svelte` and keep
the core from being externalized, or the rune modules reach Node as written
(`$state is not defined`):

```javascript
// vitest.config.ts
export default defineConfig({
  plugins: [svelte()],
  test: {
    server: { deps: { inline: ['@sveltekit-i18n/base'] } },
  },
});
```

## Data Flow

### 1. Construction

```javascript
// src/lib/translations/index.js
import { I18n } from 'sveltekit-i18n';

export const config = {
  loaders: [/* one entry per locale and namespace — see below */],
};

export const i18n = new I18n(config);
```

**What happens, synchronously:**

1. `parserOptions` (empty here) becomes a `parser-curly` instance, with
   `onReport: null` unless the app states a channel.
2. The parser extension is prepended to `config.extensions`.
3. The core is constructed and applies the synchronous prefix of the config —
   the config itself, `config.translations`, the `initLocale` bookkeeping.
4. The extension pipe runs left to right over that configured instance;
   `new I18n(config)` evaluates to the last extension's output.

No loader has run. Loaders are lazy: they fire on the first load trigger.

### 2. Loading

```javascript
// +layout.js
import { i18n } from '$lib/translations';

export const load = async ({ url }) => {
  await i18n.loadTranslations('en', url.pathname);
};
```

```
1. loadTranslations('en', '/')          setLocale and setRoute compose the
   ↓                                    same locale + route pair and enter here
2. normalize the locale ('EN' → 'en'), drop the bookkeeping of every locale
   ↓  whose `cache` window elapsed
3. a load already in flight for this locale AND route?
   ↓  → return its promise, fetch nothing
4. select loaders: locale matches, routes match (or the loader declares none),
   ↓  key not already loaded  → nothing left? activate the locale and resolve
5. run them in parallel; a loader that throws is logged on its own and does
   ↓  not fail the batch
6. merge into `rawTranslations`, preprocess into `translations`, record the
   ↓  keys as loaded, stamp the locale's freshness
7. activate the locale — unless a later request superseded it meanwhile
```

The returned promise is the promise of the **matching** load, so awaiting it
means "the translations I asked for are in place". A load that fails rejects it;
a result you discard is reported through the logger instead and never becomes an
unhandled rejection.

The instance imported above is a module-level singleton, which on the server is
shared by every request in the process — see
[Instance Lifetime](#instance-lifetime) for the per-request wiring.

### 3. Translation

```svelte
<p>{i18n.t('common.greeting', { name: 'Alice' })}</p>
```

```
t('common.greeting', { name: 'Alice' })
   ↓  read the active locale and the translation table — both tracked reads,
   ↓  so the markup re-renders when either changes
translations['en']['common.greeting']  →  'Hello, {{name}}!'
   ↓  an own-property lookup: a prototype key is a miss, and a miss falls
   ↓  back to the fallback locale, then to `fallbackValue`
parser.parse(value, [payload, props], locale, key)
   ↓
'Hello, Alice!'
```

`l(locale, key, …)` is the same path with the locale the call names instead of
the active one.

### 4. Locale switch

```javascript
i18n.locale = 'cs';        // fire and forget
await i18n.setLocale('cs'); // or await the load
```

Assigning `locale` is a shorthand for `setLocale()`. Reading it always gives the
**active** locale — the one whose translations are loaded — so it advances after
step 7 above, never on assignment. Two switches in a row resolving out of order
cannot leave you on the older one: a load activates its locale only if no later
request superseded it. Last request wins.

## Loading Strategy

### Route-based loading

A loader declares the locale it serves, the namespace `key` it fills, and
optionally the `routes` it is needed on:

```javascript
const config = {
  loaders: [
    // No routes → needed everywhere
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    // Exact match → only on '/'
    {
      locale: 'en',
      key: 'home',
      routes: ['/'],
      loader: async () => (await import('./en/home.json')).default,
    },
    // Regular expression → every matching route
    {
      locale: 'en',
      key: 'products',
      routes: [/^\/products/],
      loader: async () => (await import('./en/products.json')).default,
    },
  ],
};
```

A route matches when it equals a string entry or satisfies a `RegExp` entry.
Route patterns are matched against `url.pathname`, which is visitor-controlled —
keep them simple.

### Loaded once per freshness window

The core records which `key`s a locale has loaded. A key already recorded is not
fetched again, whatever triggers the next load — which is why one namespace must
not be split into several route-scoped loaders: as soon as one of them has
supplied the key, the others are skipped, including ones that never had the
chance to run. Give each route group a key of its own.

`addTranslations()` records its keys the same way, so a namespace handed over
statically (or hydrated from a snapshot) keeps the matching loaders from
refetching it.

### Deduplication, and what `loading` means

The in-flight load is keyed by locale **and** route. Concurrent triggers for the
same pair — a layout `load` and a component effect firing together, say — join
the load already running and receive its promise; only one fetch happens.

`loading` is derived from the set of loads currently in flight: `true` while any
of them runs, `false` once the last settles. A trigger that finds nothing to
fetch registers no load at all, so a cache-served navigation does not flicker
the flag. To wait for one specific load, await the promise the method returned —
never poll `loading`.

### Cache and invalidation

Freshness is stamped per locale. `config.cache` (milliseconds, default
`Number.POSITIVE_INFINITY`) says how long that stamp holds; `invalidate(locale?)`
drops it on demand:

```javascript
const config = {
  cache: 3600000, // translations older than an hour refetch on the next trigger
};

i18n.invalidate('en'); // or invalidate() for every locale
```

Both do exactly one thing: drop the bookkeeping that prevents a refetch. Neither
starts a load, and neither removes anything that is on screen — the next load
trigger refetches and the fresh data merges over the old. A load already in
flight when `invalidate()` runs is **severed**: it settles, but its data is
discarded, because it predates the invalidation and applying it would resurrect
the bookkeeping the call just dropped.

### Server and client

Both run the same code; what differs is the lifetime of the instance — one per
request on the server (see below), one per session in the browser. The client
instance starts from the server's snapshot, so its loaders fetch only what the
snapshot left out: the route-scoped namespaces of pages the visitor has not
opened yet, and the locales they switch to.

## Instance Lifetime

### One instance per request on the server

A module that creates an instance is evaluated **once per process** on the
server, not once per request. A module-level instance is therefore shared by
every visitor rendered concurrently, and one visitor's locale ends up in
another's HTML.

So export the **config**, and build the instance where the request is:

```javascript
// src/lib/translations/index.js
export const config = {
  loaders: [/* ... */],
};
```

```javascript
// src/routes/+layout.server.js
import { I18n } from 'sveltekit-i18n';
import { config } from '$lib/translations';

export const load = async ({ url, locals }) => {
  const i18n = new I18n(config);

  await i18n.loadTranslations(locals.locale, url.pathname);

  return { locale: locals.locale, translations: i18n.snapshot() };
};
```

```javascript
// src/routes/+layout.js
import { browser } from '$app/environment';
import { I18n } from 'sveltekit-i18n';
import { config } from '$lib/translations';

// Assigned in the browser only — on the server this module-level binding
// would be the shared state we are avoiding.
let client;

export const load = async ({ data, url }) => {
  // `data` is null when no route matched: the error page renders through this
  // load too, and on a static host that is every unknown URL.
  const i18n = client ?? new I18n({ ...config, translations: data?.translations });

  if (browser) client = i18n;

  await i18n.loadTranslations(data?.locale ?? config.fallbackLocale, url.pathname);

  return { i18n };
};
```

Pass it down with `setContext` and read it with `getContext`; the instance is
reactive, so components re-render on a locale change with no subscription of any
kind. The full four-step wiring is in
[base's SSR section](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#server-side-rendering).

A module-level singleton is still fine when the server renders nothing
visitor-specific — a client-only app (`export const ssr = false`), or one locale
for every request.

### What `snapshot()` carries

`snapshot()` serializes the **active locale** and the **`fallbackLocale`**,
narrowed to the current route, in the pre-preprocess shape. The receiving
instance hands it to `config.translations`, which both fills its tables and
records those keys as loaded — so the same data is not fetched twice. What the
payload leaves out is deliberate: other locales, and keys claimed only by
loaders whose routes do not match. Freshness is not transferred either; a
hydrated locale's cache window starts when the client receives the data.

### `destroy()`

An instance with a shorter life than the app should be released:

```svelte
<script>
  import { I18n } from 'sveltekit-i18n';
  import { config } from '$lib/translations';

  const i18n = new I18n(config);

  $effect(() => () => i18n.destroy());
</script>
```

It detaches the instance from its loading lifecycle: in-flight loads settle with
their data discarded, `loading` drops to `false`, and every further load or
mutation call is ignored with a warning. Reads keep working, so a component
still tearing down renders instead of breaking. It is idempotent, and a
module-level singleton never needs it.

## Core Concepts

### Preprocessing

Loaded payloads are stored twice: `rawTranslations` as they arrived,
`translations` after `config.preprocess` ran over them. The default, `'full'`,
flattens nested objects and arrays to dot notation.

**Input:**

```json
{
  "user": {
    "profile": { "name": "Name", "email": "Email" }
  }
}
```

**Stored in `translations`:**

```json
{
  "user.profile.name": "Name",
  "user.profile.email": "Email"
}
```

The lookup is then a single own-property access, and the key in your markup is
the key in your file. `'preserveArrays'` keeps arrays as arrays, `'none'` stores
the payload as it came, and a function does it your way. `addTranslations()`
runs the same transformation, so the two tables never disagree — and `snapshot()`
serializes the raw one, letting the receiving instance apply its own setting.

### The parser contract

The core never imports a parser. It calls the one it was configured with:

```typescript
parse(value: unknown, params: ParserParams, locale: string, key: string): ParserOutput;
```

Four arguments, always: the stored `value` read as an **own** property after
preprocessing (`undefined` when neither the active locale nor the fallback has
the key), the `params` of the `t`/`l` call untouched (`[]` when there were
none), the normalized `locale`, and the dot-notation `key`. In return the
parser must not throw — not on a missing message, not on surplus parameters:
`parse` runs on the render path. Everything else is the format's business,
including what the parameters mean. For `parser-curly` they are the payload and
the per-call modifier props, which is why `t(key, payload?, props?)` has the
shape it has.

The **build-time** half of the contract — reading a message and reporting the
parameters it names, for a schema generator — is deliberately not a member of
the runtime parser object. A message scanner reachable from `config.parser`
could never be shaken out of a browser bundle; kept separate, it never lands
there.

### Namespaces

A loader's `key` is a namespace, and it prefixes every key it contributes:
`{ key: 'common' }` loading `{ greeting: '…' }` is read as
`i18n.t('common.greeting')`. Namespaces are what makes route-scoped loading
possible, keep the first payload small, and let teams own separate files. Keys
must not contain dots — the dot is the separator.

### Typing is construction-time

The type of `new I18n(config)` is computed from the config that reaches the
constructor:

- **`config.schema`** narrows `t` and `l` — their keys and each key's payload.
  It is read as a **type only**, so the slot may hold an empty value:
  `schema: {} as { 'common.greeting': { name: string } }`. A schema whose keys
  are not a closed set degrades to plain `string` keys instead of rejecting
  every call. A generator for it is 3.1 work
  ([#234](https://github.com/sveltekit-i18n/lib/issues/234)); v3 ships the slot.
- **One payload type for every message** is stated through the type arguments
  instead: `new I18n<Config<Payload>, Payload>(config)`.
- **The locales the config spells** complete `setLocale`, `l`, `invalidate` and
  the reads. The union stays open — a locale can arrive from a URL, a cookie or
  an `Accept-Language` header — so it is a completion hint, never a constraint.
- **The extension pipe folds the type** left to right, so the expression's type
  is the last extension's output. An extension typed by a fixed return type
  erases the schema and the locale union; one that declares its dependency on
  its input with an `Extension.Operator` keeps them.

A later `loadConfig()` cannot retype an existing instance — it reconfigures the
runtime, not the type. See
[base's TypeScript section](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#typescript)
for the full rules.

## When to Use Each Package

### `sveltekit-i18n`

```javascript
import { I18n } from 'sveltekit-i18n';
```

**When:**
- the Curly Message Format fits — placeholders, defaults, modifiers, comparisons
- you want one install, one version to track, and no parser wiring
- you want base's whole surface reachable without adding it as a dependency

**Best for:** almost every application.

### `@sveltekit-i18n/base` plus a parser

```javascript
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';

export const i18n = new I18n({
  parser: parser({ onReport: null }), // a parser package requires the channel to be stated
  loaders: [/* ... */],
});
```

**When:**
- you need ICU message format, or a parser of your own
- you are porting messages from another library and must keep their syntax

**Best for:** projects whose message format is already decided.

Pick one of the two. They are not layers you stack: this package *is* base with
the parser slot filled, and installing both gives the app two cores.

## Performance Considerations

**Lookup.** Translations are flattened once, at load time, so `t()` is an
own-property access plus the parser call. Prototype keys (`__proto__`,
`constructor`, …) are treated as missing rather than inherited.

**Loading.** Every loader runs at most once per locale per freshness window, and
duplicate triggers join the load in flight instead of doubling it. Route-scoped
namespaces keep the first payload to what the landing page needs; everything
else arrives on navigation.

**Rendering.** Reactivity is Svelte 5's own: a locale change invalidates the
components that actually read the instance, not the tree around them.

**Transfer.** `snapshot()` ships the active locale and the fallback for the
current route — not the whole table — and marks those keys as loaded on the
client so hydration fetches nothing twice.

**Bundle.** The core has no runtime dependencies; `parser-curly`'s only
dependency is the format's reference implementation. Everything is ESM with
`sideEffects: false`, so what an app does not import is dropped, and the
parser's build-time surface never reaches the browser (see
[The parser contract](#the-parser-contract)).

## See Also

- [Getting Started](./GETTING_STARTED.md) – learn by building
- [API Documentation](./README.md) – complete reference
- [Best Practices](./BEST_PRACTICES.md) – recommended patterns
- [Troubleshooting](./TROUBLESHOOTING.md) – symptoms and their causes
- [base documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md) – the core, member by member
- [parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly) – the message format
- [extensions](https://github.com/sveltekit-i18n/extensions) – official extensions, including the store adapter
