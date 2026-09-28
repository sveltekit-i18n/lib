# sveltekit-i18n API Documentation

Complete API reference for `sveltekit-i18n` – [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base)
wired with [`@sveltekit-i18n/parser-curly`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly),
shipped as one install.

## Table of Contents

- [What this package is](#what-this-package-is)
- [Installation and packaging](#installation-and-packaging)
- [Configuration](#configuration)
- [Parser options](#parser-options)
- [The instance](#the-instance)
- [Message format](#message-format)
- [Exported types](#exported-types)
- [Utilities](#utilities)
- [TypeScript](#typescript)
- [Extensions](#extensions)
- [SvelteKit](#sveltekit)
- [Server-Side Rendering](#server-side-rendering)
- [Testing components that translate](#testing-components-that-translate)
- [Migrating from v2](#migrating-from-v2)
- [Upgrading from 3.0](#upgrading-from-30)
- [See Also](#see-also)

## What this package is

The core owns translation state, loading, caching, route matching and
preprocessing. It does **not** own message interpolation — a parser does, and
the core takes one through `config.parser`. This package fills that slot with
`parser-curly` and re-exports the core's whole surface, so an application
installs one package and never states a parser.

What follows from that:

- **`config` has no `parser` slot.** Passing one is a type error. The parser's
  own options live under [`config.parserOptions`](#parser-options).
- **Everything else is the core's**, unchanged. The members below are the core's
  members; this document describes them at the level a consumer of this package
  needs and links to the
  [base API documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md)
  for the full detail.
- **Every name the core publishes is reachable from here.** `Config` and
  `Parser` already name this package's own types, so the core's namespaces of
  those names are re-exported as [`BaseConfig` and `BaseParser`](#exported-types).
- **Three entry points, like the core's.** `sveltekit-i18n` carries the
  instance and the types, [`sveltekit-i18n/kit`](#sveltekit) the SvelteKit
  wiring, and [`sveltekit-i18n/utils`](#utilities) the helpers. Every instance
  either of the first two builds has the parser in place.

```javascript
// src/lib/i18n.js
import { I18n } from 'sveltekit-i18n';

export const config = {
  loaders: [
    {
      locale: ['en', 'cs'],
      namespace: 'common',
      loader: async ({ locale, namespace }) => (await import(`./translations/${locale}/${namespace}.json`)).default,
    },
  ],
};

export const i18n = new I18n(config);
```

`I18n` is a named export; the default export is the same binding, so
`import I18n from 'sveltekit-i18n'` works too. A module-level instance like
this one suits a client-only app; an app that renders on a server builds its
instances through [`sveltekit-i18n/kit`](#sveltekit).

**⚠️ `i18n instanceof I18n` is `false`.** The constructor returns the core's
instance rather than one of its own, and [`config.extensions`](#extensions) may
replace it again. Feature-detect (`typeof i18n.t === 'function'`) if you have to
test a value; the caveat is documented rather than fixed.

## Installation and packaging

```bash
npm install sveltekit-i18n
```

That is the whole install. `@sveltekit-i18n/base` and
`@sveltekit-i18n/parser-curly` come with it.

**⚠️ Do not install them alongside.** Two copies of the core in one application
means two reactive graphs: an instance built from one of them is invisible to
components reading the other. Every name the core publishes is reachable from
here — [`tests/specs/exports.spec.ts`](../tests/specs/exports.spec.ts) fails if
one stops being — so nothing this package builds on has to be installed beside
it. Of the parser this package re-exports its types (`Parser`, `Modifier`,
`Report`, `Cst`) and its build-time [`extractParamsFactory`](#extractparamsfactory)
and [`cst`](#cst); the parser factory itself is wired internally, so there is
nothing to construct.

| Aspect | Requirement |
| --- | --- |
| Module format | ESM only — there is no CJS entry |
| Node | `>=22` |
| Svelte | `>=5` (peer dependency; the instance is runes-based) |

The core ships its rune modules **uncompiled**, for the consumer's bundler to
compile. In a SvelteKit application that is automatic. In a bare Vite or Vitest
setup, add `@sveltejs/vite-plugin-svelte` and make sure the core is not
externalized — in Vitest that means `test.server.deps.inline`, since an
externalized dependency never reaches the plugin.

## Configuration

The config is the core's config minus `parser`, plus `parserOptions`:

```javascript
import { I18n } from 'sveltekit-i18n';

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  loaders: [/* ... */],
  parserOptions: {/* parser-curly options */},
};

export const i18n = new I18n(config);
```

Every slot is optional. An instance built with no config at all is valid — it
renders nothing until [`loadConfig()`](#loadconfigconfig) gives it one.

| Slot | Type | Default | What it does |
| --- | --- | --- | --- |
| [`parserOptions`](#parser-options) | `Parser.Options`, with `onReport` optional | `{ onReport: null }` | options for the bundled curly parser |
| `loaders` | `readonly Loader.LoaderModule[]` | – | how and when translations are fetched |
| `translations` | `Translations.T` | – | locale-indexed seed data, present before any loader runs |
| `basePath` | `string` | – | SvelteKit's `kit.paths.base`, stripped from every route handed in |
| `initLocale` | `string` | – | load and activate this locale on construction |
| `fallbackLocale` | `string` | – | locale read when a key is missing in the active one |
| `fallbackValue` | `any` | the key itself | what `t`/`l` return for a missing key |
| `preprocess` | `'full' \| 'preserveArrays' \| 'none' \| fn` | `'full'` | how loaded data is transformed before it is stored |
| `sanitizeLocales` | `boolean \| (locale) => string` | `true` | how locale identifiers are normalized |
| `cache` | `number` (ms) | `Number.POSITIVE_INFINITY` | how long loaded translations stay fresh |
| `log` | `{ level?, prefix?, logger? }` | `{ level: 'warn', prefix: '[i18n]: ', logger: console }` | diagnostics |
| `schema` | type-only map of key → payload | – | types the keys and payloads of `t`/`l` |
| `extensions` | `readonly Extension.T[]` | `[]` | adapter functions the constructed instance is piped through |

### `loaders`

Each entry declares a `locale`, a `namespace` (the prefix its data is stored
under — no dots) and an async `loader`. Both `locale` and `namespace` may be
arrays: the descriptor then stands for one loader per locale and namespace
pair, called with that pair in its props. An optional `routes` array scopes
it: a string (an exact match), a `RegExp`, or anything with a `test` method,
matched against the route path without [`basePath`](#basepath).

```javascript
import { PUBLIC_API_ORIGIN } from '$env/static/public';

const config = {
  loaders: [
    // Every page, one call per locale and namespace
    {
      locale: ['en', 'cs'],
      namespace: ['common', 'nav'],
      loader: async ({ locale, namespace }) => (await import(`./${locale}/${namespace}.json`)).default,
    },
    // Product pages only
    {
      locale: 'en',
      namespace: 'products',
      routes: [/^\/products/],
      loader: async () => (await import('./en/products.json')).default,
    },
    // A named group is a route param, handed to the loader
    {
      locale: 'en',
      namespace: 'article',
      routes: [/^\/article\/(?<id>[^/]+)/],
      loader: async ({ locale, params }) => (await fetch(`${PUBLIC_API_ORIGIN}/api/articles/${params.id}/i18n/${locale}`)).json(),
    },
  ],
};
```

A loader receives `{ locale, namespace, route, params }` — plain data, so it
can be backed by anything, a SvelteKit remote `query` included. A loader runs on the server too, where `fetch` takes only an absolute URL
(the core hands a loader no `fetch` of its own), so build the URL from an
origin, as `PUBLIC_API_ORIGIN` does here, or back the loader with a remote
`query`.

**`key` is the deprecated spelling of `namespace`.** It still works, takes a
single namespace, and is reported through the logger at `warn` once per loader
descriptor; it is removed in the next major. Naming both is a type error.

- **A loader runs once per freshness window and route params.** Its record is
  kept per loader, not per namespace, so a namespace can be split into
  `routes`-scoped loaders: each part loads on its own route and merges into the
  rest. `route` is context, not a cache key — data that varies by route is
  captured as a route param or scoped with `routes`.
- **Route params.** A named capture group in a route `RegExp` reaches the
  loader as `params`, and the loader runs again when they change; its new data
  replaces what it delivered for the previous params. Use `(?:...)` where you
  only need grouping.
- **`cache: false`** marks a loader whose source caches on its own — a remote
  `query`, an SWR layer, an HTTP cache. It runs on every trigger that selects
  it, and the config's [`cache`](#cache) window does not cover it.
- **A loader that throws** is logged and runs again on the next trigger; the
  rest of the load lands without it. One that returns nothing has answered and
  counts as loaded.
- **SvelteKit's `redirect()` and `error()` below 500** are the exception: they
  reject the load, the locale does not advance, and the call is undone. Awaited
  in a `load`, they reach SvelteKit, which follows them. A loader that
  redirects must not run on the page it redirects to.

**📖 Full detail** (sharing a namespace, route params, `cache: false`, control
flow and where SvelteKit follows it):
[base — `loaders`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#loaders).

### `translations`

Locale-indexed data that is present before any loader runs — language names,
critical strings:

```javascript
const config = {
  translations: {
    en: { 'languages.en': 'English', 'languages.cs': 'Czech' },
    cs: { 'languages.en': 'Angličtina', 'languages.cs': 'Čeština' },
  },
};
```

It is applied synchronously during construction, and it only **seeds** the
tables: it records nothing, so a loader of a namespace it names still runs on
its triggers and merges over it. To hand a server's state to the client, use
[`hydrate()`](#hydrateenvelope), or let [`sveltekit-i18n/kit`](#sveltekit) do
it.

### `initLocale` and `fallbackLocale`

`initLocale` starts a load on construction and activates that locale once it
resolves. `fallbackLocale` is read whenever a key is missing in the active
locale — its translations are loaded alongside, which roughly doubles what a
page fetches, so use it deliberately.

### `fallbackValue`

What `t`/`l` return for a key that resolves nowhere. Defaults to the key
itself, which makes missing translations visible in development; set `''` to
hide them in production.

### `preprocess`

How loaded data is shaped before it is stored. `'full'` (default) flattens
nested objects and arrays to dot notation, `'preserveArrays'` keeps arrays
intact, `'none'` stores the payload as it arrived, and a function replaces the
built-in flattening entirely — [`toDotNotation`](#utilities) is published so a
custom function can end up in dot notation anyway.

[`rawTranslations`](#translations--rawtranslations) holds what arrived;
[`translations`](#translations--rawtranslations) holds the result.

### `basePath`

The path the app is served under — SvelteKit's `kit.paths.base`, spelled as it
appears in `url.pathname`. Every route handed to `setRoute()` and
`loadTranslations()` loses it on the way in, on a segment boundary, so loader
`routes` keep naming the app's own paths (`/about`, not `/repo/about`). The
`route` a loader receives and the snapshot's route never carry it.

```javascript
// src/lib/i18n.js
import { PUBLIC_BASE_PATH } from '$env/static/public';

export const config = {
  basePath: PUBLIC_BASE_PATH,
  loaders: [/* ... */],
};
```

Set `kit.paths.base` in `svelte.config.js` from the same variable. The
[`/kit`](#sveltekit) wiring warns once, on the server, when a prefix it cannot
account for stands in front of the route SvelteKit matched.

### `sanitizeLocales`

`true` (default) resolves locales through `Intl`, so `en-us`, `EN-US` and
`en-US` are one locale — `'en-US'` — wherever the value came from. `false`
keeps locales exactly as authored. A function normalizes them your way and
runs on lookups too, so keep it cheap and pure.

Whatever it is, it applies to every locale the instance handles: loader
locales, `initLocale`, `fallbackLocale`, the keys of `translations` and every
locale passed to `l()`, `setLocale()`, `loadTranslations()` or `invalidate()`.
[`sanitizeLocales()`](#utilities) is exported so application code can normalize
a value the same way before comparing it against `locale`.

### `cache`

How long a locale's translations stay fresh, in milliseconds. The default never
expires: each loader runs once per locale and route params, and translation
files ship with the application. A finite window suits a CMS or an API — once
elapsed, the **next** activating load trigger (`loadTranslations`,
`setLocale`, `setRoute`) refetches; nothing refetches on its own in the
background. For event-driven refreshes keep the default and call
[`invalidate()`](#invalidatelocale-namespace). A loader with `cache: false`
starts no window and is not covered by one.

Expiry and invalidation drop bookkeeping, never displayed data: a refetch
merges leaf by leaf over what is already shown.

### `log`

```javascript
const config = {
  log: {
    level: 'warn',            // 'error' | 'warn' | 'debug'
    prefix: '[MyApp i18n]: ',
    logger: console,          // anything matching `Logger.T`
  },
};
```

Every level method takes the prefixed message; where a thrown value caused the
report, it follows as a second argument, raw. A custom logger may omit levels
it does not care about — a missing method is skipped, never called.

This channel carries the **core's** diagnostics. Parser diagnostics are
separate and silent by default — see [`parserOptions.onReport`](#parseroptionsonreport).

### `schema`

A type-only map of translation key to the payload that key's message expects.
Only its type is read, so the slot may hold an empty value. Without it, the
schema the app registers types the instance. See
[TypeScript](#typing-keys-and-payloads-with-schema).

### The `extensions` pipe

Adapter functions the constructed instance is piped through, left to right, so
`new I18n(config)` evaluates to the last one's output. See
[Extensions](#extensions).

**📖 Every slot in full:**
[base — Configuration](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#configuration).

## Parser options

`config.parserOptions` is handed to `parser-curly`, which resolves every message
through [`@curly-message/parser`](https://github.com/curly-message/parsers), the
[Curly Message Format](https://curlymessage.dev)'s reference
implementation.

```javascript
const config = {
  parserOptions: {
    modifierDefaults: { number: { maximumFractionDigits: 2 } },
    customModifiers: { upper: ({ value }) => value.toUpperCase() },
    onReport: (report) => console.warn(report.message, report),
    recognizeWrappers: true,
    onSuspectValue: null,
  },
};
```

The options reach the parser through the constructor **and** through
[`loadConfig()`](#loadconfigconfig); a reconfiguration that names no
`parserOptions` keeps the parser rather than dropping it.

### `parserOptions.modifierDefaults`

**Type:** `{ [modifierName]: object }`

The bottom formatting layer, keyed by modifier name. The props a call passes,
and a payload wrapper's own props, layer over it **property by property** — a
layer overrides only what it names:

```
modifierDefaults  { number: { maximumFractionDigits: 4, useGrouping: false } }
call props        { number: { useGrouping: true } }
wrapper props     { number: { maximumFractionDigits: 1 } }
effective         { maximumFractionDigits: 1, useGrouping: true }  →  "1,234.6"
```

The built-in modifiers and what they take:

| Modifier | Reads the value as | Options |
| --- | --- | --- |
| `number` | a number | `Intl.NumberFormat` options; at most two fraction digits unless a layer names `maximumFractionDigits`, or a `minimumFractionDigits` above two widens that default |
| `date` | milliseconds since the epoch, or text `Date` parses | `Intl.DateTimeFormat` options |
| `ago` | a signed millisecond delta from now, negative for the past | `Intl.RelativeTimeFormat` options, plus `format`: a unit from `second` to `year`, or `auto` |
| `currency` | a number, multiplied by `ratio` (default `1`) | `Intl.NumberFormat` options in the currency style; `currency` names the code |

```javascript
const config = {
  parserOptions: {
    modifierDefaults: {
      number: { minimumFractionDigits: 2, maximumFractionDigits: 2 },
      date: { dateStyle: 'medium' },
      ago: { numeric: 'auto' },
      currency: { currency: 'USD' },
    },
  },
};
```

```json
{ "price": "Price: {{value:number;}}" }
```

```javascript
i18n.t('price', { value: 99 })
// → "Price: 99.00" (with the defaults above)

i18n.t('price', { value: 99.999 }, { number: { minimumFractionDigits: 3, maximumFractionDigits: 3 } })
// → "Price: 99.999"
```

Because the layers merge rather than replace, an override of one half of a
paired option has to name the other half too — against the
`maximumFractionDigits: 2` the defaults above pin, a call raising only
`minimumFractionDigits` leaves `Intl` an impossible range, and the placeholder
takes its fallback with a `failed-modifier` report. Where no layer names it,
the modifier's own two-digit default widens to fit instead, so the same call
against an unconfigured `number` renders all three digits and reports nothing.

**⚠️ Per-call options are keyed by modifier name.** v2 took them flat
(`t('price', { value: 99 }, { minimumFractionDigits: 3 })`); v3 takes
`{ number: { … } }`, so one call can configure several modifiers at once.

### `parserOptions.customModifiers`

**Type:** `{ [name]: (props) => string | undefined }`

A modifier is a function of `{ value, options, defaultValue, props, locale }`:

- **`value`** — the placeholder's value, already text.
- **`options`** — the options the placeholder declares, as `[{ key, value }]`
  in source order.
- **`defaultValue`** — the fallback chain behind the placeholder, resolved when
  read.
- **`props`** — the composed formatting layers under this modifier's own name;
  an empty object where nothing is configured.
- **`locale`** — the locale the message is being rendered for.

What it returns becomes text. Returning nothing leaves the placeholder to its
fallback, and so does throwing, which is reported as `failed-modifier`. An
absent value takes the fallback before any modifier runs. A modifier registered
under a built-in name replaces it.

```javascript
const config = {
  parserOptions: {
    customModifiers: {
      upper: ({ value }) => value.toUpperCase(),

      // `props` is what the call passes under `truncate`
      truncate: ({ value, props }) => {
        const maxLength = props.maxLength ?? 50;

        return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
      },

      // Options are the placeholder's own; `defaultValue` is its fallback
      eqAbs: ({ value, options, defaultValue }) =>
        options.find(({ key }) => Math.abs(+key) === Math.abs(+value))?.value ?? defaultValue,
    },
  },
};
```

```json
{
  "title": "{{text:upper;}}",
  "description": "{{text:truncate;}}",
  "score": "{{value:eqAbs; 10:Perfect score!; default:Not quite.;}}"
}
```

```javascript
i18n.t('title', { text: 'hello world' })
// → "HELLO WORLD"

i18n.t('description', { text: 'This text is far too long to display' }, { truncate: { maxLength: 20 } })
// → "This text is far too..."

i18n.t('score', { value: -10 })
// → "Perfect score!"
```

### `parserOptions.onReport`

**Type:** `((report: Report) => void) | null`

**Default:** `null`

Where parser diagnostics go. The format prescribes no diagnostics channel and
neither does the parser package, which requires the key to be stated — `null`
included — so that silence is a decision rather than an omission. **This package
states it**, so `onReport` is optional here and reports are silent until an
application passes a channel:

```javascript
const config = {
  parserOptions: {
    onReport: (report) => logger.warn(report.message, report),
  },
};
```

A report never raises: the placeholder takes its fallback (the empty string for
`missing-locale`) and the rest of the message resolves.

A `Report` carries:

| Field | Meaning |
| --- | --- |
| `code` | `unknown-modifier`, `failed-modifier`, `missing-options`, `unserializable-value`, `missing-locale`, `output-limit`, `read-limit` or `nesting-limit` |
| `origin` | who fixes it: `message` (the message as written), `payload` (what the call passed) or `limit` (a bound the parser set) |
| `message` | a self-contained English sentence carrying nothing from the payload |
| `id` | the message's id — the translation key the core passed |
| `limit` | the limit reached, for the three limit reports |
| `text` | the excerpt — the placeholder that named the trouble, or the message as it was passed — message text throughout and never a payload value, cut to 120 code units and escaped, so it can be written anywhere |

### `parserOptions.recognizeWrappers`

**Type:** `boolean`

**Default:** `true`

Whether a payload entry shaped like a wrapper — a plain object owning at least
one of `value`, `default` and `props` and nothing else — configures its value
rather than being the value. Set it to `false` where the payload carries data
the application did not write, so an object arriving from an API cannot be read
as configuration by accident.

### `parserOptions.onSuspectValue`

**Type:** `((suspect: Parser.Suspect) => void) | null`

**Default:** `null`

A migration aid. A payload value is data, so a value holding what version 1 of
the format read as syntax — a placeholder, an escape — now reaches the output as
it stands. This announces such a value, for a catalogue that composed messages
through its payload; nothing is looked for while it is unset, and it is not a
report: the placeholder resolved to exactly the text the payload holds.

**📖 Full parser reference:**
[parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly#readme).

## The instance

Everything lives on **one reactive object**. There are no stores, no `.get()`
duals and no subscriptions: reads are plain property and method access, and they
are reactive wherever reads are tracked — a component template, `$derived`,
`$effect`.

```javascript
export const i18n = new I18n(config);
```

| Member | Kind |
| --- | --- |
| `locale`, `locales`, `loading`, `initialized`, `translations`, `rawTranslations` | reactive properties |
| `t`, `l` | reactive functions |
| `loadTranslations`, `loadNamespace`, `loadConfig`, `setLocale`, `setRoute` | promise-returning |
| `addTranslations`, `invalidate`, `snapshot`, `hydrate`, `destroy` | synchronous |

**⚠️ Do not destructure the value properties.** A destructured value is a
one-time snapshot and never updates. `t` and `l` are functions and stay reactive
even when destructured, because their tracked reads happen at call time — their
identity is refreshed whenever the config, the translations or the locale
change, so passing `t` to a child component is tracked as well.

Inside a component, destructure through `$derived(i18n)` if you want short
names — each binding then stays in sync:

```svelte
<script>
  import { i18n } from '$lib/i18n';

  const { loading, locale } = $derived(i18n);
</script>

{#if loading}Loading…{:else}{locale}{/if}
```

### Reactive properties

#### `locale`

**Type:** `string | undefined` (reactive; assignable)

The **active** locale — the one whose translations are loaded. Assigning it is
a fire-and-forget [`setLocale()`](#setlocalelocale), so the value advances once
the new locale's translations resolved, not synchronously on assignment. The
last request wins: a superseded load never overwrites a newer one when they
resolve out of order.

```svelte
<p>Current language: {i18n.locale}</p>
<button onclick={() => { i18n.locale = 'cs'; }}>Čeština</button>
```

Await the change explicitly when you need to know it finished:
`await i18n.setLocale('cs')`.

#### `locales`

**Type:** `string[]` (reactive)

Every locale the instance knows — from loaders and from added translations.

```svelte
{#each i18n.locales as loc}
  <button onclick={() => i18n.setLocale(loc)}>{loc}</button>
{/each}
```

#### `loading`

**Type:** `boolean` (reactive)

`true` while **any** activating load is in flight, back to `false` once the
last one settles. A warm load — `loadTranslations(…, { activate: false })`,
`loadNamespace()` — does not count until an activating trigger joins it. To
wait for a specific load, await the promise the method that started it
returned — never poll this flag.

#### `initialized`

**Type:** `boolean` (reactive)

`true` once a locale and a route are set and translations are present. Useful
to gate the first render.

#### `translations` / `rawTranslations`

**Type:** `Record<string, Record<string, any>>` (reactive)

The locale-indexed tables — `rawTranslations` before preprocessing,
`translations` after. Both are indexed by the normalized locale, the same value
`locale` reports. Treat them as read-only and write through
[`addTranslations()`](#addtranslationstranslations).

### Reactive functions

#### `t(key, payload?, props?)`

**Type:** `(key: string, payload?: object, props?: object) => string`

Translates `key` for the active locale. `payload` carries the values the
message's placeholders name; `props` carries per-call formatting options, keyed
by modifier name.

```svelte
<script>
  import { i18n } from '$lib/i18n';
</script>

<h1>{i18n.t('home.title')}</h1>
<p>{i18n.t('common.greeting', { name: 'Alice' })}</p>
<p>{i18n.t('cart.total', { amount: 99.99 }, { currency: { currency: 'EUR' } })}</p>
```

The call reads the reactive translation table and locale, so the rendered text
updates when either changes. Outside a template it is an ordinary function call.

A missing key returns [`config.fallbackValue`](#fallbackvalue) — the key itself
by default. A [`schema`](#typing-keys-and-payloads-with-schema) narrows `key`
and `payload`.

#### `l(locale, key, payload?, props?)`

**Type:** `(locale: string, key: string, payload?: object, props?: object) => string`

Like `t`, for a locale the call names — useful for a language switcher
rendering each language in its own name. The locale is normalized before the
lookup, so by default `l('EN', …)` and `l('en', …)` read the same table.

```svelte
{#each i18n.locales as loc}
  <button onclick={() => i18n.setLocale(loc)}>{i18n.l(loc, 'languages.name')}</button>
{/each}
```

### Promise-returning methods

`loadTranslations`, `loadNamespace`, `setLocale` and `setRoute` each return the
promise of the **matching** load. Concurrent duplicate triggers that select the
same loaders for the same locale and route join the load already in flight and
receive its promise instead of fetching twice, so awaiting is all the
coordination an application needs. `loadConfig` is the exception: it returns
the promise of the config load, which starts a load only when the new config
names a locale to load for.

A loader that throws is caught and logged individually; the load fails only
for SvelteKit's `redirect()` or an `error()` below 500, which rejects every
call that shares it (see [`loaders`](#loaders)).

#### `loadTranslations(locale, route?, options?)`

**Type:** `(locale: string, route?: string, options?: { activate?: boolean }) => Promise<void>`

Loads translations for a locale and route, and activates the locale once they
resolved. A locale nothing serves resolves without changing anything, the
route included.

```javascript
// src/routes/+layout.js — a client-only app
import { i18n } from '$lib/i18n';

export const ssr = false;

export const load = async ({ url }) => {
  await i18n.loadTranslations('en', url.pathname);
};
```

The instance above is a module-level singleton, which on the server is shared by
every request in the process — see [SvelteKit](#sveltekit).

**`{ activate: false }`** only fills the tables: the locale, the route and
`loading` stay as they were, so nothing on screen changes. Data a loader
delivers for other route params than the current route asks for is kept aside,
and the activating trigger that asks for those params applies it instead of
fetching it again — which is what makes it a preload:

```javascript
// Fetch what a link needs without switching to it.
await i18n.loadTranslations('de', '/about', { activate: false });
```

**Errors:** anything that throws after the loaders — a custom `preprocess`, a
malformed payload — rejects the returned promise and keeps none of what the load
delivered, so `await` surfaces it (in SvelteKit, to the error page). A result
you discard is safe: the failure is reported through the logger and never
becomes an unhandled rejection, but it is then only visible in the log.

#### `loadNamespace(namespace, locale?)`

**Type:** `(namespace: string, locale?: string) => Promise<void>`

Loads one namespace on demand — for what an interaction needs rather than a
route: a modal, a rarely opened panel, an editor. `locale` defaults to the
active locale.

```javascript
async function openEditor() {
  await i18n.loadNamespace('editor');

  editorOpen = true;
}
```

- It selects the loaders of that namespace **whatever their `routes` say**, for
  the locale and the `fallbackLocale`.
- It honours the load records: calling it on every interaction fetches once.
- What it loads stays loaded across routes, and reaches `snapshot()`.
- It is warm: the locale does not change and `loading` stays `false`, so track
  the returned promise for a spinner of the component's own.
- It tracks none of the state it reads, so an `$effect` that should load the
  namespace again after a locale switch passes the locale itself:
  `$effect(() => { i18n.loadNamespace('panel', i18n.locale); })`.

#### `setLocale(locale?)`

**Type:** `(locale?: string) => Promise<void>`

Requests a locale. If a route is already set the load starts immediately;
otherwise it fires when the route arrives. A locale nothing serves — no loader,
no `translations` entry, no `fallbackLocale` match — resolves without changing
anything. A loader's `redirect()` or `error()` below 500 rejects the call and
undoes it: the requested locale and the route go back to what it replaced,
unless a later call that has not failed came in the meantime.

#### `setRoute(route)`

**Type:** `(route: string) => Promise<void>`

Updates the current route, without [`basePath`](#basepath), and loads
route-scoped translations for the requested locale, if one is known. Control
flow a loader throws rejects and undoes it as it does `setLocale()`.

#### `loadConfig(config)`

**Type:** `(config: Config) => Promise<void>`

(Re)configures the instance — the same config the constructor takes, parser
slot still absent and `parserOptions` still honored. The config **replaces**
the old one rather than merging into it, `parserOptions` included: a call that
names none rebuilds the parser at its defaults, so the instance silently loses
the `customModifiers`, `modifierDefaults` and `onReport` the constructor was
given. Restate them, or keep the whole config in one place and spread it. Safe
to call fire-and-forget: a failure is reported through the logger and the returned
promise marked handled, while an awaiting caller still receives the rejection.

`config.extensions` is a construction-time directive and is ignored here — a
reconfiguration cannot re-pipe an already-constructed surface. Neither can it
retype one: [`schema`](#typing-keys-and-payloads-with-schema) is read off the
config the **constructor** received.

### Synchronous methods

#### `addTranslations(translations?)`

**Type:** `(translations?: Record<string, any>) => void`

Seeds translations immediately, like [`config.translations`](#translations).
The payload is preprocessed per [`config.preprocess`](#preprocess) and merged
branch by branch, so a namespace that already holds data is added to rather
than replaced; a leaf declared twice takes the incoming value. It records
nothing: every loader of a namespace it names still runs and merges into it.
Locale keys are normalized before they are merged.

```javascript
i18n.addTranslations({
  en: { 'languages.en': 'English', 'languages.cs': 'Czech' },
  cs: { 'languages.en': 'Angličtina', 'languages.cs': 'Čeština' },
});
```

To hand a server's state over, use [`hydrate()`](#hydrateenvelope).

#### `invalidate(locale?, namespace?)`

**Type:** `(locale?: string, namespace?: string) => void`

Marks loaded translations stale — for one locale or all of them, and for one
namespace or all of them. The call starts **no** load and the displayed
translations stay in place; loaders run again on the next load trigger.

```javascript
// A CMS webhook told us the English content changed:
i18n.invalidate('en');

// Only the editor catalogue changed, in every language:
i18n.invalidate(undefined, 'editor');

// Nothing happens until the next load trigger:
await i18n.loadTranslations('en', location.pathname);
```

A loader already in flight for what was invalidated is severed: what it returns
or throws is discarded — it predates the invalidation — while the rest of its
load lands. An activating trigger still in flight fetches the severed part
again before it activates, so awaiting it still means its locale is loaded.
A `cache: false` loader is covered too.

#### `snapshot(options?)`

**Type:** `(options?: { records?: boolean }) => Record<string, any> | Snapshot.Envelope`

Serializes what the instance holds for the **active locale** and the
**`fallbackLocale`** — the server half of the
[SSR hand-off](#server-side-rendering). Two forms:

- **`snapshot({ records: true })`** returns an envelope for
  [`hydrate()`](#hydrateenvelope): the data, the loaders that delivered it, the
  active locale and the route. This is the form to hand to a client.
- **`snapshot()`** returns the data alone, shaped like
  [`translations`](#translations--rawtranslations). Plain data cannot say which
  loader delivered what, so it leaves out every namespace fed by several
  loaders, every namespace of a loader whose `routes` capture params, and every
  namespace none of whose loaders delivered on this instance. Passed to
  `hydrate({ translations })` it keeps the loaders without route params of each
  namespace it names from running; passed to `addTranslations()` it only seeds.

Both leave out every other locale. The envelope is plain data, so SvelteKit
serializes it like any other load data. The data is **pre-preprocess**, so the
receiving instance applies its own `config.preprocess`, and freshness is not
transferred: a hydrated locale's [`cache`](#cache) window starts when the client
receives the data.

#### `hydrate(envelope?)`

**Type:** `(envelope?: Snapshot.Envelope) => void`

Restores what `snapshot({ records: true })` captured on another instance — the
client half of the hand-off:

- the **data** is displayed at once;
- a loader the **records** name does not run again for the same route params,
  while its siblings on other routes still run when their route matches;
- data no record names is displayed, but keeps no loader from running;
- the **active locale** and the **route** are restored, so `t()` renders the
  server's locale before any load has run.

It is applied on top of the config, so the config's own `translations` stay.
`hydrate(undefined)` does nothing. Call it before any load starts — with
`initLocale` set, the constructor starts one first, and `hydrate()` warns.
[`sveltekit-i18n/kit`](#sveltekit) calls both halves for you.

#### `destroy()`

**Type:** `() => void`

Detaches the instance from its loading lifecycle. Loads still in flight settle
with their data discarded, `loading` drops to `false`, and every further load or
mutation call is ignored with a warning. Reads keep working — `t`, `l`,
`locale`, `translations` and `snapshot()` still return the last state — so a
component that is tearing down renders instead of breaking.

Call it when a per-request or per-component instance goes out of scope:

```svelte
<script>
  import { I18n } from 'sveltekit-i18n';
  import { config } from '$lib/i18n';

  const i18n = new I18n(config);

  $effect(() => () => i18n.destroy());
</script>
```

A module-level singleton lives as long as the application and needs no call.
The method is idempotent.

**📖 Full instance reference:**
[base — Instance Properties and Methods](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#instance-properties-and-methods).

## Message format

Messages are written in the [Curly Message Format](https://curlymessage.dev).
A placeholder names a payload key and may carry a modifier, options and a
default: `{{key:modifier; optionKey:value; default:fallback;}}`.

```json
{
  "greeting": "Hello, {{name}}!",
  "welcome": "Welcome, {{name; default:Guest;}}!",
  "price": "Total: {{amount:number;}}",
  "updated": "Updated {{time:ago;}}",
  "items": "You have {{count}} {{count; 1:item; default:items;}}.",
  "stock": "{{count:gt; 0:In stock ({{count}}); default:Out of stock;}}"
}
```

```javascript
i18n.t('greeting', { name: 'Alice' })        // → "Hello, Alice!"
i18n.t('welcome', {})                        // → "Welcome, Guest!"
i18n.t('price', { amount: 1234.56 })         // → "Total: 1,234.56"
i18n.t('updated', { time: -3600000 })        // → "Updated 1 hour ago"
i18n.t('items', { count: 1 })                // → "You have 1 item."
i18n.t('stock', { count: 0 })                // → "Out of stock"
```

- **Comparisons.** `eq`, `ne`, `lt`, `lte`, `gt` and `gte` select among the
  options; the first option whose key satisfies the comparison wins, and none
  selected takes the fallback. A placeholder with options and no modifier
  compares with `eq`.
- **Nesting.** An option's value may hold placeholders of its own, and only the
  selected option's are resolved — the branch the comparison passes over reads
  no payload entry.
- **Escaping.** A backslash cancels the structural meaning of `:`, `;`, `{`,
  `}`, whitespace and the backslash itself; before any other character it is
  plain text, so `\d+` and `C:\\temp` survive as typed.
- **A payload value is data.** It is never read back as syntax: its backslashes
  and its braces reach the output as they stand, and no placeholder is found in
  it.
- **Every value reaches the output as text.** A plain object or an array becomes
  JSON; anything else becomes what `String()` makes of it.

**📖 Complete syntax guide, payload wrappers and resolution limits:**
[parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly#readme)
and the [format specification](https://curlymessage.dev).

## Exported types

```typescript
import type { Config, Cst, Modifier, Parser, Report } from 'sveltekit-i18n';
import type { BaseConfig, BaseParser, Extension, Loader, Logger, Schema, Snapshot, Translations } from 'sveltekit-i18n';
import type { Kit } from 'sveltekit-i18n/kit';
import type { DotNotation } from 'sveltekit-i18n/utils';
```

| Export | Origin | What it holds |
| --- | --- | --- |
| `Config<Payload, Props>` | this package | the config above — the core's, minus `parser`, plus `parserOptions` |
| `Parser` | parser-curly | `Parser.Options`, `Parser.OnReport`, `Parser.OnSuspectValue`, `Parser.Suspect`, `Parser.Params`, `Parser.Payload` |
| `Modifier` | parser-curly | `Modifier.T`, `Modifier.Props`, `Modifier.Wrapper` |
| `Report` | parser-curly | what [`onReport`](#parseroptionsonreport) receives |
| `Cst` | parser-curly | the node types [`cst`](#cst) returns: `Cst.Message`, `Cst.Placeholder`, `Cst.Node`, … |
| `BaseConfig` | core, renamed | the core's `Config` namespace: `Config.T`, `Config.LocaleInput`, `Config.LocalesFromConfig`, … |
| `BaseParser` | core, renamed | the core's `Parser` namespace — the parser **contract**: `Parser.T`, `Parser.Parse`, `Parser.ExtractParams`, `Parser.ParamSpec`, … |
| `Extension` | core | `Extension.T`, `Extension.Operator`, `Extension.Generic`, `Extension.Piped` |
| `Loader` | core | `Loader.LoaderModule`, `Loader.Route`, `Loader.Props`, `Loader.Params`, `Loader.Resolved`, … |
| `Logger` | core | `Logger.T`, `Logger.Level` |
| `Schema` | core | `Schema.Registered`, `Schema.FromConfig`, `Schema.FromInstance`, `Schema.Key`, `Schema.Params`, `Schema.Payload` |
| `Snapshot` | core | `Snapshot.Envelope` (what `snapshot({ records: true })` returns and `hydrate()` takes), `Snapshot.LoadRecord` |
| `Translations` | core | `Translations.T`, `Translations.SerializedTranslations`, … |
| `Kit` | core, from `sveltekit-i18n/kit` | `Kit.Options` (what `defineI18n` takes), `Kit.T` (what it returns), `Kit.Payload`, `Kit.Event`, … |
| `DotNotation` | core, from `sveltekit-i18n/utils` | the types [`toDotNotation`](#todotnotationinput-preservearrays) is described with |

**Why `BaseConfig` and `BaseParser`.** This package publishes a `Config` of its
own (the parser-less one) and re-exports parser-curly's `Parser`, so the core's
namespaces of those two names cannot keep them. Everything else the core
exports keeps its name. The rename is the only difference between the core's
entry and this one — a consumer never needs to install the core to reach a type.

The parser factory is **not** re-exported: it is wired internally and there is
nothing to construct. The two parser values below are — neither runs while a
message renders.

### `extractParamsFactory`

**Type:** `(options?: Parser.ExtractOptions) => BaseParser.ExtractParams`

The build-time half of the parser contract: it builds a function reporting what
a message expects of its payload, so a catalogue can be read for the
[`schema`](#typing-keys-and-payloads-with-schema) it implies rather than the
schema being written by hand.

```javascript
import { extractParamsFactory } from 'sveltekit-i18n';

const extractParams = extractParamsFactory();

extractParams('Hi {{name}}, you owe {{amount:number;}}.');
// → [{ name: 'name', kind: 'unknown', optional: false },
//    { name: 'amount', kind: 'number', optional: false }]
```

Pass it the same `parserOptions` the application passes the instance: a custom
modifier registered under a name the format defines changes what a message
naming it says about its value, so an extractor built without them reads the
catalogue differently from the parser that renders it. `onReport`,
`modifierDefaults`, `recognizeWrappers` and `onSuspectValue` reach nothing here
— extraction formats nothing, reports nothing and reads no payload.

It is a separate export rather than a member of the parser object on purpose: a
message scanner is of no use while rendering, and a bundle that never reaches it
drops it.

### `cst`

**Type:** `(message: string) => Cst.Message`

The format's own describer: it reports a message as the parts it is written
from, so an editor, a linter or a syntax highlighter reads a message the way the
parser beside it does.

```javascript
import { cst } from 'sveltekit-i18n';

cst('Hello, {{name; default:Guest;}}!');
// → { type: 'message', start: 0, end: 32, nodes: [
//     { type: 'text', start: 0, end: 7 },
//     { type: 'placeholder', start: 7, end: 31, nodes: [/* ... */] },
//     { type: 'text', start: 31, end: 32 },
//   ] }
```

The tree is concrete: every node carries its `[start, end)` span in UTF-16 code
units, the leaves come in the order the message writes them, and concatenating
them spells the message back. It reads no options — a name is a name whether or
not a modifier answers to it — so nothing [`parserOptions`](#parser-options)
registers changes what it reports. The node types are the `Cst` namespace.

Like the extractor, it is a separate export because resolution never calls it.

## Utilities

Five pure helpers are published on a subpath: three the instance uses
internally, for the cases where application code has to match the library's
own behavior, and two it never calls, for deciding which locale to ask it for
and which direction that locale is written in:

```javascript
import { matchLocale, resolveLoaders, sanitizeLocales, textDirection, toDotNotation } from 'sveltekit-i18n/utils';
```

The subpath exports these five plus the `DotNotation` type; the rest of the
internals stays private.

### `toDotNotation(input, preserveArrays?)`

**Type:** `<I>(input: I, preserveArrays?: boolean) => DotNotation.Output<I>`

The flattening behind [`preprocess`](#preprocess). A custom `preprocess`
function *replaces* the built-in flattening, so call this when you want to
transform the input and still end up with dot notation:

```javascript
import { toDotNotation } from 'sveltekit-i18n/utils';

const defaults = { common: { error: 'An error occurred' } };

const config = {
  preprocess: (input) => toDotNotation({ ...defaults, ...input }),
};

// i18n.t('common.error')
```

Pass `true` as the second argument to keep arrays intact — the
`'preserveArrays'` behavior.

### `sanitizeLocales(...locales)`

**Type:** `(...locales: any[]) => string[]`

Normalizes locales the way the instance does, so a value coming from a URL, a
cookie or an `Accept-Language` header can be compared against
[`locale`](#locale) and [`locales`](#locales):

```javascript
import { sanitizeLocales } from 'sveltekit-i18n/utils';

const [locale] = sanitizeLocales(page.params.lang); // 'en-us' -> 'en-US'

if (locale && locale !== i18n.locale) await i18n.setLocale(locale);
```

Falsy inputs are dropped, so the result can be shorter than the argument list. A
locale `Intl` does not recognize is lowercased and reported through the logger
instead of throwing.

This is the **default** normalization only. An instance configured with
[`config.sanitizeLocales`](#sanitizelocales) keys its locales its own way, so a
value compared against `locale` has to go through that same transform.

### `resolveLoaders(loaders, sanitizeLocales?)`

**Type:** `(loaders?: readonly Loader.LoaderModule[], sanitizeLocales?: BaseConfig.SanitizeLocales) => Loader.Resolved[]`

Normalizes `config.loaders` the way the instance does, for code that reads a
config from outside it — a build step, a test. Every result has a single
`locale` and a single `namespace`: a descriptor listing several expands into
one loader per pair, the deprecated `key` is read as the namespace, and each
locale is sanitized (the second argument takes the config option's value).

```javascript
import { resolveLoaders } from 'sveltekit-i18n/utils';

resolveLoaders(config.loaders, config.sanitizeLocales);
// [{ locale: 'en', namespace: 'common', loader, routes, id: '["en","common"]' }, ...]
```

### `matchLocale(requested, available)`

**Type:** `<const L extends string>(requested: string | readonly string[] | null | undefined, available: readonly L[]) => L | undefined`

Matches what a visitor asks for — an `Accept-Language` value, a single locale
or a list such as `navigator.languages` — against the configured set, and
returns the winner **as `available` spells it**, or `undefined`:

```javascript
import { matchLocale } from 'sveltekit-i18n/utils';

matchLocale('en-GB,en;q=0.9,cs;q=0.8', ['en', 'cs']); // 'en'
matchLocale('cs-CZ', ['en', 'cs']);                   // 'cs'
matchLocale('de-AT', ['en', 'cs']);                   // undefined
```

It is RFC 4647 *Lookup*: the requested range, then its shorter prefixes, with
`q` weights ordering the ranges. Only the requested locale is ever truncated —
`matchLocale('en-AU', ['en-US'])` is `undefined`. [`/kit`](#sveltekit)
negotiates through it.

### `textDirection(locale)`

**Type:** `(locale: string | undefined) => 'ltr' | 'rtl'`

The direction a locale is written in, ready for a `dir` attribute:

```svelte
<script>
  import { textDirection } from 'sveltekit-i18n/utils';
</script>

<div dir={textDirection(i18n.locale)}>
  <p>{i18n.t('content')}</p>
</div>
```

The script decides — the one the tag spells, or the likely one
`Intl.Locale#maximize()` adds — so `ar`, `he`, `fa` and `ckb` are `'rtl'`
without a list of languages. A locale whose direction matters spells its
script (`ku-Arab`), since engines ship different likely-script data. An
invalid tag, and `undefined`, are `'ltr'`. With [`/kit`](#sveltekit),
`<html dir>` needs none of this: `handle` fills `%dir%` and `use()` keeps the
attribute in sync.

**📖 Full detail:**
[base — Utilities](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#utilities).

## TypeScript

The package is written in TypeScript and ships its declarations. What you get:

- ✅ Type definitions for every configuration slot
- ✅ Typed properties and methods, with `t`/`l` returning `string`
- ✅ Typed keys and payloads, from a [`schema`](#typing-keys-and-payloads-with-schema) registered once for the app, or stated per instance
- ✅ Locale completion, from the locales the config spells
- ✅ [`extractParamsFactory`](#extractparamsfactory), which reports what a message expects of its payload

This package ships the slot and the registry, not the generator. The schema is
hand-written for a small project, or generated from your translations by
[`@sveltekit-i18n/typegen`](#generating-the-schema-with-typegen).

### Typing keys and payloads with `schema`

A schema maps each translation key to the payload its message expects. It
types `t()` and `l()`: keys autocomplete, an unknown key is a type error, and
the payload argument is checked against the key's entry.

**Register it once for the app.** A global script registers the app's schema in
the global `SvelteKitI18n.Register` interface, and every instance whose config
states no `schema` is typed by it — `new I18n(config)` and
[`defineI18n(config)`](#sveltekit) alike, with nothing to wire. typegen
[writes this file](#generating-the-schema-with-typegen); by hand, it is:

```typescript
// src/i18n-schema.d.ts — a global script: no top-level import or export
interface TranslationSchema {
  'common.greeting': { name: string };  // payload required
  'common.about': never;                // message takes no parameters
  'home.title': { title?: string };     // nothing required — payload optional
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
i18n.t('common.about');                       // ok

i18n.t('common.headline');                    // Error: unknown key
i18n.t('common.greeting');                    // Error: missing payload
i18n.t('common.greeting', { name: 42 });      // Error: wrong payload shape
i18n.t('common.about', { title: 'About' });   // Error: takes no payload
```

**Or state it per instance.** `config.schema` types that instance, and it wins
over the registry. **Only the type is read** — nothing reads this value at
runtime, so the slot may hold an empty value:

```typescript
export const i18n = new I18n({
  ...config,
  schema: {} as TranslationSchema,
});
```

Payload rules:

- `never`, `undefined`, `void` or `null` — the message takes no parameters, so
  passing one is an error.
- A payload with no **required** property — the argument may be omitted.
- `any` — the slot stays unchecked: anything passes, nothing is demanded.
- A union of keys (`t(condition ? 'a' : 'b', …)`) takes the **intersection** of
  their payloads.

The payload occupies the first parser slot only, so the trailing `props`
argument survives unchanged — a schema narrows what a key expects, never what
formatting options a call may pass.

**Precedence.** The `schema` the config states decides; only an absent one
reads the registry:

| The config's `schema` | Keys and payloads are typed by |
|---|---|
| absent, or typed `any` (a plain `Config` annotation) | the registry — plain strings when nothing is registered |
| a closed schema (`{} as X`) | `X`: a stated schema always wins |
| a schema whose keys are not a closed set (`{}`, `Record<string, …>`) | nothing — keys are plain strings |

**`schema: {}` opts out.** An open index signature, or a schema with no keys at
all, would reject every key or demand a payload for keys it knows nothing
about — so it types nothing: keys stay plain strings, and since the slot is
stated, the registry stays out too. An instance with a catalogue of its own — a
second instance in the app, a test, a Storybook story — states its closed
schema, or `schema: {}`. A registration with no keys, what typegen writes
before its first run, types nothing either. It is the config's **type** that is
read: `schema: {}` opts out where the constructor infers that type from the
value, while a config type passed as the first type argument decides on its own
— see [One payload type for every message](#one-payload-type-for-every-message).

**⚠️ The registry covers the whole program, so a library never registers.**
Only the app's schema file fills `SvelteKitI18n.Register`. A library's own
instances state their schema, or `schema: {}`, which also keeps an app's
registry away from a workspace library compiled inside the app's program. Two
registrations whose `schema` differs are a type error (TS2717) with
`skipLibCheck: false`, and silent with SvelteKit's default
`skipLibCheck: true`, where the first one wins.

**⚠️ The registry needs `sveltekit-i18n` 3.1** or newer. An older core ignores
the registration without a diagnostic; there, state the schema per instance.

**⚠️ Construction time only.** The type is read off the config the constructor
receives, and the registry with it: a later
[`loadConfig()`](#loadconfigconfig) cannot retype an existing instance, and an
[extension](#extensions) typed by a fixed return type erases the instance's
type parameters altogether. With [`/kit`](#sveltekit), the config handed to
`defineI18n()` — or the registry, when it states no schema — types `get()`,
`use()` and `data.i18n`.

### Generating the schema with typegen

[`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen) is a
Vite plugin, installed on its own. It evaluates the config module as your
app's server would, runs the loaders, and writes the schema — keys from the
reference locale's catalogue, payloads from the parser's extractor — on
`vite build` and while `vite dev` runs:

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

`config` names the module that exports the config (as `config`, unless
`configExport` says otherwise); `extractParams: { from: 'sveltekit-i18n' }`
reads this package's re-exported
[`extractParamsFactory`](#extractparamsfactory). Its `options` reach the
extractor as JSON, so only data arrives: a custom modifier is a function and
never does, and what it changes about a message's payload — a built-in modifier
you override, say — goes unreported. See
[`extractParams`](https://github.com/sveltekit-i18n/typegen#extractparams) in
typegen's README.

The output, `src/i18n-schema.d.ts`, is a global script: it declares a global
`TranslationSchema` and imports nothing. From typegen 3.0.0-next.3 on, it also
[registers](#typing-keys-and-payloads-with-schema) that schema in
`SvelteKitI18n.Register`, so every instance whose config states no `schema` is
typed by it, with nothing to wire. The cast is then an explicit per-instance
choice, and still what an older typegen, or a 3.0 core, needs:

```typescript
const i18n = new I18n({ ...config, schema: {} as TranslationSchema });
```

It is reproducible from your translations, so leave it out of Git. The
plugin's options, diagnostics and limits are in
[its README](https://github.com/sveltekit-i18n/typegen#readme).

### One payload type for every message

Where every message shares one payload shape and the app registers no schema,
state it through the constructor's type arguments:

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

type Payload = { applicationName: string };

const config: Config<Payload> = { loaders: [/* … */] };

export const i18n = new I18n<Config<Payload>, Payload>(config);

i18n.t('common.welcome', { applicationName: 'My app' }); // ok
i18n.t('common.welcome', { aplicationName: 'My app' });  // Error: typo caught
```

**⚠️ With a registered schema, the registry types this instance instead.**
`Config<Payload>` leaves the schema slot typed `any`, which reads the
[registry](#typing-keys-and-payloads-with-schema), and `schema: {}` in the value
changes nothing, since the type argument decides — nor does
`Config<Payload> & { schema: {} }`, whose slot stays `any`. State the opt-out in
that argument, replacing the slot:

```typescript
type AppConfig = Omit<Config<Payload>, 'schema'> & { schema?: {} };

export const i18n = new I18n<AppConfig, Payload>(config); // plain keys, `Payload` checked
```

**⚠️ Annotating the config variable does not type the payload.**
`const config: Config<Payload> = …` types the config object; the payload reaches
`t` only through the constructor's type arguments, which is why both appear
above. A second argument types the props custom modifiers take:
`Config<Payload, Props>` and `new I18n<Config<Payload, Props>, Payload, Props>(config)`.

A custom modifier types its own props through `Modifier.T<OwnProps>`:

```typescript
import type { Modifier } from 'sveltekit-i18n';

const truncate: Modifier.T<{ maxLength?: number }> = ({ value, props }) => {
  const maxLength = props.maxLength ?? 50;

  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
};
```

### Locale completion

The constructor reads the locales the config **names** — each loader's `locale`,
`initLocale`, `fallbackLocale` and the keys of `translations` — and completes
them on the instance:

```typescript
const i18n = new I18n({
  initLocale: 'en',
  fallbackLocale: 'de',
  translations: { cs: { greeting: 'Ahoj' } },
  loaders: [{ locale: 'sk', namespace: 'common', loader: async () => ({}) }],
});

i18n.locale;  // 'en' | 'de' | 'cs' | 'sk' | (string & {}) | undefined
```

The union narrows the **inputs** — `setLocale()`, `loadTranslations()`,
`invalidate()`, the first argument of `l()` and assignment to `locale` — and the
**reads** `locale` and `locales`. The translation tables are not narrowed: they
stay plain `string`-keyed records.

**The union stays open.** It is a completion hint, never a constraint: a locale
can arrive from a URL, a cookie or an `Accept-Language` header, and
[`sanitizeLocales`](#sanitizelocales) may map an arbitrary input onto a known
one. So `await i18n.setLocale('EN')` compiles and lands on `'en'`, and a
narrowed instance stays assignable to and from a plain one.

**The literals survive** when the config reaches the constructor as a literal —
inline, `as const`, or `as const satisfies Config`. They are **lost** when the
config variable is annotated (`const config: Config = { initLocale: 'en', … }`),
since the annotation, not the literal, is the type the constructor sees, and
when it is assigned separately without `as const`.

**⚠️ One dynamic source degrades the whole union to `string`** — a config that
builds its loaders from a runtime array completes nothing, even where it also
names a literal. A half-known set would complete some locales while silently
hiding the rest.

**📖 Full detail:**
[base — TypeScript](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#typescript).

## Extensions

`config.extensions` pipes the constructed instance through adapter functions,
left to right. Each receives the surface produced so far and returns the surface
handed on, so `new I18n(config)` evaluates to the **last** extension's output.
The pipe runs once, inside the constructor; `loadConfig()` ignores the property.

The `$t` store form v2 had is an extension now:

```javascript
import { I18n } from 'sveltekit-i18n';
import stores from '@sveltekit-i18n/extension-stores';

export const { t, locale, loading } = new I18n({ ...config, extensions: [stores] });
```

Writing your own is just a function:

```javascript
const withGreeting = (i18n) => Object.assign(i18n, {
  greet: (name) => i18n.t('common.greeting', { name }),
});

export const i18n = new I18n({ ...config, extensions: [withGreeting] });

i18n.greet('World');
```

In TypeScript the expression's type folds through the `extensions` tuple, so
the additions an extension declares arrive at the call site without an
annotation there. One caveat: an extension whose input is spelled as the bare
instance type erases what the config narrowed — the
[`schema`](#typing-keys-and-payloads-with-schema) and the locale union are gone
from the result, and making the function generic does not help. (This package
exports `I18n` as a value only; the bare instance type is spelled
`InstanceType<typeof I18n>`.) Declare the dependency as an
`Extension.Operator` instead:

```typescript
import { I18n, type Extension } from 'sveltekit-i18n';

interface WithGreeting extends Extension.Operator {
  readonly output: this['input'] & { greet: (name: string) => string };
}

const withGreeting: Extension.Generic<WithGreeting> = (i18n) => Object.assign(i18n, {
  greet: (name: string) => i18n.t('common.greeting', { name }),
});

export const i18n = new I18n({ ...config, extensions: [withGreeting] });
// schema and locale completion intact, plus `greet`
```

This package prepends an extension of its own — the one that keeps the parser
across a `loadConfig()` — before the consumer's pipe. It returns its input and
contributes nothing to the piped type, so the only thing it changes is that
`loadConfig` still takes this package's parser-less config after every extension
in the pipe.

Official extensions live in the
[extensions](https://github.com/sveltekit-i18n/extensions) repository.

## SvelteKit

`sveltekit-i18n/kit` wires an app to its config in four exports: the server
builds an instance per request and hands its state to the browser, and the
browser keeps one instance per tab, following every navigation. What the
server loaded is not fetched again in the browser, and no visitor sees another
visitor's locale. It is the core's `defineI18n`, with the parser filled in for
every instance it builds.

### Setup

```javascript
// src/lib/i18n.js
import { defineI18n } from 'sveltekit-i18n/kit';

export const config = {
  fallbackLocale: 'en',
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

```javascript
// src/hooks.server.js
export { handle } from '$lib/i18n';
```

```javascript
// src/routes/+layout.server.js and src/routes/+layout.js — the same line in both
export { load } from '$lib/i18n';
```

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { use } from '$lib/i18n';

  let { data, children } = $props();

  use(() => data);
</script>

{@render children()}
```

```svelte
<!-- any component -->
<script>
  import { get } from '$lib/i18n';

  const i18n = get();
</script>

<p>{i18n.t('common.greeting')}</p>
```

```html
<!-- src/app.html -->
<html lang="%lang%" dir="%dir%">
```

- **`handle`** replaces `%lang%` in the `<html>` start tag with the negotiated
  locale (an empty string when nothing matches) and `%dir%` with its
  [direction](#textdirectionlocale). Anything else the locale belongs in, an
  `og:locale` meta for one, goes in `<svelte:head>` from `i18n.locale`.
- **`load`** is one function for both layout files. The server branch
  negotiates, loads the locale for the route into a fresh instance and returns
  its [`snapshot({ records: true })`](#snapshotoptions) on a page render, and
  only the negotiated locale and the route on a client navigation. The
  universal branch builds the instance, [hydrates](#hydrateenvelope) it and
  returns it as `data.i18n`, next to the other fields of the server's data.
- **`use(() => data)`** belongs in the root layout's script, called once with a
  getter of `data`. It provides the instance to every component below,
  switches the locale and follows the route as each navigation commits, keeps
  `document.documentElement.lang` and `dir` in sync, and returns the instance.
  Without the data of `load`, it throws.
- **`get()`** returns the instance `use()` provided, in any component below the
  root layout — `+error.svelte` included; anywhere else, it throws.

With [`extensions`](#extensions), `data.i18n`, `use()` and `get()` hand out what
they make of the instance. A [`schema`](#typing-keys-and-payloads-with-schema)
in the config types all three. `initLocale` is not loaded on construction
here: it is a negotiation candidate.

A re-export (`export { load } from '$lib/i18n'`) makes SvelteKit's static
analysis of page options give up on that file and, in the root layout, on
every route below it. Nothing changes at runtime; the build loses what it
derives from `ssr` or `csr` set to `false` on a page. An app that relies on
that keeps the analysis with
`import { load as i18nLoad } from '$lib/i18n'; export const load = i18nLoad;`.

### Which locale

Each pass negotiates against the locales the config serves — the loaders'
locales and the keys of `translations` — and takes the first candidate that
matches, [`en-GB` falling back to `en`](#matchlocalerequested-available):

1. `preferredLocale(event)`, the visitor's choice: a cookie, a route param, a
   profile in `locals`;
2. the `Accept-Language` header; in an app without a server `load`, the
   browser's `navigator.languages`;
3. `initLocale`;
4. `fallbackLocale`.

`preferredLocale` runs on every navigation and every preload, and in an app
without a server `load` in the universal one, whose event has no `cookies`
(hence `cookies?.`). With a server `load` it runs in the browser only on a
root error page SvelteKit renders without the server's data, such as an
unknown URL a static host answers with its fallback page, and there too the
event has no `cookies`. A navigation to a prerendered page takes the locale
`preferredLocale` gave at build time, and otherwise keeps the tab's. It must only read the event. A value no configured locale
matches is skipped, and one that throws is logged once and skipped.

The server's answer rules. `i18n.setLocale('cs')` in the browser switches the
tab, and the switch stands across navigations until the server answers
differently. To make it outlive the session, persist it where
`preferredLocale` reads it:

```javascript
document.cookie = `lang=${locale}; path=/; max-age=31536000; samesite=lax`;
await i18n.setLocale(locale);
```

A locale in the URL is a route param:

```javascript
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.params.lang,
});
```

Loader `routes` then see the locale segment (`/cs/about`), since they match
`url.pathname`.

### What `data.i18n` is

In `+layout.svelte`, `+page.svelte`, `page.data` and a universal `parent()`,
`data.i18n` is the instance. In a server `parent()` it is what the server
branch returned: plain data, of which only `.locale` is meant to be read.
`use()` finds its data under a registry-wide symbol, not under `i18n`, so a
layout that renames or overwrites `data.i18n` does not break it.

### Combining with your own code

```javascript
// src/hooks.server.js
import { sequence } from '@sveltejs/kit/hooks';
import { handle as i18nHandle } from '$lib/i18n';

export const handle = sequence(i18nHandle, auth);
```

```javascript
// src/routes/+layout.server.js
import { load as i18nLoad } from '$lib/i18n';

export const load = async (event) => ({ ...(await i18nLoad(event)), user: event.locals.user });
```

Keep the spread: the universal branch returns the server's data along with the
instance, and a wrapper that picks fields drops the rest. A server wrapper must
call the i18n `load` before it returns — it reads `url`, which is what makes
SvelteKit run the layout again on the next navigation.

### Pitfalls

- **Translate in markup, not in `load`.** A string built in `load` is built
  once, in the locale of that pass; `i18n.t()` in the template follows a
  switch.
- **An app without a server `load` renders its SSR pass with no request
  headers**, so the server and the browser can negotiate differently. Put the
  locale in the URL, or add the server `load`.
- **A prerendered page has no visitor.** It renders the locale
  `preferredLocale` finds in the URL, or else `initLocale`/`fallbackLocale`. A
  client navigation to one takes the locale `preferredLocale` gave at build
  time, and otherwise keeps the tab's, so a cookie-first `preferredLocale` that
  falls back to the URL follows the URL there. A query string (`?lang=`) does
  not reach a prerendered page and the build's hostname is not the visitor's,
  so a locale read from either is not supported on one.
- **A negotiated response varies by visitor**, and `/kit` sets no `Vary`
  header. Before caching such a response in a shared cache, add `Vary` for what
  it depends on (`Accept-Language`, `Cookie`), or cache only pages whose locale
  is in the URL.
- **Each preload warms the target locale's translations** for the link's route.
  Turn preloading off where that costs too much:
  `data-sveltekit-preload-data="false"`.
- **Under a base path**, set [`basePath`](#basepath).
- **The hash router is not supported**: loaders match `url.pathname`, and the
  route lives in `url.hash`.
- **In the root layout, a loader's `error()` renders the static
  `src/error.html`**, not your `+error.svelte`; see
  [base — `loader`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#loader-required)
  for where SvelteKit follows a loader's control flow.

**📖 Full detail:**
[base — SvelteKit](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#sveltekit).

## Server-Side Rendering

A module that creates an instance is evaluated **once per process** on the
server, not once per request. A module-level instance is therefore shared by
every visitor being rendered concurrently: two requests for different locales
overwrite each other's `locale` and translation tables, and one visitor's
language ends up in another visitor's HTML.

[`sveltekit-i18n/kit`](#sveltekit) builds one instance per request and hands its
state to the client. The recipe below is the same wiring by hand, for an app
that needs something the wiring does not do.

### 1. Export the config, not the instance

```javascript
// src/lib/i18n.js

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  fallbackLocale: 'en',
  loaders: [
    {
      locale: ['en', 'cs'],
      namespace: 'common',
      loader: async ({ locale, namespace }) => (await import(`./translations/${locale}/${namespace}.json`)).default,
    },
  ],
};
```

### 2. Load on the server, per request

```javascript
// src/routes/+layout.server.js
import { I18n } from 'sveltekit-i18n';
import { config } from '$lib/i18n';

export const load = async ({ url, locals }) => {
  const i18n = new I18n(config);

  await i18n.loadTranslations(locals.locale, url.pathname);

  return { i18n: i18n.snapshot({ records: true }) };
};
```

`locals.locale` is whatever your `handle` hook resolved from the cookie, the URL
or the `Accept-Language` header — [`matchLocale()`](#matchlocalerequested-available)
matches such a value against the configured locales.

### 3. Build the instance the application renders with

```javascript
// src/routes/+layout.js
import { browser } from '$app/environment';
import { I18n } from 'sveltekit-i18n';
import { config } from '$lib/i18n';

// Assigned in the browser only — on the server this module-level binding
// would be the shared state we are avoiding.
let client;

export const load = async ({ data, url }) => {
  // `data` is null when no route matched: the error page renders through this
  // load too, and on a static host that is every unknown URL.
  let i18n = client;

  if (!i18n) {
    i18n = new I18n(config);

    i18n.hydrate(data?.i18n);

    if (browser) client = i18n;
  }

  await i18n.loadTranslations(data?.i18n?.locale ?? config.fallbackLocale, url.pathname);

  return { i18n };
};
```

This `load` runs on the server for the SSR pass and again in the browser on
hydration. Both start from the server's state: the loaders that delivered on
the server do not run a second time, and the locale is active before the first
render. Only what the server did not load — the route-scoped translations of
pages the visitor has not opened yet, the few namespaces the snapshot cannot
hand over, a loader that failed on the server — is fetched. Every later
client-side navigation reuses the same instance, so its cache survives.

The hand-off is applied once, inside the branch that builds the instance, and
**on top of** the config, so the config's own `translations` stay — the
language names a switcher renders in each language, typically. Leave
`initLocale` out of a config used this way: it starts a load inside the
constructor, before `hydrate()` can be called.

### 4. Pass it down through context

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import { setContext } from 'svelte';

  let { data, children } = $props();

  setContext('i18n', data.i18n);
</script>

{@render children()}
```

```svelte
<!-- any component -->
<script>
  import { getContext } from 'svelte';

  const i18n = getContext('i18n');
</script>

<p>{i18n.t('common.greeting')}</p>
```

The instance is reactive, so components re-render on a locale change without any
subscription.

### When a singleton is enough

The shared-state problem exists only on the server. A module-level instance is
safe when the server renders nothing visitor-specific — the application is
client-only (`export const ssr = false`), or every request renders the same
locale and no loader throws a `redirect()` or an `error()` that depends on the
visitor. Then `export const i18n = new I18n(config)`, imported wherever it is
needed, is all you need. An instance with a shorter life than the application
should be released with [`destroy()`](#destroy).

**📖 Full detail:**
[base — Server-Side Rendering](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#server-side-rendering).

## Testing components that translate

A real instance is cheap and synchronous. Inline translations need no loader, so
there is nothing to await and nothing to mock:

```javascript
import { I18n } from 'sveltekit-i18n';

const i18n = new I18n({
  initLocale: 'en',
  translations: {
    en: { 'common.greeting': 'Hello, {{name}}!' },
  },
});

i18n.t('common.greeting', { name: 'Alice' }); // → "Hello, Alice!"
```

`config.translations` is applied during construction and no loader matches, so
the locale is active before the constructor returns. Pass the instance to a
component that takes it as a prop. One that reads it with `get()` from your
`$lib/i18n` finds it where `use()` put it, which a test renders without — mock
your module's `get` to return it:

```javascript
vi.mock('$lib/i18n', async () => {
  const { I18n } = await import('sveltekit-i18n');
  const i18n = new I18n({ initLocale: 'en', translations: { en: { 'common.greeting': 'Hello, {{name}}!' } } });

  return { get: () => i18n };
});
```

Where a stub is genuinely wanted, `t` is a plain function on a plain object:

```javascript
const i18n = { t: (key) => key, locale: 'en' };
```

Building per test is the point: a per-test instance carries no state from the
previous case, so there is no reset-between-cases dance. Where a test does need
a load, await the method that started it rather than a timer:

```javascript
await i18n.loadTranslations('cs', '/about');
```

## Migrating from v2

v3 replaces the store surface with one reactive instance. The mechanical part of
a migration:

| v2 | v3 |
| --- | --- |
| `$t('key')`, `$locale`, `$loading` in a template | `i18n.t('key')`, `i18n.locale`, `i18n.loading` |
| `t.get('key')` in a `.js` file | `i18n.t('key')` — no `.get()` dual |
| `export const { t, locale } = new i18n(config)` | `export const i18n = new I18n(config)`; destructure through `$derived(i18n)` inside a component |
| `locale.set('cs')`, `locale.subscribe(…)` | `await i18n.setLocale('cs')`, or `i18n.locale = 'cs'` fire-and-forget |
| `await loading.toPromise()` | `await i18n.loadTranslations(locale, route)` — the load method returns the promise of the matching load |
| `getTranslationProps()` on the server | [`sveltekit-i18n/kit`](#sveltekit), or `i18n.snapshot({ records: true })` on a per-request instance, applied on the client with `hydrate()` |
| `parserOptions` for `@sveltekit-i18n/parser-default` | `parserOptions` for `parser-curly`, built in; per-call props are keyed by modifier name (`{ number: { … } }`) |
| Stores anywhere (`import { get } from 'svelte/store'`) | plain reads; add [`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores) to `config.extensions` for the `$t` form |
| `new i18n<Parser.Params<Payload>>(config)` | `new I18n<Config<Payload>, Payload>(config)` ([with a registered schema](#one-payload-type-for-every-message), the opt-out form), or `config.schema` for per-key payloads |
| `class MyI18n extends i18n {}` | an entry in [`config.extensions`](#extensions) — the exported `I18n` is a facade, there is nothing to subclass |

Also worth knowing:

- **One install.** `@sveltekit-i18n/parser-default` is gone. If it sat beside
  this package, drop it: `parser-curly` replaces it and comes with this package,
  so do not add `@sveltekit-i18n/base` or `@sveltekit-i18n/parser-curly` either.
  If you built on `@sveltekit-i18n/base` directly, you are not migrating to this
  package — keep base and swap `parser-default` for
  [`parser-curly`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly),
  [`parser-icu`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu),
  [`parser-mf2`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-mf2)
  or [`parser-i18next`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-i18next),
  passed as `config.parser`.
- **Per-request instances on the server.** A module-level singleton leaks one
  visitor's locale into another's page — [`sveltekit-i18n/kit`](#sveltekit)
  builds them for you.
- **A loader names its `namespace`.** v2's `key` still works in v3, deprecated
  since 3.1.
- **ESM only, Svelte 5+, on Node 22+, Bun 1.2+ or Deno 2+.** There is no CJS
  entry, and the core's rune
  modules are compiled by your bundler.
- **Parser reports are silent** unless `parserOptions.onReport` names a channel.

## Upgrading from 3.0

A 3.0 config loads in 3.1 as it is. What changes:

- **Messages follow version 3 of the Curly Message Format**, which 3.1 brings
  in with `@sveltekit-i18n/parser-curly` 3.1. A payload value is data and is
  never read as syntax, so a catalogue that composed messages through its
  payload (a value holding `{{count}}`), or that doubled backslashes in values,
  renders differently. Set
  [`parserOptions.onSuspectValue`](#parseroptionsonsuspectvalue) while
  migrating: it announces every value version 1 would have read as syntax.
- **`pass-limit` is gone from `Report['code']`**, replaced by `read-limit` and
  `nesting-limit`, so an [`onReport`](#parseroptionsonreport) handler that
  names it stops compiling.
- **Seeds no longer count as loaded.** Data passed to `config.translations` or
  `addTranslations()` records nothing, so the loaders of its namespaces still
  run. A client that applied the server's `snapshot()` with
  `addTranslations()` fetches everything again after hydration — move to
  [`sveltekit-i18n/kit`](#sveltekit), or to
  [`snapshot({ records: true })`](#snapshotoptions) with
  [`hydrate()`](#hydrateenvelope).
- **Each loader is recorded on its own**, so a namespace may be split into
  route-scoped loaders, and **named capture groups in a route `RegExp` are
  route params** — turn a group you only use for grouping into `(?:...)`.
- **SvelteKit's `redirect()` and `error()` below 500**, thrown from a loader,
  reject the load, and the call is undone. Any other throw still fails soft.
- **A loader that returns nothing counts as loaded**; throw to have it retried.
- **The loader `key` is deprecated** in favour of `namespace`, and logs a
  warning once per loader descriptor.
- **New:** [`sveltekit-i18n/kit`](#sveltekit), [`basePath`](#basepath),
  loaders listing several locales and namespaces, route params and
  `cache: false` on a loader ([`loaders`](#loaders)),
  [`loadTranslations(…, { activate: false })`](#loadtranslationslocale-route-options),
  [`loadNamespace()`](#loadnamespacenamespace-locale),
  [`invalidate(locale?, namespace?)`](#invalidatelocale-namespace),
  [`matchLocale()`, `textDirection()` and `resolveLoaders()`](#utilities).

The whole list, with every behaviour change and type change:
[base — Upgrading from 3.0](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#upgrading-from-30),
and the format's move in
[parser-curly's changelog](https://github.com/sveltekit-i18n/parsers/blob/master/parser-curly/CHANGELOG.md#310).

## See Also

### Documentation

- **[Getting Started](./GETTING_STARTED.md)** – Step-by-step tutorial
- **[Architecture Overview](./ARCHITECTURE.md)** – How everything works
- **[Best Practices](./BEST_PRACTICES.md)** – Recommended patterns
- **[Troubleshooting](./TROUBLESHOOTING.md)** – Common issues and solutions
- **[Documentation Index](./INDEX.md)** – Everything in one place

### Related Packages

- **[@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md)** – The core, and the canonical reference for every shared member
- **[@sveltekit-i18n/parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly)** – The message parser wired here
- **[Curly Message Format](https://curlymessage.dev)** – The format specification
- **[@sveltekit-i18n/parser-icu](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu)** – ICU message format, for an application built on the core directly
- **[@sveltekit-i18n/parser-mf2](https://github.com/sveltekit-i18n/parsers/tree/master/parser-mf2)** – Unicode MessageFormat 2, likewise
- **[@sveltekit-i18n/parser-i18next](https://github.com/sveltekit-i18n/parsers/tree/master/parser-i18next)** – The i18next syntax, likewise
- **[@sveltekit-i18n/extension-stores](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores)** – The Svelte store surface, as an extension
- **[@sveltekit-i18n/typegen](https://github.com/sveltekit-i18n/typegen)** – Generates the `schema` type from your translations

### Examples

- **[All Examples](../examples)** – Complete list with live demos
