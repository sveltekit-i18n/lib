[![npm version](https://badge.fury.io/js/sveltekit-i18n.svg)](https://badge.fury.io/js/sveltekit-i18n) [![Tests](https://github.com/sveltekit-i18n/lib/actions/workflows/tests.yml/badge.svg)](https://github.com/sveltekit-i18n/lib/actions/workflows/tests.yml)

# sveltekit-i18n

A lightweight, powerful internationalization (i18n) library designed specifically for [SvelteKit](https://github.com/sveltejs/kit). This package combines [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base) with [@sveltekit-i18n/parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly) to provide the quickest way to add multilingual support to your SvelteKit applications.

## Why sveltekit-i18n?

- 🚀 **SvelteKit-optimized** – Built specifically for SvelteKit, with per-request instances on the server
- 📦 **One install** – The core and the parser come with it; nothing else to add
- ⚡ **Smart loading** – Translations load only for visited pages (lazy loading)
- 🎯 **Route-based** – Automatic translation loading based on your routes
- 🔧 **Flexible** – Support for custom data sources (local files, APIs, databases)
- 🧩 **Extensible** – Add surfaces (Svelte stores, for instance) through the extensions pipe
- 📝 **TypeScript** – Complete type definitions, with a `schema` slot that types keys and payloads
- 🎨 **Component-scoped** – Create multiple translation instances for different parts of your app

## Requirements

Svelte 5 or newer, and one of Node 22+, Bun 1.2+ or Deno 2+. The package is
ESM-only and imports no `node:` module, so every runtime that runs your
SvelteKit build runs it.

## Installation

```bash
npm install sveltekit-i18n
# bun add sveltekit-i18n
# deno add npm:sveltekit-i18n
```

That is the whole install. `@sveltekit-i18n/base` and
`@sveltekit-i18n/parser-curly` come with it: the core's whole API, the parser's
types and its build-time `extractParamsFactory` and `cst` are re-exported here
— **do not install them alongside**, or your app ends up with two copies of the
core and two reactive graphs.

## Quick Start

### 1. Create your translation files

```jsonc
// src/lib/translations/en/common.json
{
  "greeting": "Hello, {{name}}!",
  "nav.home": "Home",
  "nav.about": "About"
}
```

```jsonc
// src/lib/translations/cs/common.json
{
  "greeting": "Ahoj, {{name}}!",
  "nav.home": "Domů",
  "nav.about": "O nás"
}
```

### 2. Setup i18n configuration

```javascript
// src/lib/translations/index.js
import { I18n } from 'sveltekit-i18n';

/** @type {import('sveltekit-i18n').Config} */
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

> [!IMPORTANT]
> That instance is a module-level singleton. On the server it is shared by
> every request in the process, so it fits a client-only app
> (`export const ssr = false`) or one that renders a single locale. Anything
> that server-renders per visitor needs the per-request wiring in
> [Server-side rendering](#server-side-rendering).

Export the instance, not its parts: `locale`, `locales`, `loading`,
`initialized` and `translations` are reactive properties, and a destructured
value is a one-time snapshot. `t` and `l` are functions and stay reactive even
when destructured, because their tracked reads happen at call time.

### 3. Load translations in your layout

```javascript
// src/routes/+layout.js
import { i18n } from '$lib/translations';

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ url }) => {
  const { pathname } = url;

  const initLocale = 'en'; // determine from cookie, user preference, etc.

  await i18n.loadTranslations(initLocale, pathname);

  return {};
};
```

`loadTranslations` returns the promise of the matching load, so awaiting it is
all the coordination you need — concurrent triggers for the same locale and
route join the load already in flight instead of fetching twice.

### 4. Use translations in your components

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { i18n } from '$lib/translations';
</script>

<h1>{i18n.t('common.greeting', { name: 'World' })}</h1>

<nav>
  <a href="/">{i18n.t('common.nav.home')}</a>
  <a href="/about">{i18n.t('common.nav.about')}</a>
</nav>
```

The call reads the reactive translation table and locale, so the text updates
when either changes. If you prefer the `$t` store form, add
[`@sveltekit-i18n/extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores)
to `config.extensions`.

## The instance

Everything lives on one reactive instance:

| Member | What it is |
| --- | --- |
| `t(key, ...params)` | translates for the active locale |
| `l(locale, key, ...params)` | translates for a locale the call names |
| `locale` | the active locale; assigning it is a fire-and-forget `setLocale()` |
| `locales` | the locales the config knows |
| `loading` | `true` while any load is in flight |
| `initialized` | `true` once a locale and a route are set and translations are present |
| `translations` / `rawTranslations` | the tables, after and before preprocessing |
| `loadTranslations`, `setLocale`, `setRoute` | return the promise of the matching load |
| `loadConfig` | returns the promise of the config load |
| `addTranslations`, `invalidate`, `snapshot`, `destroy` | synchronous |

Reading a property is reactive wherever reads are tracked — a component
template, `$derived`, `$effect`. The full reference is in
[the API documentation](./docs/README.md).

## Key Features

### Route-based Loading

Load translations only for specific routes to optimize performance:

```javascript
const config = {
  loaders: [
    {
      locale: 'en',
      key: 'home',
      routes: ['/'], // Load only on homepage
      loader: async () => (await import('./en/home.json')).default,
    },
    {
      locale: 'en',
      key: 'about',
      routes: ['/about'], // Load only on about page
      loader: async () => (await import('./en/about.json')).default,
    },
  ],
};
```

### Placeholders and Modifiers

Use dynamic values in your translations:

```json
{
  "welcome": "Welcome, {{name}}!",
  "items": "You have {{count:number;}} {{count; 1:item; default:items;}}."
}
```

```svelte
<script>
  import { i18n } from '$lib/translations';
</script>

<p>{i18n.t('welcome', { name: 'Alice' })}</p>
<p>{i18n.t('items', { count: 5 })}</p>
```

The syntax is the [Curly Message Format](https://curlymessage.dev).
Its parser options — custom modifiers, modifier defaults, a report channel and
how payload values are read — go under `config.parserOptions`:

```javascript
const config = {
  parserOptions: {
    modifierDefaults: { number: { maximumFractionDigits: 2 } },
    onReport: (report) => console.warn(report.message, report),
  },
  loaders: [/* … */],
};
```

Reports are silent by default; `onReport` is where you route them.

### Server-side rendering

Build one instance **per request** on the server — a module-level instance is
shared between concurrent requests, which leaks one visitor's locale into
another's page. Export the config, and let each request build from it:

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

The client hydrates by handing that payload back through
`config.translations`, so the loaders behind it do not run a second time. The
full wiring — including the browser-side instance and passing it down through
Svelte context — is in the
[Getting Started guide](./docs/GETTING_STARTED.md).

## Documentation

**🌐 [sveltekit-i18n.github.io](https://sveltekit-i18n.github.io)** – The documentation site, with a live playground

**📖 [Complete Documentation Index](./docs/INDEX.md)** – Find everything in one place

### Quick Links

- 🚀 [Getting Started Guide](./docs/GETTING_STARTED.md) – 15-minute tutorial
- 🏗️ [Architecture Overview](./docs/ARCHITECTURE.md) – How everything works
- 📚 [API Documentation](./docs/README.md) – Complete reference
- ✨ [Best Practices](./docs/BEST_PRACTICES.md) – Production-ready patterns
- 🔧 [Troubleshooting](./docs/TROUBLESHOOTING.md) – Common issues & FAQ

## Examples

Each example is a standalone SvelteKit application covering a decision that is
application-shaped — an adapter, a `svelte.config.js`, a route tree:

- [Multi-page app](./examples/multi-page) – the common setup: cookie and `Accept-Language`, route-scoped loading
- [Locale-based routing](./examples/locale-router) – SEO-friendly URLs (e.g. `/en/about`), prerendered
- [Default locale without a prefix](./examples/locale-router-advanced) – `/about` and `/cs/about`, static, translated 404
- [Component-scoped translations](./examples/component-scoped-ssr) – a component with its own lexicon
- [Markdown routes](./examples/mdsvex) – `t()` inside `.svx`
- [All examples](./examples) – complete list

Everything that is really three lines of configuration — message formats,
`preprocess`, `loaders`, `fallbackLocale` — is on the
[playground](https://sveltekit-i18n.github.io/playground) instead, where a real
instance answers as you change it.

## Advanced Usage

### Need a different parser?

This package wires `@sveltekit-i18n/parser-curly` and fills the core's `parser`
slot itself, so a different message format means building on
[@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base) directly:

```javascript
import { I18n } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';

const config = {
  parser: parser({ onReport: null }),
  // ... rest of config
};
```

That is the one case where installing the core directly is right — you are then
not using this package at all. The same goes for
[`parser-mf2`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-mf2)
(Unicode MessageFormat 2) and
[`parser-i18next`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-i18next)
(the i18next syntax). Learn more about
[parsers](https://github.com/sveltekit-i18n/parsers).

### Extensions

`config.extensions` pipes the constructed instance through adapter functions,
left to right, and `new I18n(config)` evaluates to the last one's output. That
is how the store surface ships:

```javascript
import { I18n } from 'sveltekit-i18n';
import stores from '@sveltekit-i18n/extension-stores';

export const { t, locale, loading } = new I18n({ ...config, extensions: [stores] });
```

## TypeScript Support

Full TypeScript support with complete type definitions for configuration and API:

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

const config: Config = {
  loaders: [
    // ... your loaders
  ],
};

export const i18n = new I18n(config);
```

Annotating the config (`const config: Config = …`) widens it, which costs the
locale completion a config literal would have given `setLocale` and `l`. Pass
the literal straight to the constructor where you want that.

To have payloads checked, give the config a `schema` — keys autocomplete and a
wrong payload is a type error:

```typescript
import { I18n } from 'sveltekit-i18n';

const i18n = new I18n({
  ...config,
  schema: {} as { 'common.greeting': { name: string } },
});

i18n.t('common.greeting', { name: 'Alice' }); // ok
i18n.t('common.greting', { name: 'Alice' });  // Error: not a key of the schema
i18n.t('common.greeting', {});                // Error: `name` is required
```

Only the schema's **type** is read, so the slot may hold an empty value. A
single payload type for every message is stated through the type arguments
instead:

```typescript
import { I18n, type Config } from 'sveltekit-i18n';

type Payload = { name: string };

const config: Config<Payload> = { /* … */ };

export const i18n = new I18n<Config<Payload>, Payload>(config);
```

**Note:** The library provides the type slots but does not generate them from your JSON files. A generator that fills `schema` from your translations is planned for 3.1 ([#234](https://github.com/sveltekit-i18n/lib/issues/234)); until then, write the schema by hand or generate it yourself with the re-exported [`extractParamsFactory`](./docs/README.md#extractparamsfactory), which reports what each message expects of its payload (see [Best Practices](./docs/BEST_PRACTICES.md#typescript-patterns)).

## Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Development setup and workflow
- Git workflow (rebase-based, linear history)
- Commit guidelines (atomic commits)
- Pull request process
- Code standards and testing

## Changelog

See [Releases](https://github.com/sveltekit-i18n/lib/releases) for version history.

## Related Packages

- [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base) – Core functionality with custom parser support
- [@sveltekit-i18n/parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly) – Curly Message Format parser (included here)
- [@sveltekit-i18n/parser-icu](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu) – ICU message format parser
- [@sveltekit-i18n/parser-mf2](https://github.com/sveltekit-i18n/parsers/tree/master/parser-mf2) – Unicode MessageFormat 2 parser
- [@sveltekit-i18n/parser-i18next](https://github.com/sveltekit-i18n/parsers/tree/master/parser-i18next) – i18next syntax parser
- [@sveltekit-i18n/extension-stores](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores) – Svelte store surface for the instance

## Sponsor

You can support the maintenance of this package through
[GitHub Sponsors](https://github.com/sponsors/sveltekit-i18n).

## License

MIT
