# Architecture Overview

This document explains how `sveltekit-i18n` works internally and how the three packages interact with each other. Understanding the architecture will help you make informed decisions about which package to use and how to configure it for your needs.

## Table of Contents

- [Package Overview](#package-overview)
- [Package Relationships](#package-relationships)
- [Data Flow](#data-flow)
- [Loading Strategy](#loading-strategy)
- [When to Use Each Package](#when-to-use-each-package)
- [Core Concepts](#core-concepts)

## Package Overview

The `sveltekit-i18n` ecosystem consists of three main packages:

### 1. @sveltekit-i18n/base

**Role:** Core i18n functionality

**Responsibilities:**
- Managing translation state (Svelte stores)
- Loading and caching translations
- Route matching logic
- Preprocessing translations
- Coordinating with parsers

**What it doesn't include:**
- Message interpolation (delegates to parsers)
- Default parser

**Use when:** You need custom parsers or maximum flexibility

### 2. sveltekit-i18n (lib)

**Role:** Complete solution with sensible defaults

**Responsibilities:**
- Everything from `@sveltekit-i18n/base`
- Pre-configured with `@sveltekit-i18n/parser-default`
- Simplified API

**Dependencies:** `@sveltekit-i18n/base` + `@sveltekit-i18n/parser-default` (no external dependencies)

**Use when:** You want the quickest setup and are happy with default parser syntax

### 3. @sveltekit-i18n/parsers

**Role:** Message interpolation

**Packages:**
- `@sveltekit-i18n/parser-default` – Simple placeholder/modifier syntax
- `@sveltekit-i18n/parser-icu` – ICU message format

**Responsibilities:**
- Interpolating variables into translation strings
- Formatting (numbers, dates, currencies)
- Conditional rendering (plurals, gender, etc.)

**Use when:** You need specific message syntax (included automatically with `sveltekit-i18n` or `@sveltekit-i18n/base`)

## Package Relationships

Here's how the packages relate to each other:

```
┌─────────────────────────────────────────────────────────────┐
│                      Your SvelteKit App                     │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  Option 1: Use Complete Solution                            │
│  ┌──────────────────────────────────────────────┐           │
│  │         sveltekit-i18n (lib)                 │           │
│  │  ┌────────────────────────────────────────┐  │           │
│  │  │   @sveltekit-i18n/base                 │  │           │
│  │  │   (core functionality)                 │  │           │
│  │  └────────────────────────────────────────┘  │           │
│  │  ┌────────────────────────────────────────┐  │           │
│  │  │   @sveltekit-i18n/parser-default       │  │           │
│  │  │   (included)                           │  │           │
│  │  └────────────────────────────────────────┘  │           │
│  └──────────────────────────────────────────────┘           │
│                                                             │
│  Option 2: Use Base with Custom Parser                      │
│  ┌──────────────────────────────────────────────┐           │
│  │   @sveltekit-i18n/base                       │           │
│  │   (you provide the parser)                   │           │
│  └──────────────────────────────────────────────┘           │
│  ┌──────────────────────────────────────────────┐           │
│  │   @sveltekit-i18n/parser-icu                 │           │
│  │   or your custom parser                      │           │
│  └──────────────────────────────────────────────┘           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Dependency Tree

```
sveltekit-i18n
├── @sveltekit-i18n/base
└── @sveltekit-i18n/parser-default

@sveltekit-i18n/base
└── (no dependencies)

@sveltekit-i18n/parser-default
└── (no dependencies)

@sveltekit-i18n/parser-icu
└── intl-messageformat
```

## Data Flow

Here's how translations flow through the system:

### 1. Configuration Phase

```javascript
import i18n from 'sveltekit-i18n';

const config = {
  loaders: [
    {
      locale: 'en',
      key: 'common',
      routes: ['/'],
      loader: async () => (await import('./en/common.json')).default,
    },
  ],
};

const { t, locale, loadTranslations } = new i18n(config);
```

**What happens:**
1. i18n instance is created
2. Loaders are registered (not executed yet)
3. Svelte stores are initialized
4. Parser is configured

### 2. Loading Phase

```javascript
// In +layout.js
await loadTranslations('en', '/');
```

**Flow:**

```
┌─────────────────────────────────────────────────────┐
│ 1. loadTranslations('en', '/')                      │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. Match loaders                                    │
│    - locale === 'en'                                │
│    - routes includes '/' OR routes is undefined     │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Execute loader functions                         │
│    loader() → returns translation data              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Preprocess translations                          │
│    - 'full': flatten to dot notation                │
│    - 'preserveArrays': flatten but keep arrays      │
│    - 'none': no changes                             │
│    - custom function: your logic                    │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. Store in translations store                      │
│    { en: { 'common.greeting': 'Hello' } }           │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 6. Set locale                                       │
│    locale.set('en')                                 │
└─────────────────────────────────────────────────────┘
```

**Caching:** Each loader runs only once per locale. Results are cached in memory.

### 3. Translation Phase

```svelte
<p>{$t('common.greeting', { name: 'Alice' })}</p>
```

**Flow:**

```
┌─────────────────────────────────────────────────────┐
│ 1. $t('common.greeting', { name: 'Alice' })         │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. Get current locale                               │
│    locale.get() → 'en'                              │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 3. Lookup translation                               │
│    translations['en']['common.greeting']            │
│    → 'Hello, {{name}}!'                             │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 4. Parser.parse()                                   │
│    parse('Hello, {{name}}!', [{ name: 'Alice' }])   │
│    → 'Hello, Alice!'                                │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 5. Return result                                    │
│    'Hello, Alice!'                                  │
└─────────────────────────────────────────────────────┘
```

### 4. Locale Switch

```javascript
locale.set('cs');
```

**Flow:**

```
┌─────────────────────────────────────────────────────┐
│ 1. locale.set('cs')                                 │
└────────────────┬────────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────────┐
│ 2. Check if translations exist                      │
│    translations['cs'] ?                             │
└────────────────┬────────────────────────────────────┘
                 │
         ┌───────┴────────┐
         │                │
         ▼                ▼
    ┌─────────┐    ┌──────────┐
    │ Exists  │    │ Missing  │
    └────┬────┘    └────┬─────┘
         │              │
         │              ▼
         │    ┌─────────────────────┐
         │    │ Load translations   │
         │    │ (matching loaders)  │
         │    └────┬────────────────┘
         │         │
         └─────────┴────────┐
                            ▼
            ┌───────────────────────────┐
            │ 3. Update locale store    │
            │    triggers reactivity    │
            └───────────┬───────────────┘
                        │
                        ▼
            ┌───────────────────────────┐
            │ 4. All $t() re-evaluate   │
            │    UI updates             │
            └───────────────────────────┘
```

## Loading Strategy

### Route-based Loading

The library uses SvelteKit's routing to determine which translations to load:

```javascript
const config = {
  loaders: [
    // No routes specified → loads on every page
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    
    // Exact match → loads only on '/'
    {
      locale: 'en',
      key: 'home',
      routes: ['/'],
      loader: async () => (await import('./en/home.json')).default,
    },
    
    // Regex → loads on matching routes
    {
      locale: 'en',
      key: 'products',
      routes: [/^\/products/],
      loader: async () => (await import('./en/products.json')).default,
    },
  ],
};
```

**Matching algorithm:**

```javascript
function shouldLoadTranslation(loader, currentRoute) {
  // No routes specified → always load
  if (!loader.routes || loader.routes.length === 0) {
    return true;
  }
  
  // Check each route pattern
  for (const route of loader.routes) {
    if (typeof route === 'string') {
      // Exact string match
      if (currentRoute === route) return true;
    } else if (route instanceof RegExp) {
      // Regex match
      if (route.test(currentRoute)) return true;
    }
  }
  
  return false;
}
```

### Server vs Client Loading

**Server-Side (SSR):**
- Translations load during `+layout.js` or `+page.js` load
- Data is serialized and sent to client
- Hydration picks up from there

**Client-Side:**
- When locale changes, new translations load on client
- When navigating, route-specific translations load
- Loading state available via `$loading` store

### Caching Strategy

**In-Memory Cache:**
```javascript
{
  'en': {
    'common': { /* translations */ },
    'home': { /* translations */ },
  },
  'cs': {
    'common': { /* translations */ },
  },
}
```

**Cache Refresh:**
- Client: Never refreshes (single session)
- Server: Configurable via `cache` option (default: 24 hours)

```javascript
const config = {
  cache: 86400000, // 24 hours in milliseconds
  // or: Number.POSITIVE_INFINITY (never refresh)
};
```

## When to Use Each Package

### Use `sveltekit-i18n` (lib)

```javascript
import i18n from 'sveltekit-i18n';
```

**When:**
- ✅ You want the quickest setup
- ✅ Default parser syntax is sufficient
- ✅ You don't need custom parsers
- ✅ You want zero dependencies

**Best for:** Most projects, rapid prototyping, simple to medium complexity

### Use `@sveltekit-i18n/base`

```javascript
import i18n from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-icu';
```

**When:**
- ✅ You need ICU message format
- ✅ You want to create a custom parser
- ✅ You're migrating from another i18n library
- ✅ You need specific message syntax

**Best for:** Complex projects, enterprise applications, specific requirements

## Core Concepts

### Svelte Stores

The library uses Svelte stores for reactivity:

```javascript
// Readable stores (read-only)
$t           // Translation function
$locales     // Available locales
$loading     // Loading state
$initialized // Initialization state

// Writable stores (can be updated)
$locale      // Current locale
```

**Reactivity:** When stores update, all components using them re-render automatically.

### Preprocessing

Transforms nested objects into flat dot notation:

**Input:**
```json
{
  "user": {
    "profile": {
      "name": "Name",
      "email": "Email"
    }
  }
}
```

**Output (preprocess: 'full'):**
```json
{
  "user.profile.name": "Name",
  "user.profile.email": "Email"
}
```

**Why?** Enables efficient lookups and simpler translation keys in code.

### Parser Interface

All parsers implement this interface:

```typescript
interface Parser {
  parse(
    value: any,        // Translation value
    params: any[],     // Parameters from $t()
    locale: string,    // Current locale
    key: string        // Translation key
  ): string;
}
```

**Example implementation:**

```javascript
const simpleParser = () => ({
  parse: (value, params) => {
    const vars = params[0] || {};
    return String(value).replace(
      /\{(\w+)\}/g,
      (_, key) => vars[key] ?? key
    );
  },
});
```

### Namespaces

Namespaces organize translations into logical groups:

```
common    → Shared UI, navigation, errors
home      → Homepage content
products  → Product-related text
checkout  → Checkout flow
```

**Benefits:**
- Easier to manage
- Enables lazy loading
- Better code organization
- Multiple teams can work independently

## Performance Considerations

### Bundle Size

**sveltekit-i18n:**
- Core: ~5KB (minified)
- Includes: base + parser-default
- No external dependencies

**@sveltekit-i18n/base + parser-icu:**
- Base: ~5KB (zero dependencies)
- Parser-ICU: ~15KB + intl-messageformat dependency

### Loading Performance

**Best practices:**
1. Use route-based loading (don't load everything at once)
2. Keep common translations small
3. Use code splitting (dynamic imports)
4. Enable server-side caching

### Runtime Performance

- Translation lookup: O(1) (object property access)
- Parser execution: Varies by complexity
- Store updates: Svelte's efficient reactivity

## Summary

The `sveltekit-i18n` architecture is designed to be:

- **Modular** – Use only what you need
- **Flexible** – Customize with parsers and config
- **Performant** – Lazy loading and efficient caching
- **TypeScript** – Complete type definitions
- **Developer-friendly** – Simple API, clear concepts

Choose the right package for your needs and leverage the loading strategies to build efficient, multilingual SvelteKit applications.

## See Also

- [Getting Started](./GETTING_STARTED.md) – Learn by building
- [API Documentation](./README.md) – Complete reference
- [Best Practices](./BEST_PRACTICES.md) – Recommended patterns
- [Parsers](https://github.com/sveltekit-i18n/parsers) – Parser details

