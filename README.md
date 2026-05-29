[![npm version](https://badge.fury.io/js/sveltekit-i18n.svg)](https://badge.fury.io/js/sveltekit-i18n) ![](https://github.com/sveltekit-i18n/lib/workflows/Tests/badge.svg)

> [!NOTE]
> Looking for maintainers. Feel free to contact me if you want to take over the maintanance of this project.
> 
> https://github.com/sveltekit-i18n/lib/issues/197


# sveltekit-i18n

A lightweight, powerful internationalization (i18n) library designed specifically for [SvelteKit](https://github.com/sveltejs/kit). This package combines [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base) with [@sveltekit-i18n/parser-default](https://github.com/sveltekit-i18n/parsers/tree/master/parser-default) to provide the quickest way to add multilingual support to your SvelteKit applications.

## Why sveltekit-i18n?

- 🚀 **SvelteKit-optimized** – Built specifically for SvelteKit with full SSR support
- 📦 **Minimal dependencies** – Only ecosystem packages (base + parser-default)
- ⚡ **Smart loading** – Translations load only for visited pages (lazy loading)
- 🎯 **Route-based** – Automatic translation loading based on your routes
- 🔧 **Flexible** – Support for custom data sources (local files, APIs, databases)
- 🌐 **Multiple parsers** – Choose the syntax that fits your needs
- 📝 **TypeScript** – Complete type definitions and typed API
- 🎨 **Component-scoped** – Create multiple translation instances for different parts of your app

## Installation

```bash
npm install sveltekit-i18n
```

## Quick Start

### 1. Create your translation files

```json
// src/lib/translations/en/common.json
{
  "greeting": "Hello, {{name}}!",
  "nav.home": "Home",
  "nav.about": "About"
}
```

```json
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
import i18n from 'sveltekit-i18n';

/** @type {import('sveltekit-i18n').Config} */
const config = {
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

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
```

### 3. Load translations in your layout

```javascript
// src/routes/+layout.js
import { loadTranslations } from '$lib/translations';

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ url }) => {
  const { pathname } = url;
  
  const initLocale = 'en'; // determine from cookie, user preference, etc.
  
  await loadTranslations(initLocale, pathname);
  
  return {};
};
```

### 4. Use translations in your components

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { t } from '$lib/translations';
</script>

<h1>{$t('common.greeting', { name: 'World' })}</h1>

<nav>
  <a href="/">{$t('common.nav.home')}</a>
  <a href="/about">{$t('common.nav.about')}</a>
</nav>
```

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
  import { t } from '$lib/translations';
</script>

<p>{$t('welcome', { name: 'Alice' })}</p>
<p>{$t('items', { count: 5 })}</p>
```

## Documentation

**📖 [Complete Documentation Index](./docs/INDEX.md)** – Find everything in one place

### Quick Links

- 🚀 [Getting Started Guide](./docs/GETTING_STARTED.md) – 15-minute tutorial
- 🏗️ [Architecture Overview](./docs/ARCHITECTURE.md) – How everything works
- 📚 [API Documentation](./docs/README.md) – Complete reference
- ✨ [Best Practices](./docs/BEST_PRACTICES.md) – Production-ready patterns
- 🔧 [Troubleshooting](./docs/TROUBLESHOOTING.md) – Common issues & FAQ

## Examples

Explore working examples for different use cases:

- [Multi-page app](./examples/multi-page) – Most common setup
- [Locale-based routing](./examples/locale-router) – SEO-friendly URLs (e.g., `/en/about`)
- [Component-scoped translations](./examples/component-scoped-ssr) – Isolated translation contexts
- [Custom parsers](./examples/parser-icu) – Using ICU message format
- [All examples](./examples) – Complete list of examples

## Advanced Usage

### Need a different parser?

This library uses `@sveltekit-i18n/parser-default`. If you need ICU message format or want to create your own parser, use [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base) directly:

```javascript
import i18n from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';

const config = {
  parser: parser(),
  // ... rest of config
};
```

Learn more about [parsers](https://github.com/sveltekit-i18n/parsers).

## TypeScript Support

Full TypeScript support with complete type definitions for configuration and API:

```typescript
import i18n, { type Config } from 'sveltekit-i18n';

const config: Config = {
  loaders: [
    // ... your loaders
  ],
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
```

**Note:** The library provides type definitions but does not automatically infer translation keys from your JSON files. You can create custom type-safe wrappers if needed (see [Best Practices](./docs/BEST_PRACTICES.md#typescript-patterns)).

## Contributing

We welcome contributions! Please read our [Contributing Guide](./CONTRIBUTING.md) for details on:

- Development setup and workflow
- Git workflow (rebase-based, linear history)
- Commit guidelines (atomic commits)
- Pull request process
- Code standards and testing

**Note:** We're currently looking for maintainers. If you're interested in helping maintain this project, please reach out via [this issue](https://github.com/sveltekit-i18n/lib/issues/197).

## Changelog

See [Releases](https://github.com/sveltekit-i18n/lib/releases) for version history.

## Related Packages

- [@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base) – Core functionality with custom parser support
- [@sveltekit-i18n/parser-default](https://github.com/sveltekit-i18n/parsers/tree/master/parser-default) – Default message parser
- [@sveltekit-i18n/parser-icu](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu) – ICU message format parser

## License

MIT
