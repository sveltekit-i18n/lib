# Troubleshooting & FAQ

This guide helps you diagnose and fix common issues when using `sveltekit-i18n`. If you don't find your issue here, check [GitHub Issues](https://github.com/sveltekit-i18n/lib/issues) or create a new one.

Everything below assumes the 3.4 surface: **one reactive instance, no stores**, wired into SvelteKit by `sveltekit-i18n/kit`. If you are upgrading, start with [Upgrading from v2](#upgrading-from-v2), [Upgrading from 3.0](#upgrading-from-30) or, from 3.2 or 3.3, the API docs' [Upgrading from 3.2](./README.md#upgrading-from-32) and [Upgrading from 3.3](./README.md#upgrading-from-33) — that is where the first-day errors are. The [API documentation](./README.md) describes the surface itself, and [base's documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md) is the canonical reference for every member this package inherits from the core.

## Table of Contents

- [Upgrading from v2](#upgrading-from-v2)
  - [`$t` is not a store](#t-is-not-a-store)
  - [A destructured `locale` or `loading` never updates](#a-destructured-locale-or-loading-never-updates)
  - [`.get()`, `.set()` and `.subscribe()` are gone](#get-set-and-subscribe-are-gone)
  - [Awaiting the wrong thing](#awaiting-the-wrong-thing)
  - [`getTranslationProps()` is gone](#gettranslationprops-is-gone)
  - [`i18n instanceof I18n` is `false`](#i18n-instanceof-i18n-is-false)
- [Upgrading from 3.0](#upgrading-from-30)
  - [Everything is fetched again after hydration](#everything-is-fetched-again-after-hydration)
  - [A warning that `key` is deprecated](#a-warning-that-key-is-deprecated)
  - [A loader's `redirect()` or `error()` rejects the load](#a-loaders-redirect-or-error-rejects-the-load)
- [Setup and packaging](#setup-and-packaging)
  - [`$state is not defined`](#state-is-not-defined)
  - [Two copies of the core](#two-copies-of-the-core)
  - [`ERR_REQUIRE_ESM`](#err_require_esm)
- [Common Issues](#common-issues)
  - [Translations Not Loading](#translations-not-loading)
  - [Translation Keys Displayed Instead of Values](#translation-keys-displayed-instead-of-values)
  - [Translations Flash/Change After Page Load](#translations-flashchange-after-page-load)
  - [Route-Based Loading Not Working](#route-based-loading-not-working)
  - [Locale Not Changing](#locale-not-changing)
  - [Translations Never Refresh](#translations-never-refresh)
  - [A Visitor Sees Another Visitor's Language](#a-visitor-sees-another-visitors-language)
  - [The Error Page Is Blank](#the-error-page-is-blank)
  - [Parser Complaints Go Nowhere](#parser-complaints-go-nowhere)
  - [TypeScript Errors](#typescript-errors)
  - [Tests That Mock the Translations Module](#tests-that-mock-the-translations-module)
  - [Performance Issues](#performance-issues)
- [Debugging Tips](#debugging-tips)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Known Limitations](#known-limitations)
- [Getting Help](#getting-help)
- [See Also](#see-also)

For brevity, the snippets below import a module-level `i18n` from `$lib/i18n`. That is safe in the browser and in a client-only application; on the server it is shared by every request being rendered — see [A Visitor Sees Another Visitor's Language](#a-visitor-sees-another-visitors-language). With `sveltekit-i18n/kit`, a component reads the instance with `get()` instead.

## Upgrading from v2

### `$t` is not a store

**Symptoms:**
- `store_invalid_shape` at runtime: `` `t` is not a store with a `subscribe` method ``
- `$t is not a function`, or `$locale` / `$loading` reading as `undefined`
- The compiler rejects the `$` prefix on an import from your translations module

**Cause:**

v3 has no stores. `t`, `l`, `locale`, `loading`, `initialized`, `translations` and `rawTranslations` are members of one reactive instance, read with plain property and method access. Reads are tracked wherever Svelte tracks them — a component template, `$derived`, `$effect` — so there is nothing to subscribe to.

**Problem:**

```svelte
<!-- ❌ v2 -->
<script>
  import { t, locale } from '$lib/i18n';
</script>

<h1>{$t('home.title')}</h1>
<p>{$locale}</p>
```

**Solution:**

```svelte
<!-- ✅ v3 -->
<script>
  import { i18n } from '$lib/i18n';
</script>

<h1>{i18n.t('home.title')}</h1>
<p>{i18n.locale}</p>
```

**If you want the `$` form back**, it ships as an official extension:

```bash
npm install @sveltekit-i18n/extension-stores
```

```javascript
// src/lib/i18n.js
import { I18n } from 'sveltekit-i18n';
import stores from '@sveltekit-i18n/extension-stores';

export const config = {/* ... */};

export const { t, l, locale, loading } = new I18n({ ...config, extensions: [stores] });
```

`config.extensions` pipes the constructed instance through its entries left to right, so `new I18n(config)` evaluates to the store-shaped output. Note the two v2 members that did **not** come back: `loading.toPromise()` (await the load method instead) and `locale.forceSet()` (`invalidate()` plus `setLocale()`). See [extension-stores](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores).

---

### A destructured `locale` or `loading` never updates

**Symptoms:**
- The language switcher works, but the label next to it is frozen on the first locale
- `loading` is `false` forever, or `true` forever
- Everything is correct when you write `i18n.locale` instead

**Cause:**

Destructuring reads the property **once**. The value that comes out is a plain snapshot with no connection to the instance — this is the ordinary rune rule, not something specific to this library.

**Problem:**

```svelte
<script>
  import { i18n } from '$lib/i18n';

  // ❌ one-time snapshots
  const { locale, loading } = i18n;
</script>

{#if loading}Loading…{:else}{locale}{/if}
```

**Solution:**

Keep the instance, or destructure through `$derived(i18n)` so each binding stays in sync:

```svelte
<script>
  import { i18n } from '$lib/i18n';

  // ✅ every binding tracks the instance
  const { locale, loading } = $derived(i18n);
</script>

{#if loading}Loading…{:else}{locale}{/if}
```

`t` and `l` are the exception: they are **functions**, and their tracked reads happen at call time, so `const { t } = i18n` stays reactive and can be passed to a child component. In a plain `.js` module, where nothing tracks reads, always go through the instance (`i18n.locale`).

---

### `.get()`, `.set()` and `.subscribe()` are gone

**Symptoms:**
- `i18n.t.get is not a function`
- `locale.set is not a function`, `locale.subscribe is not a function`
- `import { get } from 'svelte/store'` no longer helps with anything

**Cause:**

There are no store duals in v3. A read is a read, in a template and in a `.js` file alike.

| v2 | v3 |
| --- | --- |
| `$t('key')` / `t.get('key')` | `i18n.t('key')` |
| `$locale` / `get(locale)` | `i18n.locale` |
| `locale.set('cs')` | `await i18n.setLocale('cs')`, or `i18n.locale = 'cs'` fire-and-forget |
| `locale.subscribe(fn)` | `$effect(() => fn(i18n.locale))` |
| `locale.forceSet('cs')` | `i18n.invalidate('cs')` then `await i18n.setLocale('cs')` |

**⚠️ Assigning `locale` is fire-and-forget.** The property advances once the new locale's translations resolved, so reading it back on the next line still gives the old value. Await `setLocale()` when you need to know the switch finished.

---

### Awaiting the wrong thing

**Symptoms:**
- `i18n.loading.toPromise is not a function`
- A `while (i18n.loading) {}` or polling loop that never ends
- Code after `setLocale()` runs against the previous locale's translations

**Cause:**

`loading` is a plain reactive boolean — `true` while **any** load is in flight — not a promise and not something to poll. Every load-starting method returns the promise of the **matching** load instead, and concurrent duplicate triggers for the same locale and route join the load already in flight rather than fetching twice.

**Problem:**

```javascript
// ❌ v2
await loading.toPromise();
```

**Solution:**

```javascript
// ✅ await what started the load
await i18n.loadTranslations('cs', '/about');
await i18n.setLocale('cs');
await i18n.setRoute('/about');
await i18n.loadConfig(config);
```

`loading` stays useful for rendering a spinner. It is never the way to sequence code.

---

### `getTranslationProps()` is gone

**Symptoms:**
- `getTranslationProps is not a function` in a server `load`

**Cause:**

The SSR hand-off is a pair on the instance: [`snapshot({ records: true })`](./README.md#snapshotoptions) on the server, [`hydrate()`](./README.md#hydrateenvelope) on the client. [`sveltekit-i18n/kit`](./README.md#sveltekit) calls both for you.

**Solution:**

Let the wiring do it:

```javascript
// src/lib/i18n.js
import { defineI18n } from 'sveltekit-i18n/kit';

export const config = {/* ... */};

export const { handle, load, use, get } = defineI18n(config);
```

```javascript
// src/routes/+layout.server.js and src/routes/+layout.js
export { load } from '$lib/i18n';
```

Or wire it by hand:

```javascript
// server: serialize what this request loaded, and the loaders that delivered it
return { i18n: i18n.snapshot({ records: true }) };

// client: apply it on top of the config
const i18n = new I18n(config);

i18n.hydrate(data?.i18n);
```

`hydrate()` displays the data and keeps the loaders the records name from running again. `addTranslations()` does neither of the latter: it only seeds, so every loader would run again. Build the server-side instance **per request** — see [A Visitor Sees Another Visitor's Language](#a-visitor-sees-another-visitors-language) — and read the whole manual recipe in [Server-Side Rendering](./README.md#server-side-rendering).

---

### `i18n instanceof I18n` is `false`

**Symptoms:**
- An `instanceof` check against the exported constructor fails for an instance the constructor just returned
- `class MyI18n extends I18n {}` does not behave like a subclass

**Cause:**

`new I18n(config)` returns **the core's** instance, not one of its own, and [`config.extensions`](./README.md#extensions) may replace it again. The exported `I18n` is a typed facade over the core; there is no class to subclass.

**Solution:**

Feature-detect where you have to test a value, and reach for an extension where you wanted a subclass:

```javascript
// ❌
if (value instanceof I18n) { /* ... */ }

// ✅
if (typeof value?.t === 'function') { /* ... */ }
```

```javascript
// ✅ what a v2 subclass is now
const withGreeting = (i18n) => Object.assign(i18n, {
  greet: (name) => i18n.t('common.greeting', { name }),
});

export const i18n = new I18n({ ...config, extensions: [withGreeting] });
```

This is documented rather than fixed.

---

## Upgrading from 3.0

A 3.0 config loads in 3.1 as it is. The whole list of changes is in [base's upgrade notes](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#upgrading-from-30) and, for the messages, [parser-curly's changelog](https://github.com/sveltekit-i18n/parsers/blob/master/parser-curly/CHANGELOG.md#310); these are the ones that show up as symptoms.

### A payload value shows up as `{{…}}` or with its backslashes

**Symptoms:**
- A message that composed text through its payload renders the placeholder itself: `t('x', { v: '{{count}}', count: 2 })` shows `{{count}}` where 3.0 showed `2`
- A value with doubled backslashes keeps both of them

**Cause:**

3.1 moves the messages to version 3 of the Curly Message Format. Version 1 read a payload value back as message source; version 3 treats it as data and renders it as it stands.

**Solution:**

Write the composition into the message instead of the payload, and set [`parserOptions.onSuspectValue`](./README.md#parseroptionsonsuspectvalue) while migrating: it announces every value version 1 would have read as syntax. Unset it once the catalogue is migrated.

### Everything is fetched again after hydration

**Symptoms:**
- After upgrading, the browser fetches every namespace the server already rendered
- The network tab shows the loaders running right after hydration

**Cause:**

In 3.0, data passed to `addTranslations()` or `config.translations` marked its namespaces loaded. In 3.1 it only **seeds** the tables: it records nothing, so the loaders of those namespaces still run. A client that applies the server's `snapshot()` with `addTranslations()` therefore loads everything again.

**Solution:**

Move to [`sveltekit-i18n/kit`](./README.md#sveltekit), or keep the manual wiring and switch it to the records form:

```javascript
// src/routes/+layout.server.js
return { i18n: i18n.snapshot({ records: true }) };
```

```javascript
// src/routes/+layout.js, where the client instance is built
i18n.hydrate(data?.i18n);

await i18n.loadTranslations(data?.i18n?.locale ?? config.fallbackLocale, url.pathname);
```

The whole recipe is in [Server-Side Rendering](./README.md#server-side-rendering).

---

### A warning that `key` is deprecated

**Symptoms:**
- `Loader 'common' uses 'key', which is deprecated. Rename it to 'namespace'.` in the log, once per loader descriptor

**Cause:**

3.1 renames the loader's `key` to `namespace`. `key` is still honored exactly as `namespace` is, and reported once per descriptor; it is removed in the next major.

**Solution:**

```javascript
// ❌ 3.0 spelling
{ locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default }

// ✅ 3.1
{ locale: 'en', namespace: 'common', loader: async () => (await import('./en/common.json')).default }
```

Naming both is a type error, and `key` takes a single namespace only. A library that must still serve 3.0 apps keeps `key` until it drops 3.0.

---

### A loader's `redirect()` or `error()` rejects the load

**Symptoms:**
- A page that rendered in 3.0 with a namespace missing now redirects, or renders an error page
- `setLocale()` rejects, and the locale stays where it was
- The log shows an `error` containing `Rejecting the load`

**Cause:**

In 3.0 every throw from a loader failed soft. In 3.1, SvelteKit's `redirect()` and an `error()` below 500 — told by the shape of what SvelteKit throws — **reject the load** once the other loaders have settled. The locale does not advance, the call is undone, and awaited in a `load`, SvelteKit follows it. Any other throw, an `error()` of 500 or more included, still fails soft. A remote `query` that fails on the client throws an `HttpError` of the response's status, so a 4xx from one rejects the load too.

**Solution:**

Throw control flow only for what should stop the page:

```javascript
// `error` from '@sveltejs/kit'; the loader's `routes` capture `topic`
loader: async ({ locale, params }) => {
  const response = await fetch(`https://api.example.com/i18n/${locale}/help/${params.topic}`);

  // No such topic: SvelteKit renders its error page.
  if (response.status === 404) error(404, 'No such topic');
  // Anything else: logged, and the page renders without it.
  if (!response.ok) throw new Error(`${response.status} ${response.statusText}`);

  return response.json();
},
```

- A loader that redirects must not run on the page it redirects to — give it `routes` that leave that page out.
- Called from an event handler, nothing follows the control flow but your code: catch it and check `isRedirect()` / `isHttpError()` from `@sveltejs/kit`.
- In the root layout, an `error()` renders the static `src/error.html`, not your `+error.svelte`. Where SvelteKit follows what, and when, is in [base — `loader`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#loader-required).

---

## Setup and packaging

### `$state is not defined`

**Symptoms:**
- `ReferenceError: $state is not defined`, `$derived is not defined`
- A syntax error pointing inside `@sveltekit-i18n/base`
- Everything works in the SvelteKit dev server but fails in a plain Vite build, a Vitest run, or a Node script
- A SvelteKit build whose client bundle succeeds and which then fails during SSR or prerendering, with the stack pointing inside `base`

**Cause:**

The core ships its rune modules **uncompiled**, for the consumer's bundler to compile. If those modules reach the runtime untouched, the runes are just undefined identifiers.

**Solution:**

In a SvelteKit application this is automatic — but only because `vite-plugin-svelte` finds the package through the application's own `package.json` and keeps it out of the server build's externals. An application that resolves the core some other way — absent from `dependencies`, linked by hand, reached through an alias — is externalized for the server build instead, and the runes survive into it. The client bundle still compiles, so nothing fails until the server code runs, at SSR or prerender time. Declaring the dependency normally is the fix; where that is not possible, name it in `ssr.noExternal`:

```javascript
// vite.config.js
export default defineConfig({
  plugins: [sveltekit()],
  ssr: {
    noExternal: ['@sveltekit-i18n/base'],
  },
});
```

In a bare Vite setup, add the Svelte plugin:

```javascript
// vite.config.js
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [svelte()],
});
```

In Vitest, add the plugin **and** stop the core from being externalized — an externalized dependency never reaches the plugin:

```javascript
// vitest.config.js
import { svelte } from '@sveltejs/vite-plugin-svelte';
import { defineConfig } from 'vitest/config';

export default defineConfig({
  plugins: [svelte()],
  test: {
    server: {
      deps: {
        inline: ['@sveltekit-i18n/base'],
      },
    },
  },
});
```

Running the package under plain `node` with no bundler in the way will not work for the same reason.

---

### Two copies of the core

**Symptoms:**
- The locale updates in one component and not in another
- `config.log` appears to have no effect, or diagnostics are duplicated
- An instance built in one module is invisible to a component that imports another
- `npm ls @sveltekit-i18n/base` lists it more than once, or at a version you did not choose

**Cause:**

`@sveltekit-i18n/base` or `@sveltekit-i18n/parser-curly` installed **alongside** `sveltekit-i18n`. Two copies of the core mean two reactive graphs: reads in one never see writes in the other.

**Solution:**

```bash
npm uninstall @sveltekit-i18n/base @sveltekit-i18n/parser-curly
```

One install is the whole install:

```bash
npm install sveltekit-i18n
```

Every name the core publishes is re-exported here, and with it the parser's build-time half — its types, `extractParamsFactory` and `cst` — so there is never a reason to add them. Base's `Config` and `Parser` namespaces arrive under the names [`BaseConfig` and `BaseParser`](./README.md#exported-types), because `Config` and `Parser` already name this package's own types.

---

### `ERR_REQUIRE_ESM`

**Symptoms:**
- `Error [ERR_REQUIRE_ESM]: require() of ES Module ... not supported`
- `SyntaxError: Cannot use import statement outside a module`

**Cause:**

The package is **ESM only** — there is no CJS entry, at either subpath.

**Solution:**

Import it, and make sure the importing project is ESM (`"type": "module"` in its `package.json`, or a `.mjs` file):

```javascript
// ❌
const { I18n } = require('sveltekit-i18n');

// ✅
import { I18n } from 'sveltekit-i18n';

// ✅ from a CommonJS file, if you must
const { I18n } = await import('sveltekit-i18n');
```

Node `>=22` and Svelte `>=5` are required; the Svelte peer dependency is not optional, since the instance is runes-based.

---

## Common Issues

### Translations Not Loading

**Symptoms:**
- Translation keys appear instead of values
- `i18n.initialized` stays `false`, or `i18n.loading` stays `true` because a loader never settles
- `i18n.translations` is empty

**Possible Causes & Solutions:**

#### 1. Nothing ever started a load

An instance loads when you tell it to: `config.initLocale`, `loadTranslations()`, `setLocale()` or `setRoute()`. With [`sveltekit-i18n/kit`](./README.md#sveltekit), the root layout's `load` does it — check that both `+layout.server.js` and `+layout.js` export it, and that `+layout.svelte` calls `use(() => data)`.

**Problem:**

```javascript
// ❌ +layout.js
export const load = async ({ url }) => {
  // Nothing requests a locale or a route
  return {};
};
```

**Solution:**

```javascript
// ✅ +layout.js
import { i18n } from '$lib/i18n';

export const load = async ({ url }) => {
  await i18n.loadTranslations('en', url.pathname);

  return {};
};
```

#### 2. Loader function not returning data

**Problem:**

```javascript
// ❌ Loader doesn't return anything
{
  locale: 'en',
  namespace: 'common',
  loader: async () => {
    await import('./en/common.json');  // Missing .default and return
  },
}
```

**Solution:**

```javascript
// ✅ Return the translation data
{
  locale: 'en',
  namespace: 'common',
  loader: async () => (await import('./en/common.json')).default,
}
```

A loader that returns nothing has still answered: it counts as loaded, with no keys, and does not run again until its freshness window ends or `invalidate()` covers it.

#### 3. Import path is wrong

```javascript
// ❌ Wrong path
loader: async () => (await import('./translations/en.json')).default
// File is actually at ./en/common.json
```

- Check the path relative to the file the config lives in
- Use an alias if that is clearer: `import('$lib/translations/en/common.json')`

#### 4. JSON syntax error

```json
// ❌ Invalid JSON (trailing comma)
{
  "greeting": "Hello",
}
```

```json
// ✅ Valid JSON
{
  "greeting": "Hello"
}
```

#### 5. A loader threw, and nobody noticed

A loader that throws is caught and reported **individually**, so one broken loader does not fail the batch — and the failure is only visible in the log. It records nothing, so the next trigger runs it again. Raise the level to see it:

```javascript
const config = {
  log: { level: 'debug' },
};
```

Anything that throws after the loaders — a custom `preprocess`, a malformed payload — rejects the promise the load method returned, so `await` surfaces it. A discarded result reports through the logger instead and never becomes an unhandled rejection.

---

### Translation Keys Displayed Instead of Values

**Symptoms:**
- You see `"home.title"` instead of `"Welcome"`
- The translations look correct in the JSON files

`t()` returns [`config.fallbackValue`](./README.md#fallbackvalue) for a key that resolves nowhere, and that defaults to the key itself — so this is the shape every miss takes.

**Possible Causes & Solutions:**

#### 1. Wrong translation key

```svelte
<!-- ❌ Key doesn't exist -->
<h1>{i18n.t('home.titel')}</h1>
```

```json
{
  "home.title": "Welcome"
}
```

Check the spelling, then inspect what is actually loaded:

```svelte
<pre>{JSON.stringify(i18n.translations, null, 2)}</pre>
```

A [`schema`](./README.md#typing-keys-and-payloads-with-schema) turns this class of typo into a compile error.

#### 2. Namespace not included in key

The loader's `namespace` is the prefix every key in that file sits under.

```javascript
{
  locale: 'en',
  namespace: 'home',  // ← Namespace
  loader: async () => (await import('./en/home.json')).default,
}
```

```json
// en/home.json
{
  "title": "Welcome"
}
```

```svelte
<!-- ❌ Missing namespace -->
<h1>{i18n.t('title')}</h1>

<!-- ✅ Include namespace -->
<h1>{i18n.t('home.title')}</h1>
```

#### 3. Translation not loaded for the current route

```javascript
// home translations only load on '/'
{
  locale: 'en',
  namespace: 'home',
  routes: ['/'],
  loader: async () => (await import('./en/home.json')).default,
}
```

```svelte
<!-- Trying to use it on /about -->
<h1>{i18n.t('home.title')}</h1>
```

- Remove `routes` to load on every page, or
- Add the route to the list, or
- Move the key into a namespace that always loads (`common`), or
- Load the namespace where it is needed with `await i18n.loadNamespace('home')`, whatever its `routes` say

#### 4. Preprocessing

A lookup is a single own-property read of the locale's table, not a walk down a path. With `preprocess: 'none'` — or a custom function that does not flatten — only the **top level** resolves, and for loaded data that top level is the loader's `namespace`:

```javascript
const config = {
  preprocess: 'none',
};
```

```svelte
<!-- ❌ nothing flattened this key -->
<h1>{i18n.t('home.title')}</h1>

<!-- ❌ resolves, but the message is a whole namespace: the parser renders it as JSON text -->
<h1>{i18n.t('home')}</h1>

<!-- ✅ read the table directly when you keep the nested structure -->
<h1>{i18n.translations[i18n.locale]?.home?.title}</h1>
```

Use the default `'full'` unless you have a reason not to — `t()` resolves a key by a single lookup, so a nested structure is for reading `translations` yourself, not for `t()`. A custom `preprocess` can still end in dot notation by calling [`toDotNotation()`](./README.md#todotnotationinput-preservearrays) itself.

#### 5. The key is named after an `Object.prototype` member

Keys are read as **own** properties, so `toString`, `constructor` and `__proto__` are treated as missing rather than resolving to something inherited. Rename the key.

---

### Translations Flash/Change After Page Load

**Symptoms:**
- Translation keys are briefly visible before the correct text appears
- Content "pops" or changes after the page loads

**Cause:**

The load runs in the browser after the first render instead of before it.

#### 1. Load in `+layout.js`, not in `onMount`

**❌ Wrong (client-side only):**

```svelte
<!-- +layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import { i18n } from '$lib/i18n';

  onMount(() => i18n.loadTranslations('en', '/'));  // Runs after the first render
</script>
```

**✅ Correct (server and client):**

```javascript
// +layout.js
import { i18n } from '$lib/i18n';

export const load = async ({ url }) => {
  await i18n.loadTranslations('en', url.pathname);

  return {};
};
```

A `load` function that awaits the load blocks the render until translations are in place. [`sveltekit-i18n/kit`](./README.md#sveltekit) does that in the root layout, and hands the server's state to the client so the client does not fetch it again. Wired by hand, the pair is [`snapshot({ records: true })`](./README.md#snapshotoptions) and [`hydrate()`](./README.md#hydrateenvelope) — `addTranslations()` only seeds, so the loaders run again in the browser.

#### 2. Gate the render where a client-side load is unavoidable

```svelte
<script>
  import { i18n } from '$lib/i18n';

  const { initialized } = $derived(i18n);
</script>

{#if initialized}
  <h1>{i18n.t('home.title')}</h1>
{:else}
  <div class="skeleton">Loading…</div>
{/if}
```

`initialized` is `true` once a locale and a route are set and translations are present; `loading` is `true` while any load is in flight.

---

### Route-Based Loading Not Working

**Symptoms:**
- Translations always load, whatever the route
- Or they never load, even on a matching route

**Possible Causes & Solutions:**

#### 1. Routes array is empty

```javascript
{
  locale: 'en',
  namespace: 'home',
  routes: [],  // ❌ Matches nothing
  loader: async () => (await import('./en/home.json')).default,
}
```

```javascript
routes: ['/']  // ✅ Specify routes, or omit the property for all routes
```

(An empty list is right for a namespace loaded only on demand, with `loadNamespace()`.)

#### 2. Regex not matching

```javascript
routes: [/^products/]  // ❌ Matches neither '/products' nor '/products/123'
```

```javascript
routes: [/^\/products/]  // ✅ Note the \/ at the start
```

Test it:

```javascript
const pattern = /^\/products/;

pattern.test('/products');      // true
pattern.test('/products/123');  // true
pattern.test('/about');         // false
```

#### 3. Pathname includes a locale prefix

```javascript
// URL: /en/products
routes: ['/products']  // ❌ Doesn't match '/en/products'
```

```javascript
// Option 1: include the locale in the pattern
routes: ['/en/products', '/cs/products']

// Option 2: match it with a regex
routes: [/^\/[a-z]{2}\/products/]

// Option 3: strip it before passing the route in (manual wiring only)
const pathname = url.pathname.replace(/^\/[a-z]{2}/, '');

await i18n.loadTranslations(locale, pathname);
```

With [`sveltekit-i18n/kit`](./README.md#sveltekit), the wiring hands the instance `url.pathname` as it is, so use option 1 or 2.

#### 4. The app is served under a base path

```javascript
// svelte.config.js: kit.paths.base is '/repo'
// URL: /repo/about
routes: ['/about']  // ❌ Doesn't match '/repo/about'
```

Set [`basePath`](./README.md#basepath) to the same value: every route handed in loses it on the way in, so `routes` keep naming the app's own paths.

```javascript
import { PUBLIC_BASE_PATH } from '$env/static/public';

export const config = {
  basePath: PUBLIC_BASE_PATH,
  loaders: [/* ... */],
};
```

The `/kit` wiring warns once, on the server, when a prefix it cannot account for stands in front of the route SvelteKit matched.

#### 5. Expecting the route to re-run a loader

A loader runs **once per freshness window and route params**. Its record is kept per loader, so each loader of a namespace runs on its own routes — but a loader that has delivered does not run again for another route that yields the same params. So `route` is context for the loader, not a cache key:

```javascript
import { PUBLIC_API_ORIGIN } from '$env/static/public';

// ❌ One loader that tries to serve every route: it runs on the first one only
{
  locale: 'en',
  namespace: 'page',
  loader: async ({ route }) => (await fetch(`${PUBLIC_API_ORIGIN}/api/page?route=${route}`)).json(),
}

// ✅ Capture what the data depends on as a route param: it runs again when it changes
{
  locale: 'en',
  namespace: 'page',
  routes: [/^\/(?<slug>[^/]*)$/],
  loader: async ({ params }) => (await fetch(`${PUBLIC_API_ORIGIN}/api/page?slug=${params.slug}`)).json(),
}

// ✅ Or one loader per route group
{ locale: 'en', namespace: 'home', routes: ['/'], loader: /* ... */ },
{ locale: 'en', namespace: 'products', routes: [/^\/products/], loader: /* ... */ },
```

Only a named capture group in a `RegExp` yields params; a string route and a custom matcher yield none. Conversely, a named group you only use for grouping makes the loader run again whenever it changes — turn it into `(?:...)`.

#### 6. A source that caches on its own

A loader backed by a remote `query` or an SWR layer should run on every trigger and leave freshness to its source. Give it `cache: false`:

```javascript
{ locale: 'en', namespace: 'editor', cache: false, loader: ({ locale, namespace }) => messages({ locale, namespace }) }
```

---

### Locale Not Changing

**Symptoms:**
- `setLocale('cs')` leaves the page in English
- `i18n.locale` reads as the old value right after you assigned a new one

**Possible Causes & Solutions:**

#### 1. Nothing to load for that locale

`setLocale()` for a locale with no loaders, no `translations` entry and no `fallbackLocale` match resolves without changing anything.

```javascript
const config = {
  loaders: [
    { locale: 'en', namespace: 'common', loader: async () => (await import('./en/common.json')).default },
    // ✅ add the other locales
    { locale: 'cs', namespace: 'common', loader: async () => (await import('./cs/common.json')).default },
  ],
};
```

`i18n.locales` lists every locale the instance knows — if the one you are switching to is missing there, this is your cause.

#### 2. Reading `locale` immediately after assigning it

`locale` reports the **active** locale, the one whose translations are loaded. Assigning it is a fire-and-forget `setLocale()`, so it advances when the load resolves:

```javascript
// ❌ still the old locale here
i18n.locale = 'cs';
console.log(i18n.locale);

// ✅ await the switch
await i18n.setLocale('cs');
console.log(i18n.locale);
```

In a template no await is needed — the read is reactive and re-renders when the locale advances. And when two switches race, the last request wins: a superseded load never overwrites a newer one.

#### 3. The value never reaches the instance

A destructured `locale` is a snapshot — see [A destructured `locale` or `loading` never updates](#a-destructured-locale-or-loading-never-updates).

#### 4. Using `l` where you meant `t`

```svelte
<!-- ❌ Always English, by definition -->
<h1>{i18n.l('en', 'home.title')}</h1>

<!-- ✅ Follows the active locale -->
<h1>{i18n.t('home.title')}</h1>
```

#### 5. Spelling versus normalization

By default locales are normalized through `Intl`, so `en-us`, `EN-US` and `en-US` are all `'en-US'` — the value `locale` reports and the key the tables use. Comparing a raw string from a URL or a cookie against it will not match. Normalize it the same way:

```javascript
import { sanitizeLocales } from 'sveltekit-i18n/utils';

const [locale] = sanitizeLocales(page.params.lang); // 'en-us' -> 'en-US'

if (locale && locale !== i18n.locale) await i18n.setLocale(locale);
```

An instance configured with a custom [`config.sanitizeLocales`](./README.md#sanitizelocales) keys its locales its own way, so run your value through that same transform instead.

#### 6. A loader rejected the switch

A loader's `redirect()` or `error()` below 500 rejects the load, and the locale does not advance — see [A loader's `redirect()` or `error()` rejects the load](#a-loaders-redirect-or-error-rejects-the-load). Await `setLocale()` to see the rejection; assigning `locale` only logs it.

#### 7. The locale is in the URL

With `/kit` and `preferredLocale: (event) => event.params.lang`, the URL is the server's answer. A client `setLocale()` stands until the answer changes, so the tab and the URL can disagree until the next navigation to another locale's URL. Switch locales by linking to the other locale's URL instead.

---

### Translations Never Refresh

**Symptoms:**
- A CMS or API change never shows up, however long the tab stays open
- The loader runs once and never again

**Cause:**

`config.cache` defaults to `Number.POSITIVE_INFINITY` — loaded translations never expire, because translation files normally ship with the application. Nothing refetches in the background at any setting.

**Solution:**

For event-driven content, keep the default and invalidate when you know something changed:

```javascript
// A webhook told us the English content changed:
i18n.invalidate('en');

// Or only one namespace, in every locale:
i18n.invalidate(undefined, 'content');

// Nothing happens until the next load trigger:
await i18n.loadTranslations('en', location.pathname);
```

For content that ages on a schedule, give it a window:

```javascript
const config = {
  cache: 3600000,  // 1 hour; the NEXT load trigger after it elapses refetches
};
```

Neither expiry nor `invalidate()` removes what is displayed or starts a load by itself: they drop the bookkeeping that would otherwise skip the loaders, and once the refetch lands, each loader's fresh data replaces what it delivered before, so a key its source dropped goes (seeded data, a plain `hydrate()`'s included, stays). A loader already in flight for what was invalidated is severed — its data is discarded while the rest of its load lands, and an activating trigger still in flight fetches it again before it activates.

**The loader answers from a cache of its own.** A loader backed by a remote `query`, an SWR layer or an HTTP cache can hand back the same stale table after `invalidate()`, which the core then stamps fresh. Give it `cache: false`: it then runs on every trigger that selects it, and refreshing its source (`query.refresh()`) is what brings new data.

---

### A Visitor Sees Another Visitor's Language

**Symptoms:**
- A page renders in a language the visitor did not ask for, usually under load
- Two browsers in two locales disagree with each other, or agree when they should not
- The bug is invisible in `dev` and appears in production

**Cause:**

A module is evaluated **once per process** on the server, not once per request. A module-level instance is therefore shared by every request being rendered concurrently: they overwrite each other's `locale` and translation tables.

**Solution:**

Export the config rather than an instance, and let [`sveltekit-i18n/kit`](./README.md#sveltekit) build **one instance per request** on the server and one per tab in the browser:

```javascript
// src/lib/i18n.js
import { defineI18n } from 'sveltekit-i18n/kit';

export const config = { loaders: [/* ... */] };

export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
```

`hooks.server.js` exports `handle`, both root layout files export `load`, the root `+layout.svelte` calls `use(() => data)`, and components read the instance with `get()` instead of importing it. The same wiring by hand is in [Server-Side Rendering](./README.md#server-side-rendering).

**A singleton is fine** when the server renders nothing visitor-specific — a client-only application (`export const ssr = false`), or one that renders a single locale and has no loader throwing a `redirect()` or an `error()` that depends on the visitor. An instance with a shorter life than the application should be released with [`destroy()`](./README.md#destroy).

**A shared cache can do the same.** A negotiated page varies by `Accept-Language` and by whatever `preferredLocale` reads, and `/kit` sets no `Vary` header. A CDN caching it with `cache-control: public` serves one visitor's language to the next: add `Vary: Accept-Language, Cookie`, or cache only pages whose locale is in the URL.

---

### The Error Page Is Blank

**Symptoms:**
- An unknown URL renders nothing at all — not even an untranslated `+error.svelte`
- The browser console shows `TypeError: Cannot read properties of null (reading 'translations')`
- Pages that exist are fine; only the error path is empty
- On a statically hosted site this is every URL that was not prerendered

**Cause:**

When SvelteKit renders the error page **without a server `load`** — on a static host, for every unknown URL — the universal `+layout.js` receives `data` as `null`. A hand-written recipe that reaches straight into it — `data.i18n`, `data.locale` — throws there, and because it throws in the layout's `load`, it throws *above* the error boundary: `+error.svelte` never gets to render.

**Solution:**

[`sveltekit-i18n/kit`](./README.md#sveltekit) handles a `null` `data`: its universal `load` negotiates on its own — from `preferredLocale`, then `navigator.languages` in the browser, then `initLocale`, `fallbackLocale` and the first locale the config serves — and `+error.svelte` reads the instance with `get()` like any page.

Wired by hand, read the server payload optionally and fall back for the locale:

```javascript
// src/routes/+layout.js
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

Give the error page's messages a loader scoped to the routes that can fail, or put them in `config.translations` so they are always present.

An application that carries the locale in the path can do better than the fallback: the prefix is still in `url.pathname` even when nothing matched, and `event.params` is empty — so with `/kit`, read it in `preferredLocale` from `event.url.pathname` rather than from `event.params`.

On a static host configured with `fallback` (`adapter-static`), the file the server returns for an unknown URL is an **empty shell** — the error page is rendered on the client, after hydration. That is expected for a 404 and costs nothing but a frame; it does mean the error page has no server-rendered markup for crawlers or for visitors without JavaScript.

**A loader's `error()` in the root layout** renders SvelteKit's static `src/error.html`, not your `+error.svelte` — see [A loader's `redirect()` or `error()` rejects the load](#a-loaders-redirect-or-error-rejects-the-load).

---

### Parser Complaints Go Nowhere

**Symptoms:**
- A placeholder renders its fallback, or an empty string, and nothing is logged
- A modifier name you misspelled behaves as if the modifier simply did nothing
- `config.log` is at `debug` and still says nothing about the message

**Cause:**

Parser diagnostics are a separate channel from the core's logger, and they are **silent by default**: `parserOptions.onReport` defaults to `null`. A report never raises — the placeholder takes its fallback and the rest of the message resolves — so a silent channel means a silent failure.

**Solution:**

```javascript
const config = {
  parserOptions: {
    onReport: (report) => console.warn(report.message, report),
  },
};
```

A `Report` carries a `code` (`unknown-modifier`, `failed-modifier`, `missing-options`, `unserializable-value`, `missing-locale`, `output-limit`, `read-limit`, `nesting-limit`), an `origin` saying who fixes it (`message`, `payload` or `limit`), a self-contained English `message`, the `id` of the message — the translation key the core passed — and a `text` excerpt of the placeholder. See [`parserOptions.onReport`](./README.md#parseroptionsonreport).

Common findings once the channel is open:

- `unknown-modifier` — a modifier name nobody registered. It is never run as `eq`.
- `failed-modifier` — the value cannot be read the way the modifier needs it (text under `number`, a `Date` object under `number` or `ago`, a `currency` placeholder with no currency code).
- `missing-locale` — a formatting modifier or a plural selection with no locale; it resolves to the empty string.

---

### TypeScript Errors

#### `'parser' does not exist in type 'Config'`

```typescript
import type { Config } from 'sveltekit-i18n';

const config: Config = {
  initLocale: 'en',
  parser: myParser,  // ❌ TS2353: 'parser' does not exist in type 'Config'
};
```

**Cause:** this package **is** the parser wiring — the config it takes is the core's minus `parser`. Parser configuration goes under `parserOptions`:

```typescript
const config: Config = {
  initLocale: 'en',
  parserOptions: {
    modifierDefaults: { number: { maximumFractionDigits: 2 } },
    customModifiers: { upper: ({ value }) => value.toUpperCase() },
  },
};
```

An application that wants a different message format builds on `@sveltekit-i18n/base` directly and supplies `config.parser` there.

#### A payload typo is not caught

```typescript
i18n.t('common.welcome', { aplicationName: 'My app' });  // compiles; the placeholder falls back at runtime
```

**Cause:** with no payload type stated, the payload is an open record and any key passes. Annotating the config variable does not change that — the payload reaches `t` through the constructor's **type arguments**:

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

type Payload = { applicationName: string };

const config: Config<Payload> = { loaders: [/* ... */] };

// ❌ config typed, payload not
export const i18n = new I18n(config);

// ✅ both
export const i18n = new I18n<Config<Payload>, Payload>(config);

i18n.t('common.welcome', { aplicationName: 'My app' });  // Error: typo caught
```

A second type argument types the props a custom modifier takes: `Config<Payload, Props>` and `new I18n<Config<Payload, Props>, Payload, Props>(config)`.

With a schema registered in `SvelteKitI18n.Register`, the registry types that instance instead: `Config<Payload>` leaves the schema slot `any`, which reads the registry, and `schema: {}` in the value changes nothing while the type argument decides. Replace the slot in the type argument — the [opt-out](./README.md#one-payload-type-for-every-message).

For per-key payloads use [`config.schema`](./README.md#typing-keys-and-payloads-with-schema) instead.

#### The `schema` is ignored — every key is accepted

```typescript
// ❌ not a closed set, so the schema types nothing and keys stay plain `string`
export const i18n = new I18n({ ...config, schema: {} as Record<string, object> });
```

**Cause:** a schema whose keys are not a closed set — an index signature, or no keys at all — would reject every key or demand a payload for keys it knows nothing about, so keys degrade to plain `string` and calls type as if no schema were supplied. Since the slot is stated, a registered schema stays out too: this is how `schema: {}` opts an instance out of the registry — where the constructor infers the config's type; a config type passed as a type argument decides on its own. Spell the keys out — registered once for the app, in a global script (no top-level import or export):

```typescript
// src/i18n-schema.d.ts
interface TranslationSchema {
  'common.greeting': { name: string };
  'common.about': never;              // takes no payload
  'home.title': { title?: string };   // payload optional
}

declare namespace SvelteKitI18n {
  interface Register {
    schema: TranslationSchema;
  }
}
```

```typescript
export const i18n = new I18n(config); // typed by TranslationSchema
```

— or per instance, where a stated closed schema wins over the registry: `new I18n({ ...config, schema: {} as TranslationSchema })`. Only the **type** is read, so the slot holds an empty value. The schema is read off the config the **constructor** receives — or `defineI18n()`, with `/kit` — so `loadConfig()` cannot retype an existing instance. To generate it from your translations instead of spelling it out, use [`@sveltekit-i18n/typegen`](./README.md#generating-the-schema-with-typegen).

#### `TranslationSchema` is not defined, or every key is a plain `string`

With [`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen), the schema exists only once the plugin has run: `src/i18n-schema.d.ts` does not exist until the first `vite dev` or `vite build`, so a type check before any Vite run — a fresh clone, or CI running only `svelte-kit sync && svelte-check` — sees no schema: keys are plain strings, and a config that casts to `TranslationSchema` fails on the missing name. Run `vite build` first. While the plugin holds its empty placeholder, keys stay plain strings. Check that:

- the plugin is in `vite.config.js`'s `plugins`, with `config` naming the module that exports the config (as `config`, unless `configExport` says otherwise);
- the output sits under `src/`, where SvelteKit's generated `tsconfig.json` picks it up;
- a JavaScript file carries `// @ts-check` (or the project sets `checkJs`) — without it, `tsc` reports nothing;
- the plugin's own diagnostics in the Vite output (`loader-threw`, `config-unreadable`, …) — a failed generation keeps the previous schema.

Without a cast, the instance is typed through the `SvelteKitI18n.Register` registry, so also check that:

- the generated file ends in a `declare namespace SvelteKitI18n { interface Register { … } }` block — a typegen prerelease before 3.0.0-next.3 writes only `TranslationSchema`: update it;
- `sveltekit-i18n` is 3.1 or newer — an older core ignores the registration without a diagnostic;
- the config states no `schema`: `schema: {}`, or any schema without a closed key set, opts the instance out;
- no extension typed by a fixed return type sits in `config.extensions` — it erases the schema, registered or stated (see [below](#an-extension-erased-the-schema-or-the-locales)).

#### Locale completion disappeared

`i18n.locale` typed as plain `string`, no autocompletion in `setLocale()`:

```typescript
// ❌ the annotation, not the literal, is what the constructor sees
const config: Config = { initLocale: 'en', translations: { cs: {} } };

const i18n = new I18n(config);
i18n.locale;  // string | undefined
```

```typescript
// ✅ a literal reaching the constructor keeps its locales
const i18n = new I18n({ initLocale: 'en', translations: { cs: {} } });

i18n.locale;  // 'en' | 'cs' | (string & {}) | undefined
```

Pass the config inline, or `as const` / `as const satisfies Config`. Note that **one dynamic source degrades the whole union** — a config building its loaders from a runtime array completes nothing, even where it also names a literal. The union is always open (`'en' | 'cs' | (string & {})`), so an unlisted locale from a URL or an `Accept-Language` header still compiles.

#### An extension erased the schema or the locales

```typescript
// ❌ a fixed input and output type is what the pipe folds on, so what the
// config narrowed — the schema keys, the locale union — is gone from the result
const withGreeting: Extension.T = (i18n) => Object.assign(i18n, {
  greet: (name: string) => i18n.t('common.greeting', { name }),
});
```

Declare the dependency on the input as an `Extension.Operator` — making the function generic does not help, since reading a generic signature instantiates its type parameters at their constraints:

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

#### Cannot find module `$lib/i18n`

Check the alias in `svelte.config.js`:

```javascript
import { vitePreprocess } from '@sveltejs/vite-plugin-svelte';

export default {
  preprocess: vitePreprocess(),
  kit: {
    alias: {
      $lib: 'src/lib',  // ✅ Ensure this is set
    },
  },
};
```

---

### Tests That Mock the Translations Module

**Symptoms:**
- `readable is not a function`, or a mock that no longer typechecks
- A mocked `t` renders `undefined` in the component under test
- State leaking between test cases

**Cause:**

v2's advice was to replace the module with store stubs. There are no stores to stub in v3, and a real instance with inline translations is cheap and synchronous — the only thing worth mocking is where a component finds it.

**Problem:**

```javascript
// ❌ v2 — neither typechecks nor runs in v3
vi.mock('$lib/i18n', () => ({ t: readable((key) => key) }));
```

**Solution:**

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

`config.translations` is applied during construction and no loader matches, so the locale is active before the constructor returns — nothing to await. A component that takes the instance as a prop gets it directly. One that reads it with `get()` from your `$lib/i18n` finds it where `use()` put it, which a test renders without — mock your module's `get` to return the real instance:

```javascript
vi.mock('$lib/i18n', async () => {
  const { I18n } = await import('sveltekit-i18n');
  const i18n = new I18n({
    initLocale: 'en',
    translations: { en: { 'common.greeting': 'Hello, {{name}}!' } },
  });

  return { get: () => i18n };
});
```

Where a stub is genuinely wanted, `t` is a plain function on a plain object:

```javascript
const i18n = { t: (key) => key, locale: 'en' };
```

Building per test is the point: a per-test instance carries no state from the previous case, so there is no reset-between-cases dance. Where a test does need a load, await the method that started it rather than a timer:

```javascript
await i18n.loadTranslations('cs', '/about');
```

If the run fails with `$state is not defined`, the test runner is missing the Svelte plugin — see [`$state is not defined`](#state-is-not-defined).

---

### Performance Issues

#### Slow initial page load

**Causes:**
1. Loading everything at once
2. Large translation files
3. No route-based loading

**1. Scope the loaders with `routes`:**

```javascript
// ❌ Before: everything loads always
{ locale: 'en', namespace: 'everything', loader: async () => (await import('./en/everything.json')).default }

// ✅ After: split by route
{ locale: 'en', namespace: 'common', loader: async () => (await import('./en/common.json')).default },
{ locale: 'en', namespace: 'home', routes: ['/'], loader: async () => (await import('./en/home.json')).default },
{ locale: 'en', namespace: 'products', routes: [/^\/products/], loader: async () => (await import('./en/products.json')).default },
```

**2. Split large files:**

```
// ❌ Before
en/
  all.json (500 KB)

// ✅ After
en/
  common.json (5 KB)
  home.json (20 KB)
  products.json (30 KB)
  admin.json (50 KB)
```

**3. Use `fallbackLocale` deliberately.** It loads the fallback locale's translations alongside the active one, which roughly doubles what a page fetches.

**4. Measure:**

```javascript
{
  locale: 'en',
  namespace: 'common',
  loader: async () => {
    const start = performance.now();
    const data = (await import('./en/common.json')).default;

    console.log(`Loaded in ${performance.now() - start}ms`);

    return data;
  },
}
```

**5. Hydrate instead of refetching.** [`sveltekit-i18n/kit`](./README.md#sveltekit) — or `snapshot({ records: true })` on the server with `hydrate()` on the client — keeps the browser from fetching what the server already had. `addTranslations()` only seeds: the loaders behind that data run again.

#### Growing memory on the server

A per-request instance is garbage once the request is done. What keeps one alive is a reference held somewhere else — a module-level cache, a long-lived context. Call [`destroy()`](./README.md#destroy) when an instance with a shorter life than the process goes out of scope; it detaches the instance from its loading lifecycle, and reads keep working, so a component tearing down renders instead of breaking.

---

## Debugging Tips

### 1. Inspect loaded translations

```svelte
<script>
  import { i18n } from '$lib/i18n';
</script>

<details>
  <summary>Debug: loaded translations</summary>
  <pre>{JSON.stringify(i18n.translations, null, 2)}</pre>
</details>

<p>Current locale: {i18n.locale}</p>
```

`rawTranslations` holds the same data **before** preprocessing — comparing the two tells you whether a key problem is a loading problem or a flattening problem.

### 2. Check loading state

```svelte
<script>
  import { i18n } from '$lib/i18n';

  const { loading, initialized, locales } = $derived(i18n);
</script>

<p>Loading: {loading}</p>
<p>Initialized: {initialized}</p>
<p>Known locales: {locales.join(', ')}</p>
```

### 3. Enable debug logging

```javascript
const config = {
  log: {
    level: 'debug',          // 'error' | 'warn' (default) | 'debug'
    prefix: '[MyApp i18n]: ',
  },
};
```

This is the **core's** channel: loads, skipped loaders, collisions, locale problems. Parser diagnostics are separate — see [Parser Complaints Go Nowhere](#parser-complaints-go-nowhere).

### 4. Open the parser's report channel

```javascript
const config = {
  parserOptions: {
    onReport: (report) => console.warn(`[${report.code}] ${report.message}`, report),
  },
};
```

### 5. Test a loader directly

```javascript
const loader = async () => (await import('$lib/translations/en/common.json')).default;

console.log(await loader());
```

### 6. Verify route matching

```javascript
// In +layout.js
export const load = async ({ url }) => {
  console.log('Current pathname:', url.pathname);

  await i18n.loadTranslations('en', url.pathname);

  return {};
};
```

### 7. Watch a value change

Inside a component, where effects run:

```svelte
<script>
  import { i18n } from '$lib/i18n';

  $effect(() => {
    console.log('locale ->', i18n.locale, 'loading ->', i18n.loading);
  });
</script>
```

---

## Frequently Asked Questions

### Can I use this library without SvelteKit?

Yes, in any Svelte 5 application — the package imports nothing from `$app`, and the instance is plain runes. What is SvelteKit-shaped is the *wiring*: `sveltekit-i18n/kit` reads SvelteKit's events and serves its hooks and layouts, and outside SvelteKit you build the instance yourself. Outside Svelte it is not usable: runes need Svelte's compiler, and your bundler has to compile the core's rune modules (see [`$state is not defined`](#state-is-not-defined)).

### Do I need to install `@sveltekit-i18n/base` or a parser?

No — and you should not. `npm install sveltekit-i18n` is the whole install: every name the core publishes is re-exported here, and with it the parser's build-time half. See [Two copies of the core](#two-copies-of-the-core).

### Where did `@sveltekit-i18n/parser-default` go?

v3 replaces it with [`@sveltekit-i18n/parser-curly`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly), the [Curly Message Format](https://curlymessage.dev)'s adapter, and wires it in for you. Remove `parser-default` from your dependencies and move its options to [`config.parserOptions`](./README.md#parser-options); per-call formatting options are now keyed by modifier name (`{ number: { maximumFractionDigits: 1 } }`).

That is the answer for `sveltekit-i18n`. If you built on `@sveltekit-i18n/base` directly, nothing is wired in for you: keep base, install `parser-curly` (or [`parser-icu`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu), [`parser-mf2`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-mf2) or [`parser-i18next`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-i18next)) in `parser-default`'s place and pass it as `config.parser`.

### How do I get `$t` back?

Add [`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores) to `config.extensions` — see [`$t` is not a store](#t-is-not-a-store).

### Can I use HTML in translations?

Translations render as text. For markup, use `@html`:

```svelte
<p>{@html i18n.t('content.with.html')}</p>
```

**⚠️ Security warning:** only with trusted content. Never with anything a user supplied.

### How do I handle plurals?

With `plural`, which selects by the category the locale's plural rules put the count in, and `ordinal` for positions:

```json
{
  "items": "You have {{count}} {{count:plural; one:item; other:items;}}.",
  "inbox": "{{count:plural; 0:No messages; one:{{count}} message; other:{{count}} messages;}}",
  "files": "{{count:number}} {{count:plural; one:soubor; few:soubory; many:souboru; other:souborů;}}",
  "place": "{{n}}{{n:ordinal; one:st; two:nd; few:rd; other:th;}}"
}
```

```javascript
i18n.t('items', { count: 1 });   // → "You have 1 item."
i18n.t('items', { count: 5 });   // → "You have 5 items."
i18n.t('inbox', { count: 0 });   // → "No messages"
i18n.t('files', { count: 3 });   // → "3 soubory" (in cs)
i18n.t('place', { n: 22 });      // → "22nd"
```

The categories are CLDR's (`zero`, `one`, `two`, `few`, `many`, `other`), and each locale uses its own subset. A numeric key matches the value exactly and wins over a category, as `0:` does above. No option catches the categories a placeholder does not write, as ICU's `other` does: those take the fallback, so a message writes every category its locale uses (the Czech one above writes `many` for fractions). The full rules are in the [parser's README](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly#plural-selection). For choices that are not about grammatical number, the comparisons remain: `{{count:gt; 0:In stock; default:Out of stock;}}`.

### Can I change the parser?

Not in this package: wiring `parser-curly` is what it is for, and `config` has no `parser` slot. An application that wants another message format installs `@sveltekit-i18n/base` and the parser of its choice and passes `config.parser` there. Mixing both in one application means two cores — don't.

### Can I reconfigure an instance?

Yes: `await i18n.loadConfig(config)` takes the same parser-less config and keeps the parser across the call. Three caveats: the config **replaces** the old one, so `parserOptions` a call does not restate revert to their defaults and the instance silently loses your `customModifiers`, `modifierDefaults` and `onReport`; `config.extensions` is a construction-time directive and is ignored; and `config.schema` types the instance the **constructor** produced, so a reconfiguration cannot retype it.

### How do I handle right-to-left (RTL) languages?

With [`sveltekit-i18n/kit`](./README.md#sveltekit), put `dir="%dir%"` on the `<html>` tag of `app.html`: `handle` fills it on the server and `use()` keeps `document.documentElement.dir` in step with the locale. For an element of its own, take the direction from [`textDirection`](./README.md#textdirectionlocale):

```svelte
<script>
  import { textDirection } from 'sveltekit-i18n/utils';
</script>

<div dir={textDirection(i18n.locale)}>
  <p>{i18n.t('content')}</p>
</div>
```

It reads the locale's script, not a list of languages, so `ar`, `he`, `fa`, `ckb` and `az-Arab` are `'rtl'`.

### Can I nest translation calls?

`t()` returns a rendered string, not a key, so `i18n.t(i18n.t('dynamic.key'))` does not do what it looks like. Compute the key instead:

```javascript
const key = someCondition ? 'key1' : 'key2';

i18n.t(key);
```

Messages may nest **placeholders** inside an option's value, which covers most of what nesting is wanted for:

```json
{
  "notification": "You have {{count:gt; 0:{{count}} new {{count; 1:message; default:messages;}}!; default:no messages.;}}"
}
```

### How do I translate dynamic content?

With placeholders and a payload:

```json
{
  "welcome": "Welcome, {{name}}!",
  "error": "{{field}} is required."
}
```

```javascript
i18n.t('welcome', { name: userName });
i18n.t('error', { field: i18n.t('form.field.email') });
```

### Can I load translations from a database?

Yes — a loader is any async function, and it receives the load context:

```javascript
import { PUBLIC_API_ORIGIN } from '$env/static/public';

{
  locale: ['en', 'cs'],
  namespace: 'dynamic',
  loader: async ({ locale, namespace }) => (await fetch(`${PUBLIC_API_ORIGIN}/api/translations/${locale}/${namespace}`)).json(),
}
```

A loader receives `{ locale, namespace, route, params }`, and it runs on the server too, where `fetch` takes only an absolute URL (the core hands a loader no `fetch` of its own) — so build the URL from an origin, as `PUBLIC_API_ORIGIN` does here, or back the loader with a remote `query`. Remember that it runs **once per freshness window and route params**: pair it with [`cache`](./README.md#cache) or [`invalidate()`](./README.md#invalidatelocale-namespace), or give it `cache: false` when its source caches on its own — see [Translations Never Refresh](#translations-never-refresh).

### How do I handle missing translations during development?

Keep the default `fallbackValue` — the key itself — so misses are visible, and add `fallbackLocale` where a partially translated locale should borrow from a complete one:

```javascript
const config = {
  fallbackLocale: 'en',
};
```

In production, `fallbackValue: ''` hides the misses instead.

### How do I detect the visitor's language?

[`sveltekit-i18n/kit`](./README.md#sveltekit) negotiates it on every request: `preferredLocale(event)` first (a cookie, a route param, a profile in `locals`), then the `Accept-Language` header — `navigator.languages` in an app without a server `load` — then `initLocale` and `fallbackLocale`, each matched against the locales the config serves, and last the first of those locales:

```javascript
export const { handle, load, use, get } = defineI18n(config, {
  preferredLocale: (event) => event.cookies?.get('lang'),
});
```

Wiring it by hand, [`matchLocale`](./README.md#matchlocalerequested-available) does the matching, `en-GB` falling back to `en`:

```javascript
import { matchLocale } from 'sveltekit-i18n/utils';

const locales = ['en', 'cs'];

const locale = matchLocale(cookieLocale, locales)
  ?? matchLocale(request.headers.get('accept-language'), locales)
  ?? 'en';
```

### How do I translate meta tags (SEO)?

In the component, where the read stays reactive and the server already has the translations:

```svelte
<script>
  import { get } from '$lib/i18n';

  const i18n = get();
</script>

<svelte:head>
  <title>{i18n.t('page.title')}</title>
  <meta name="description" content={i18n.t('page.description')} />
</svelte:head>
```

From a `load` function, read it off the instance that function already has — there is no `t.get()` dual to reach for.

### Does this work with SvelteKit adapters?

Yes, all of them — `adapter-auto`, `adapter-node`, `adapter-static`, `adapter-vercel`, `adapter-netlify` and the rest. The one adapter-independent rule is the per-request instance on anything that renders on a server. An adapter that bundles the server for a platform resolving the `browser` condition gets the browser half of `/kit`, whose server branch throws — see [base — SvelteKit pitfalls](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#pitfalls).

### When do I have to call `destroy()`?

When an instance has a shorter life than the process that holds it: a per-request instance you cache somewhere, or a component-scoped one. A module-level singleton in a browser lives as long as the application and needs no call, and neither do the instances `/kit` builds. The method is idempotent.

---

## Known Limitations

### 1. No dots in namespaces

```javascript
// ❌ Won't work correctly (and is reported at config time)
{ namespace: 'pages.home' }

// ✅
{ namespace: 'pages_home' }
{ namespace: 'home' }
```

### 2. Translation keys are case-sensitive

```json
{
  "Greeting": "Hello"
}
```

```javascript
i18n.t('greeting');  // ❌ Won't find 'Greeting'
i18n.t('Greeting');  // ✅
```

### 3. Locale identifiers are normalized, not lowercased

By default `sanitizeLocales` resolves locales through `Intl`, so `'en-us'` becomes `'en-US'` — that is what `locale` reports and what keys the tables. Compare with [`sanitizeLocales()`](./README.md#sanitizelocaleslocales) rather than with `toLowerCase()`, or set `config.sanitizeLocales: false` to keep locales exactly as authored.

### 4. Locale detection needs the SvelteKit wiring

The instance itself never reads the URL, a cookie or a header. [`sveltekit-i18n/kit`](./README.md#sveltekit) does: it negotiates from `preferredLocale`, `Accept-Language`, `initLocale`, `fallbackLocale` and the first locale the config serves. An app that builds its instances by hand resolves the locale itself, with [`matchLocale()`](./README.md#matchlocalerequested-available).

### 5. `i18n instanceof I18n` is `false`

Documented, not fixed — see [above](#i18n-instanceof-i18n-is-false).

### 6. The schema generator is a separate package

`config.schema` is a slot, and `SvelteKitI18n.Register` a registry. This package ships no CLI and no bundler plugin to fill either: [`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen) is the Vite plugin that does, installed on its own. A namespace whose loader cannot run at build time — a remote `query`, `routes` that capture params — is typed open.

### 7. The hash router is not supported

Loader `routes` match `url.pathname`. Under SvelteKit's `router.type: 'hash'`, the route lives in `url.hash`, so a route-scoped loader never matches.

---

## Getting Help

### Before Asking for Help

1. **Check this guide** – most issues are covered here
2. **Search existing issues** – someone might have had the same problem
3. **Enable both channels** – `log: { level: 'debug' }` and `parserOptions.onReport`
4. **Create a minimal reproduction** – isolate the problem

### Where to Get Help

1. **[GitHub Issues](https://github.com/sveltekit-i18n/lib/issues)** – bug reports and feature requests, for the whole family (`base`, `lib`, `parsers`, `extensions`)
2. **[GitHub Discussions](https://github.com/sveltekit-i18n/lib/discussions)** – questions and community help
3. **[Examples](../examples)** – working code you can reference

### Creating a Good Issue

Include:
- **SvelteKit version** (`npm list @sveltejs/kit`) and **Svelte version** (`npm list svelte`)
- **sveltekit-i18n version** (`npm list sveltekit-i18n`), plus the output of `npm ls @sveltekit-i18n/base` if anything reactive misbehaves
- **Node version** (`node -v`)
- **Minimal reproduction** (StackBlitz, CodeSandbox, or a GitHub repo)
- **Expected behavior** vs **actual behavior**
- **Error messages** (full stack trace)
- **Configuration** (anonymized if needed)

**Example:**

```markdown
## Bug Report

### Environment
- SvelteKit: 2.20.0
- Svelte: 5.20.0
- sveltekit-i18n: 3.1.0
- Node: 22.14.0

### Issue
The locale switches, but one component keeps rendering the previous language

### Reproduction
https://stackblitz.com/edit/...

### Expected
Every component re-renders in the new locale

### Actual
The header does; the footer does not

### Configuration
... paste your config ...
```

---

## See Also

- [Getting Started](./GETTING_STARTED.md) – Setup tutorial
- [API Documentation](./README.md) – Complete API reference
- [Best Practices](./BEST_PRACTICES.md) – Recommended patterns
- [Architecture](./ARCHITECTURE.md) – How it works internally
- [base API documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md) – The core, in full
- [parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly) – The message format wired here
- [Examples](../examples) – Working code examples
