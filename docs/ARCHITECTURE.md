# Architecture Overview

This document explains how `sveltekit-i18n` is put together: what each package of
the family owns, what this one adds, and how a translation travels from a loader
to the screen. Read it when you want to know *why* the API behaves the way it
does — the member-by-member reference lives in the
[API documentation](./README.md), and the core's own detail in
[base's documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md).

The snippets import from `src/lib` through `#lib`, the entry `sv create`
scaffolds in the `imports` field of a SvelteKit 3 app's `package.json`, and name
the file's extension, which TypeScript needs to resolve such an import. A
SvelteKit 2 app adds the same entry, `"imports": { "#lib/*": "./src/lib/*" }`,
or imports from `$lib` instead, without the extension — as it must on Vite 5
when a `.ts` file is imported from a `.js` module or a plain `<script>`.

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
- route matching and route params
- preprocessing (nested payloads to dot notation)
- the SSR hand-off (`snapshot()` and `hydrate()`)
- the extension pipe and the whole public typing
- the SvelteKit wiring (`@sveltekit-i18n/base/kit`) and the pure helpers
  (`@sveltekit-i18n/base/utils`)

**Does not own:** message interpolation. The core never imports a parser; it
calls the one `config.parser` hands it.

Zero runtime dependencies, `svelte >= 5` as a peer dependency. Its state lives
in `.svelte.ts` modules as `$state` / `$derived` class fields.

### 2. @sveltekit-i18n/parser-curly

**Role:** the message format.

A parser is one function — `parse(value, params, locale, key)` — turning a
stored message and a call's parameters into text. `parser-curly` implements the
[Curly Message Format](https://curlymessage.dev): placeholders,
default values, modifiers, comparisons and plural selection in double curly
braces. It resolves
every message through `@curly-message/parser`, the format's reference
implementation and its only dependency.

The alternatives are `@sveltekit-i18n/parser-icu`, wrapping
`intl-messageformat`; `@sveltekit-i18n/parser-mf2`, wrapping `messageformat`
(Unicode MessageFormat 2); and `@sveltekit-i18n/parser-i18next`, wrapping
`i18next` for catalogues written in its syntax.

### 3. sveltekit-i18n (this package)

**Role:** the composition.

It fills the core's parser slot with `parser-curly`, states the parser's report
channel so an application need not, retypes `loadConfig` to accept the
parser-less config, and re-exports the core's whole surface along with the
parser's build-time half — its types, `extractParamsFactory` and `cst`. Its
`/kit` hands the core's `defineI18n` a config carrying the parser, so every
instance the wiring builds interpolates; its `/utils` re-exports the core's
helpers. That is all it is — roughly a hundred lines of source. Every member
you call afterwards is the core's.

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
│   import { defineI18n } from 'sveltekit-i18n/kit';           │
│   export const config = { loaders: [...] };                  │
└───────────────────────────┬──────────────────────────────────┘
                            │
┌───────────────────────────▼──────────────────────────────────┐
│  sveltekit-i18n                                              │
│                                                              │
│  • builds parser-curly from `config.parserOptions`           │
│  • prepends the parser extension to `config.extensions`      │
│  • /kit: base's defineI18n, the parser in every instance     │
│  • re-exports all of base, and the parser's build-time half  │
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
└── intl-messageformat

@sveltekit-i18n/parser-mf2        (an alternative to parser-curly)
└── messageformat

@sveltekit-i18n/parser-i18next    (an alternative to parser-curly)
└── i18next

@sveltekit-i18n/extension-stores        (no runtime dependencies; peers: base, svelte)
@sveltekit-i18n/extension-typed-access  (no runtime dependencies; peers: base, svelte)
@sveltekit-i18n/extension-html          (peers: base, svelte)
└── parse5

@sveltekit-i18n/typegen           (build time; peer: vite; optional: base or sveltekit-i18n, @sveltejs/kit)
```

Everything is ESM-only; there is no CJS entry. The core, this package and the
parsers run on Node 22+ (22.12+ for `parser-mf2`), Bun 1.2+ or Deno 2+; the
extensions state Node 22+; typegen needs 22.12+, the floor of its `vite` 8 peer.

## The Reactive Engine

The engine is Svelte 5's. The core's state is `$state` / `$derived` class fields
in `.svelte.ts` modules, and the public surface is **one reactive instance**:

```javascript
export const i18n = new I18n(config);
```

- reactive properties: `locale` (assignable), `locales`, `loading`,
  `initialized`, `translations`, `rawTranslations`
- reactive functions: `t(key, payload?, props?)`, `l(locale, key, payload?, props?)`
- promise-returning methods: `loadTranslations`, `preload`, `loadNamespace`, `loadConfig`, `setLocale`, `setRoute`
- synchronous methods: `addTranslations`, `invalidate`, `snapshot`, `hydrate`, `destroy`

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
  import { i18n } from '#lib/i18n.js';

  const { loading, locale } = $derived(i18n);
</script>

{#if loading}Loading…{:else}{locale}{/if}
```

If you want the `$t` form back, add
[`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores)
to `config.extensions` — it adapts the instance to stores without the core
knowing about them. The other official extensions work the same way:
[`@sveltekit-i18n/extension-typed-access`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-typed-access)
reads keys as members of `t`, and
[`@sveltekit-i18n/extension-html`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-html)
adds a `T` component that renders the markup a message carries.

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
// src/lib/i18n.js
import { I18n } from 'sveltekit-i18n';

export const config = {
  loaders: [/* descriptors naming locales and namespaces — see below */],
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
import { i18n } from '#lib/i18n.js';

export const load = async ({ url }) => {
  await i18n.loadTranslations('en', url.pathname);
};
```

```
1. loadTranslations('en', '/')          setLocale and setRoute compose the
   ↓                                    same locale + route pair and enter here
2. normalize the locale ('EN' → 'en'), strip `basePath` from the route, drop
   ↓  the bookkeeping of every locale whose `cache` window elapsed
3. select loaders: locale matches, routes match (or the loader declares none);
   ↓  a named group in the matching route RegExp gives the loader its params
4. drop the loaders already recorded for those params (a `cache: false` one
   ↓  always runs)  → nothing left? activate the locale and resolve
5. a load in flight for this locale, route and selection?
   ↓  → join it and receive its promise; otherwise share, per loader, a fetch
   ↓    in flight for the same params
6. run the rest in parallel; a loader that throws is logged on its own and
   ↓  does not fail the batch — SvelteKit's redirect() and error() below 500
   ↓  reject the load once the others settled
7. apply to `rawTranslations` (a loader that delivered before replaces its
   ↓  earlier part), preprocess into `translations`, record each loader with
   ↓  its params, stamp the locale's freshness
8. activate the locale — unless a later request superseded it meanwhile
```

The returned promise is the promise of the **matching** load, so awaiting it
means "the translations I asked for are in place". A load that fails rejects it
— and a call rejected by a loader's control flow is undone, so the locale does
not advance; a result you discard is reported through the logger instead and
never becomes an unhandled rejection.

`loadTranslations(locale, route, { activate: false })` and `loadNamespace()`
are warm loads: they only fill the tables. They run the same pipeline without
step 8 and without the expiry in step 2 — only an activating trigger evaluates
the `cache` window — and `loadNamespace()` selects in step 3 by namespace
rather than by route, ignoring the loaders' `routes`. Data a warm load fetches
for other route params than the current route asks for is kept aside, and the
trigger that asks for those params applies it without a second fetch.

The instance imported above is a module-level singleton, which on the server is
shared by every request in the process, and this `load` activates it for a
preload too — a page a hovered link leads to. See
[Instance Lifetime](#instance-lifetime) for the wiring that does neither.

`preload(locale, route)` is the request of a navigation that may never commit.
Like an activating trigger, it evaluates the `cache` window in step 2 and runs
a `cache: false` loader; like a warm load, it shows nothing — it activates
nothing in steps 4 and 8, and lands what it fetched as a warm load does, data
for other route params kept aside. It resolves to a token. The call that
commits the navigation takes it as `{ preloaded }`, shows what the preload
fetched instead of fetching it again, and leaves expiry to the preload; what
the preload shared from a `cache: false` fetch already in flight is shown, then
fetched again behind it.

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

A loader declares the locales it serves, the `namespace` it fills, and
optionally the `routes` it is needed on:

```javascript
/** @satisfies {import('sveltekit-i18n').Config} */
const config = {
  loaders: [
    // No routes → needed everywhere; one call per locale
    {
      locale: ['en', 'cs'],
      namespace: 'common',
      loader: async ({ locale }) => (await import(`./${locale}/common.json`)).default,
    },
    // Exact match → only on '/'
    {
      locale: 'en',
      namespace: 'home',
      routes: ['/'],
      loader: async () => (await import('./en/home.json')).default,
    },
    // Regular expression with a named group → every product page, with params
    {
      locale: 'en',
      namespace: 'product',
      routes: [/^\/products\/(?<id>[^/]+)/],
      loader: async ({ params }) => (await fetch(`${import.meta.env.VITE_API_ORIGIN}/api/products/${params.id}/i18n/en`)).json(),
    },
  ],
};
```

A route matches when it equals a string entry, satisfies a `RegExp` entry or
passes a matcher's `test`, after [`basePath`](./README.md#basepath) is
stripped. Route patterns are matched against `url.pathname`, which is
visitor-controlled — keep them simple.

### Loaded once per freshness window and route params

The core records each loader that delivered, under the params its routes
captured. A loader recorded for those params is not fetched again, whatever
triggers the next load; new params run it again, and its new data replaces
what it delivered for the old ones, while its siblings keep their part. The
record is per loader, not per namespace, so one namespace may be split into
several route-scoped loaders: each part loads on its own route and merges into
the rest.

A loader that throws records nothing and runs again on the next trigger.
Seeds — `config.translations` and `addTranslations()` — record nothing either:
the loaders of their namespaces still run and merge over them. Only a hand-off
from a server, through `hydrate()`, marks loaders as loaded without running
them.

### Deduplication, and what `loading` means

The in-flight load is keyed by what a trigger selected — the locale, and each
loader with its params — and the route it came from. Concurrent triggers with
the same key — a layout `load` and a component effect firing together, say —
join the load already running and receive its promise; only one fetch
happens. A trigger that joins no load still shares, per loader, a fetch in
flight for the same params and route. A load of another route fetches for its
own, since a loader receives the route.

`loading` is derived from the set of **activating** loads currently in flight:
`true` while any of them runs, `false` once the last settles. A warm load
(`{ activate: false }`, `loadNamespace()`) counts only once an activating
trigger joins it, a `preload()` does not count, and a trigger that finds
nothing to fetch registers no load at all, so a cache-served navigation does
not flicker the flag. To wait for one specific load, await the promise the
method returned — never poll `loading`.

### Cache and invalidation

Freshness is stamped per locale. `config.cache` (milliseconds, default
`Number.POSITIVE_INFINITY`) says how long that stamp holds, and the next
activating trigger after it elapses runs the loaders again;
`invalidate(locale?, namespace?)` drops the records on demand, for a locale, a
namespace, or both:

```javascript
const config = {
  cache: 3600000, // translations older than an hour refetch on the next trigger
};

i18n.invalidate('en');             // every English namespace
i18n.invalidate(undefined, 'cms'); // one namespace, in every locale
```

Both do exactly one thing: drop the bookkeeping that prevents a refetch. Neither
starts a load, and neither removes anything that is on screen — the next load
trigger refetches, and each loader's fresh data replaces what it delivered
before, so a key its source dropped goes once the refetch lands (seeded data,
a plain `hydrate()`'s included, stays). A loader already in
flight for what was invalidated is **severed**: its data is discarded, because
it predates the invalidation, while the rest of its load lands. An activating
trigger still in flight fetches the severed part again before it activates, so
its promise keeps meaning "loaded".

A loader with `cache: false` keeps no freshness of its own: its source caches
(a remote `query`, an SWR layer), so it runs on every trigger that selects it,
starts no window and is outside expiry. A call handed a `preload()` token
shows what that preload fetched of it instead of running it again; what the
preload shared from a fetch already in flight is shown, then fetched again
behind it, since that fetch started before the navigation was requested.

### Server and client

Both run the same code; what differs is the lifetime of the instance — one per
request on the server, one per tab in the browser. The client instance starts
from the server's state through `hydrate()`, so its loaders fetch only what the
server did not load: the route-scoped namespaces of pages the visitor has not
opened yet, the locales they switch to, and the few namespaces the snapshot
cannot hand over.

## Instance Lifetime

### One instance per request on the server

A module that creates an instance is evaluated **once per process** on the
server, not once per request. A module-level instance is therefore shared by
every visitor rendered concurrently, and one visitor's locale ends up in
another's HTML.

So export the **config**, and let `sveltekit-i18n/kit` build the instances:

```javascript
// src/lib/i18n.js
import { defineI18n } from 'sveltekit-i18n/kit';

export const config = {
  loaders: [/* ... */],
};

export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
```

`hooks.server.js` exports `handle`, both root layout files export `load`, the
root `+layout.svelte` calls `use(() => data)`, and components call `get()`.
Behind that:

- **The server** builds a fresh instance per request, negotiates the locale
  (`preferredLocale`, `Accept-Language`, `initLocale`, `fallbackLocale`, the
  first locale the config serves), loads it for the route and returns
  `snapshot({ records: true })` on a page render — only the locale and the
  route on a client navigation.
- **The browser** builds one instance per tab from that snapshot with
  `hydrate()`, so it is active before the first render and the loaders the
  server ran do not run again. Every later pass preloads the target locale for
  the new route with `preload()`, since it may never commit; `use()` switches
  the locale and sets the route as the navigation commits, showing what that
  preload fetched.
- **The server's answer rules**: a client `setLocale()` stands until the
  server answers differently.

The instance is reactive, so components re-render on a locale change with no
subscription of any kind. The same wiring by hand is in
[Server-Side Rendering](./README.md#server-side-rendering).

A module-level singleton is still fine when the server renders nothing
visitor-specific — a client-only app (`export const ssr = false`), or one locale
for every request and no loader whose `routes` capture params.

### What the hand-off carries

`snapshot({ records: true })` serializes the **active locale** and the
**`fallbackLocale`** in the pre-preprocess shape, together with the records of
the loaders that delivered it — each loader's id and params signature, never a
reference — the active locale and the route. It is plain data, so SvelteKit
serializes it like any other load data. `hydrate()` resolves each record to a
loader of its own config, so those loaders do not run again for the same
params, displays the data, and restores the locale and the route.

Data no record names is displayed, but keeps no loader from running: whatever
the envelope does not cover loads again rather than going missing. It is
applied on top of the config, so the config's own `translations` stay.
Freshness is not transferred; a hydrated locale's cache window starts when the
client receives the data.

The plain `snapshot()` carries data without records. A plain hand-off
(`hydrate({ translations })`) then keeps the loaders without route params of
every namespace the data names from running, which is why the plain form leaves
out what plain data cannot describe — a namespace fed by several loaders, one
whose loader captures params, and one none of whose loaders delivered.

### `destroy()`

An instance with a shorter life than the app should be released:

```svelte
<script>
  import { I18n } from 'sveltekit-i18n';
  import { config } from '#lib/i18n.js';

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
and `hydrate()` run the same transformation, so the two tables never disagree —
and `snapshot()` serializes the raw one, letting the receiving instance apply
its own setting.

### The parser contract

The core never imports a parser. It calls the one it was configured with:

```typescript
parse(value: unknown, params: ParserParams, locale: string, key: string): ParserOutput;
```

Four arguments, always: the stored `value` read as an **own** property after
preprocessing, the `params` of the `t`/`l` call untouched (`[]` when there were
none), the normalized `locale`, and the dot-notation `key`. A key neither the
active locale nor the fallback has never reaches the parser: the core answers it
with `fallbackValue`. In return the
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

A loader's `namespace` prefixes every key it contributes:
`{ namespace: 'common' }` loading `{ greeting: '…' }` is read as
`i18n.t('common.greeting')`. Namespaces are what makes route-scoped loading
possible, keep the first payload small, and let teams own separate files. A
namespace must not contain dots — the dot is the separator. The 3.0 spelling,
`key`, still works and logs a deprecation warning.

### Typing is construction-time

The type of `new I18n(config)` is computed from the config that reaches the
constructor:

- **A schema** narrows `t` and `l` — their keys and each key's payload. The
  app registers one for every instance in the global
  `SvelteKitI18n.Register` interface (a global script,
  `interface Register { schema: TranslationSchema }`), and every instance whose
  config states no `schema` is typed by it. The core declares the interface
  empty; this package adds nothing to it and needs no code for it: its
  constructor and `defineI18n` resolve their type through the core's
  `Schema.FromConfig`, which reads the registry. A config may instead state
  `config.schema`, read as a **type only**, so the slot may hold an empty
  value: `schema: {} as { 'common.greeting': { name: string } }`. A stated
  closed schema wins over the registry; a schema whose keys are not a closed
  set (`schema: {}`, `Record<string, …>`) degrades to plain `string` keys
  instead of rejecting every call, and keeps the registry out — the opt-out.
  The config's type is what is read: inferred from the value, or the one passed
  as the first type argument, which then decides on its own.
  The registry covers the whole program, so only the app registers, never a
  library. It needs `sveltekit-i18n` 3.1; an older core ignores it. This
  package ships the slot and the registry;
  [`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen), a
  Vite plugin installed on its own, fills them from your translations, reading payloads through the
  re-exported `extractParamsFactory`. With `/kit`, the schema in the config
  handed to `defineI18n` — or the registered one — types `get()`, `use()` and
  `data.i18n`.
- **One payload type for every message** is stated through the type arguments
  instead: `new I18n<Config<Payload>, Payload>(config)`. That is for an app
  without a registered schema: `Config<Payload>` leaves the schema slot `any`,
  so the registry types the instance otherwise, unless the type argument
  replaces the slot — the
  [opt-out](./README.md#one-payload-type-for-every-message).
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
- you need ICU, Unicode MessageFormat 2 or the i18next syntax, or a parser of
  your own
- you are porting messages from another library and must keep their syntax

**Best for:** projects whose message format is already decided.

Pick one of the two. They are not layers you stack: this package *is* base with
the parser slot filled, and installing both gives the app two cores.

### Beside either

The companion packages are installed on their own, beside whichever core the
app has:

- [`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen) – a
  Vite plugin, build time only, when keys and payloads should be typed from the
  catalogue
- [`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores)
  – when code reads `$t`, `$locale` and `$loading`, as v2 did
- [`@sveltekit-i18n/extension-typed-access`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-typed-access)
  – when keys should read as members of `t`, `t.home.title()`
- [`@sveltekit-i18n/extension-html`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-html)
  – when a message carries markup to render as elements; with `parser-icu`,
  pass its `ignoreTag: true`

`extension-stores` returns no instance, so it goes after the other two in
`config.extensions` (see [the pipe order](./README.md#pipe-order)).

## Performance Considerations

**Lookup.** Translations are flattened once, at load time, so `t()` is an
own-property access plus the parser call. Prototype keys (`__proto__`,
`constructor`, …) are treated as missing rather than inherited.

**Loading.** Every loader runs at most once per locale per freshness window and
route params (a `cache: false` one leaves that to its source), and duplicate
triggers join the load in flight instead of doubling it. Route-scoped loaders
keep the first payload to what the landing page needs; everything else arrives
on navigation, or on demand through `loadNamespace()`.

**Rendering.** Reactivity is Svelte 5's own: a locale change invalidates the
components that actually read the instance, not the tree around them.

**Transfer.** `snapshot({ records: true })` ships what the instance holds for
the active locale and the fallback — not every locale — with the records of the
loaders that delivered it, so `hydrate()` keeps those loaders from fetching the
same data twice.

**Bundle.** The core has no runtime dependencies; `parser-curly`'s only
dependency is the format's reference implementation. Everything is ESM, and
this package and the parsers declare `sideEffects: false`, so what an app does
not import from them is dropped, and the parser's build-time surface never
reaches the browser (see [The parser contract](#the-parser-contract)).
`extension-html` adds the one runtime dependency of the extensions, `parse5`,
to the client bundle; its README gives the
[size](https://github.com/sveltekit-i18n/extensions/tree/master/extension-html#size).

## See Also

- [Getting Started](./GETTING_STARTED.md) – learn by building
- [API Documentation](./README.md) – complete reference
- [Best Practices](./BEST_PRACTICES.md) – recommended patterns
- [Troubleshooting](./TROUBLESHOOTING.md) – symptoms and their causes
- [base documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md) – the core, member by member
- [typegen](https://github.com/sveltekit-i18n/typegen) – generates the `schema` type
- [parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly) – the message format
- [extensions](https://github.com/sveltekit-i18n/extensions) – official extensions: the store adapter, typed member access and markup rendering
