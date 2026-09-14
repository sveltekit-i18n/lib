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
- [Server-Side Rendering](#server-side-rendering)
- [Testing components that translate](#testing-components-that-translate)
- [Migrating from v2](#migrating-from-v2)
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

```javascript
// src/lib/translations/index.js
import { I18n } from 'sveltekit-i18n';

export const config = {
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

export const i18n = new I18n(config);
```

`I18n` is a named export; the default export is the same binding, so
`import I18n from 'sveltekit-i18n'` works too.

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
`Report`) and its build-time
[`extractParamsFactory`](#extractparamsfactory); the parser factory itself is
wired internally, so there is nothing to construct.

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
| `translations` | `Translations.T` | – | locale-indexed translations available before any loader runs |
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

Each entry declares a `locale`, a `key` (the namespace the data is stored
under — no dots) and an async `loader`. An optional `routes` array scopes it:
a string, a `RegExp`, or anything with a `test` method, matched against the
route path.

```javascript
const config = {
  loaders: [
    // Every page
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    // Product pages only
    {
      locale: 'en',
      key: 'products',
      routes: [/^\/products/],
      loader: async () => (await import('./en/products.json')).default,
    },
    // The load context is passed in
    {
      locale: 'en',
      key: 'dynamic',
      loader: async ({ locale }) => (await fetch(`/api/translations/${locale}`)).json(),
    },
  ],
};
```

A loader runs **once per locale per freshness window**: its key is recorded as
loaded and it is skipped afterwards. So `route` is context for the loader, not
a cache key — scope route-varying data with `routes`, one entry per route
group, rather than reading `route` inside a global loader. A loader that throws
is caught and logged individually, so one broken loader does not fail the batch.

**📖 Full detail** (sharing a key, route matchers, the loader lifecycle):
[base — `loaders`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#loaders).

### `translations`

Locale-indexed data that is present before any loader runs — language names,
critical strings, or the payload a server rendered:

```javascript
const config = {
  translations: {
    en: { 'languages.en': 'English', 'languages.cs': 'Czech' },
    cs: { 'languages.en': 'Angličtina', 'languages.cs': 'Čeština' },
  },
};
```

It is applied synchronously during construction, and its keys count as loaded,
so matching loaders will not refetch them. That is what makes it the hydration
slot for [`snapshot()`](#snapshot).

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
expires: loaders run once and translation files ship with the application. A
finite window suits a CMS or an API — once elapsed, the **next** load trigger
refetches; nothing refetches on its own in the background. For event-driven
refreshes keep the default and call [`invalidate()`](#invalidatelocale).

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
Only its type is read, so the slot may hold an empty value. See
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
[Curly Message Format](https://github.com/curly-message/spec)'s reference
implementation.

```javascript
const config = {
  parserOptions: {
    modifierDefaults: { number: { maximumFractionDigits: 2 } },
    customModifiers: { upper: ({ value }) => value.toUpperCase() },
    onReport: (report) => console.warn(report.message, report),
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
| `code` | `unknown-modifier`, `failed-modifier`, `missing-options`, `unserializable-value`, `missing-locale`, `pass-limit` or `output-limit` |
| `origin` | who fixes it: `message` (the message as written), `payload` (what the call passed) or `limit` (a bound the parser set) |
| `message` | a self-contained English sentence carrying nothing from the payload |
| `id` | the message's id — the translation key the core passed |
| `limit` | the limit reached, for the two limit reports |
| `text` | the excerpt — the placeholder, or the output that would not settle — cut to 120 code units and escaped, so it can be written anywhere |

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
| `loadTranslations`, `loadConfig`, `setLocale`, `setRoute` | promise-returning |
| `addTranslations`, `invalidate`, `snapshot`, `destroy` | synchronous |

**⚠️ Do not destructure the value properties.** A destructured value is a
one-time snapshot and never updates. `t` and `l` are functions and stay reactive
even when destructured, because their tracked reads happen at call time — their
identity is refreshed whenever the config, the translations or the locale
change, so passing `t` to a child component is tracked as well.

Inside a component, destructure through `$derived(i18n)` if you want short
names — each binding then stays in sync:

```svelte
<script>
  import { i18n } from '$lib/translations';

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

`true` while **any** load is in flight, back to `false` once the last one
settles. To wait for a specific load, await the promise the method that started
it returned — never poll this flag.

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
  import { i18n } from '$lib/translations';
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

`loadTranslations`, `setLocale` and `setRoute` each return the promise of the
**matching** load. Concurrent duplicate triggers for the same locale and route
join the load already in flight and receive its promise instead of fetching
twice, so awaiting is all the coordination an application needs. `loadConfig`
is the exception: it returns the promise of the config load, which is not
deduplicated and which starts a load only when the new config names a locale to
load for.

#### `loadTranslations(locale, route?)`

**Type:** `(locale: string, route?: string) => Promise<void>`

Loads translations for a locale and route, and activates the locale once they
resolved.

```javascript
// src/routes/+layout.js
import { i18n } from '$lib/translations';

export const load = async ({ url }) => {
  await i18n.loadTranslations('en', url.pathname);

  return {};
};
```

The instance above is a module-level singleton, which on the server is shared by
every request in the process — see [Server-Side Rendering](#server-side-rendering).

**Errors:** a loader that throws is caught and logged individually. Anything
that throws afterwards — a custom `preprocess`, a malformed payload — rejects
the returned promise, so `await` surfaces it (in SvelteKit, straight to the
error boundary). A result you discard is safe: the failure is reported through
the logger and never becomes an unhandled rejection, but it is then only visible
in the log.

#### `setLocale(locale?)`

**Type:** `(locale?: string) => Promise<void>`

Requests a locale. If a route is already set the load starts immediately;
otherwise it fires when the route arrives. An unknown locale — no loader, no
`fallbackLocale` match — resolves without changing anything.

#### `setRoute(route)`

**Type:** `(route: string) => Promise<void>`

Updates the current route and loads route-scoped translations for the requested
locale, if one is known.

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

Adds translations immediately. The payload is preprocessed per
[`config.preprocess`](#preprocess) and merged branch by branch, so a namespace
that already holds data is added to rather than replaced; a leaf declared twice
takes the incoming value. Added keys count as loaded, so matching loaders will
not refire. Locale keys are normalized before they are merged.

```javascript
i18n.addTranslations({
  en: { 'languages.en': 'English', 'languages.cs': 'Czech' },
  cs: { 'languages.en': 'Angličtina', 'languages.cs': 'Čeština' },
});
```

#### `invalidate(locale?)`

**Type:** `(locale?: string) => void`

Marks loaded translations stale — for one locale, or for all of them when
called without arguments. The call starts **no** load and the displayed
translations stay in place; loaders run again on the next load trigger.

```javascript
// A CMS webhook told us the English content changed:
i18n.invalidate('en');

// Nothing happens until the next load trigger:
await i18n.loadTranslations('en', location.pathname);
```

A load already in flight for an invalidated locale is severed: it still
settles, but its data is discarded — it predates the invalidation — so the next
trigger starts a fresh fetch instead of joining it.

#### `snapshot()`

**Type:** `() => Record<string, any>`

Serializes what the instance holds for the **active locale** and the
**`fallbackLocale`**, narrowed to the current route. The result is shaped like
[`translations`](#translations--rawtranslations), so a receiving instance
hydrates by handing it straight to [`config.translations`](#translations) — the
bookkeeping derived from it keeps the matching loaders from fetching the same
data again. This is the payload the server hands the client; see
[Server-Side Rendering](#server-side-rendering).

What it leaves out: every other locale, and any key claimed *only* by loaders
whose `routes` do not match the current route (the client loads those when it
navigates there). A key no loader claims — one added through
`addTranslations()` — is always kept. The data is **pre-preprocess**, so the
receiving instance applies its own `config.preprocess`, and freshness is not
transferred: a hydrated locale's [`cache`](#cache) window starts when the client
receives the data.

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
  import { config } from '$lib/translations';

  const i18n = new I18n(config);

  $effect(() => () => i18n.destroy());
</script>
```

A module-level singleton lives as long as the application and needs no call.
The method is idempotent.

**📖 Full instance reference:**
[base — Instance Properties and Methods](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#instance-properties-and-methods).

## Message format

Messages are written in the [Curly Message Format](https://github.com/curly-message/spec).
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
- **Nesting.** An option's value may contain placeholders of its own — nesting
  is resolved by interpolating the output again.
- **Escaping.** A backslash cancels the structural meaning of `:`, `;`, `{`,
  `}`, whitespace and the backslash itself; before any other character it is
  plain text, so `\d+` and `C:\\temp` survive as typed.
- **Every value reaches the output as text.** A plain object or an array becomes
  JSON; anything else becomes what `String()` makes of it.

**📖 Complete syntax guide, payload wrappers and resolution limits:**
[parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly#readme)
and the [format specification](https://github.com/curly-message/spec).

## Exported types

```typescript
import type { Config, Modifier, Parser, Report } from 'sveltekit-i18n';
import type { BaseConfig, BaseParser, Extension, Loader, Logger, Schema, Translations } from 'sveltekit-i18n';
```

| Export | Origin | What it holds |
| --- | --- | --- |
| `Config<Payload, Props>` | this package | the config above — the core's, minus `parser`, plus `parserOptions` |
| `Parser` | parser-curly | `Parser.Options`, `Parser.OnReport`, `Parser.Params`, `Parser.Payload` |
| `Modifier` | parser-curly | `Modifier.T`, `Modifier.Props`, `Modifier.Wrapper` |
| `Report` | parser-curly | what [`onReport`](#parseroptionsonreport) receives |
| `BaseConfig` | core, renamed | the core's `Config` namespace: `Config.T`, `Config.LocaleInput`, `Config.LocalesFromConfig`, … |
| `BaseParser` | core, renamed | the core's `Parser` namespace — the parser **contract**: `Parser.T`, `Parser.Parse`, `Parser.ExtractParams`, `Parser.ParamSpec`, … |
| `Extension` | core | `Extension.T`, `Extension.Operator`, `Extension.Generic`, `Extension.Piped` |
| `Loader` | core | `Loader.LoaderModule`, `Loader.Route`, `Loader.Props`, … |
| `Logger` | core | `Logger.T`, `Logger.Level` |
| `Schema` | core | `Schema.FromConfig`, `Schema.Key`, `Schema.Params`, `Schema.Payload` |
| `Translations` | core | `Translations.T`, `Translations.SerializedTranslations`, … |

**Why `BaseConfig` and `BaseParser`.** This package publishes a `Config` of its
own (the parser-less one) and re-exports parser-curly's `Parser`, so the core's
namespaces of those two names cannot keep them. Everything else the core
exports keeps its name. The rename is the only difference between the core's
entry and this one — a consumer never needs to install the core to reach a type.

The parser factory is **not** re-exported: it is wired internally and there is
nothing to construct. One parser value is — the parameter extractor below.

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
catalogue differently from the parser that renders it. `onReport` and
`modifierDefaults` reach nothing here — extraction formats nothing and reports
nothing.

It is a separate export rather than a member of the parser object on purpose: a
message scanner is of no use while rendering, and a bundle that never reaches it
drops it.

## Utilities

Two helpers the instance uses internally are published on a subpath, for the
cases where application code has to match the library's own behavior:

```javascript
import { sanitizeLocales, toDotNotation } from 'sveltekit-i18n/utils';
```

The subpath exports these two plus the `DotNotation` type they are described
with; the rest of the internals stays private.

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

## TypeScript

The package is written in TypeScript and ships its declarations. What you get:

- ✅ Type definitions for every configuration slot
- ✅ Typed properties and methods, with `t`/`l` returning `string`
- ✅ Typed keys and payloads, from a [`schema`](#typing-keys-and-payloads-with-schema) you supply
- ✅ Locale completion, from the locales the config spells
- ✅ [`extractParamsFactory`](#extractparamsfactory), which reports what a message expects of its payload
- ❌ Generating that schema from your translation files — the slot and the extractor ship, not the generator

A schema generator is 3.1 work ([#234](https://github.com/sveltekit-i18n/lib/issues/234)).
Until then the schema is hand-written for a small project, or emitted by your
own build step from what the extractor reports.

### Typing keys and payloads with `schema`

`config.schema` maps each translation key to the payload its message expects.
Supplying it types `t()` and `l()`: keys autocomplete, an unknown key is a type
error, and the payload argument is checked against the key's entry.

**Only the type is read** — nothing reads this value at runtime, so the slot may
hold an empty value:

```typescript
import { I18n } from 'sveltekit-i18n';

type TranslationSchema = {
  'common.greeting': { name: string };  // payload required
  'common.about': never;                // message takes no parameters
  'home.title': { title?: string };     // nothing required — payload optional
};

export const i18n = new I18n({
  ...config,
  schema: {} as TranslationSchema,
});

i18n.t('common.greeting', { name: 'Alice' }); // ok
i18n.t('common.about');                       // ok

i18n.t('common.headline');                    // Error: unknown key
i18n.t('common.greeting');                    // Error: missing payload
i18n.t('common.greeting', { name: 42 });      // Error: wrong payload shape
i18n.t('common.about', { title: 'About' });   // Error: takes no payload
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

**⚠️ A schema whose keys are not a closed set is ignored.** An open index
signature, or a schema with no keys at all, would reject every key or demand a
payload for keys it knows nothing about — so keys degrade to plain `string` and
calls are typed as if no schema were supplied.

**⚠️ Construction time only.** The type is read off the config the constructor
receives: a later [`loadConfig()`](#loadconfigconfig) cannot retype an existing
instance, and an [extension](#extensions) typed by a fixed return type erases
the instance's type parameters altogether.

### One payload type for every message

Where every message shares one payload shape, state it through the constructor's
type arguments rather than a schema:

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

type Payload = { applicationName: string };

const config: Config<Payload> = { loaders: [/* … */] };

export const i18n = new I18n<Config<Payload>, Payload>(config);

i18n.t('common.welcome', { applicationName: 'My app' }); // ok
i18n.t('common.welcome', { aplicationName: 'My app' });  // Error: typo caught
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
  loaders: [{ locale: 'sk', key: 'common', loader: async () => ({}) }],
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

## Server-Side Rendering

A module that creates an instance is evaluated **once per process** on the
server, not once per request. A module-level instance is therefore shared by
every visitor being rendered concurrently: two requests for different locales
overwrite each other's `locale` and translation tables, and one visitor's
language ends up in another visitor's HTML.

Build **one instance per request** instead, and hand its data to the client with
[`snapshot()`](#snapshot).

### 1. Export the config, not the instance

```javascript
// src/lib/translations/index.js

/** @type {import('sveltekit-i18n').Config} */
export const config = {
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
  ],
};
```

### 2. Load on the server, per request

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

`locals.locale` is whatever your `handle` hook resolved from the cookie, the URL
or the `Accept-Language` header — [`sanitizeLocales()`](#sanitizelocaleslocales)
normalizes such a value the way the instance does.

### 3. Build the instance the application renders with

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
not run a second time; only what the snapshot left out — the route-scoped
translations of pages the visitor has not opened — is fetched. Every later
client-side navigation reuses the same instance, so its cache survives.

The snapshot is merged **over** the config's own `translations` rather than
replacing them, because it carries only the active locale and the fallback.
Overwriting the slot would drop every other locale's inline entries — the
language names a switcher renders in each language, typically — and those have
no loader to fetch them back.

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
locale. Then `export const i18n = new I18n(config)`, imported wherever it is
needed, is all you need. An instance with a shorter life than the application
should be released with [`destroy()`](#destroy).

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
the locale is active before the constructor returns. Pass the instance to the
component the same way the application does — through Svelte context, or as a
prop.

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
| `getTranslationProps()` on the server | `i18n.snapshot()` on a per-request instance, handed back through `config.translations` |
| `parserOptions` for `@sveltekit-i18n/parser-default` | `parserOptions` for `parser-curly`, built in; per-call props are keyed by modifier name (`{ number: { … } }`) |
| Stores anywhere (`import { get } from 'svelte/store'`) | plain reads; add [`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores) to `config.extensions` for the `$t` form |
| `new i18n<Parser.Params<Payload>>(config)` | `new I18n<Config<Payload>, Payload>(config)`, or `config.schema` for per-key payloads |
| `class MyI18n extends i18n {}` | an entry in [`config.extensions`](#extensions) — the exported `I18n` is a facade, there is nothing to subclass |

Also worth knowing:

- **One install.** `@sveltekit-i18n/parser-default` is gone; remove it, and do
  not add `@sveltekit-i18n/base` or `@sveltekit-i18n/parser-curly` either.
- **Per-request instances on the server.** A module-level singleton leaks one
  visitor's locale into another's page — see
  [Server-Side Rendering](#server-side-rendering).
- **ESM only, Node 22+, Svelte 5+.** There is no CJS entry, and the core's rune
  modules are compiled by your bundler.
- **Parser reports are silent** unless `parserOptions.onReport` names a channel.

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
- **[Curly Message Format](https://github.com/curly-message/spec)** – The format specification
- **[@sveltekit-i18n/parser-icu](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu)** – ICU message format, for an application built on the core directly
- **[@sveltekit-i18n/extension-stores](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores)** – The Svelte store surface, as an extension

### Examples

- **[All Examples](../examples)** – Complete list with live demos
