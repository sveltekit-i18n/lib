# Best Practices

This guide covers recommended patterns, conventions, and tips for using `sveltekit-i18n` effectively in production applications.

## Table of Contents

- [Translation File Organization](#translation-file-organization)
- [Key Naming Conventions](#key-naming-conventions)
- [Performance Optimization](#performance-optimization)
- [TypeScript Patterns](#typescript-patterns)
- [SSR and CSR Considerations](#ssr-and-csr-considerations)
- [Component-Scoped Translations](#component-scoped-translations)
- [Dynamic Routes and Locales](#dynamic-routes-and-locales)
- [Content Management](#content-management)
- [Testing](#testing)
- [Production Deployment](#production-deployment)

## Translation File Organization

### Directory Structure

Organize translations by locale and namespace:

```
src/lib/translations/
├── index.js              # i18n configuration
├── en/
│   ├── common.json       # Shared UI, navigation
│   ├── home.json         # Homepage
│   ├── about.json        # About page
│   ├── products.json     # Product pages
│   └── errors.json       # Error messages
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

#### Common Namespace

Keep frequently used translations in a `common` namespace loaded on every page:

```json
// common.json
{
  "app.name": "My App",
  "nav.home": "Home",
  "nav.about": "About",
  "nav.products": "Products",
  "button.save": "Save",
  "button.cancel": "Cancel",
  "button.delete": "Delete",
  "error.required": "This field is required",
  "error.invalid": "Invalid input"
}
```

**Keep it small** – Only essentials that appear across multiple pages.

#### Page-Specific Namespaces

Create separate namespaces for each major page or section:

```javascript
const config = {
  loaders: [
    // Common (all pages)
    { locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default },
    
    // Page-specific (route-based)
    { locale: 'en', key: 'home', routes: ['/'], loader: async () => (await import('./en/home.json')).default },
    { locale: 'en', key: 'about', routes: ['/about'], loader: async () => (await import('./en/about.json')).default },
    { locale: 'en', key: 'products', routes: [/^\/products/], loader: async () => (await import('./en/products.json')).default },
  ],
};
```

**✅ Benefits:**
- Translations load only when needed
- Smaller initial bundle
- Easier to manage

#### Feature-Based Organization

For large apps, organize by feature instead of page:

```
translations/
├── en/
│   ├── common.json
│   ├── auth.json         # Login, register, password reset
│   ├── checkout.json     # Cart, payment, confirmation
│   ├── profile.json      # User profile, settings
│   └── admin.json        # Admin panel
```

```javascript
const config = {
  loaders: [
    { locale: 'en', key: 'auth', routes: ['/login', '/register', '/reset-password'], loader: async () => (await import('./en/auth.json')).default },
    { locale: 'en', key: 'checkout', routes: [/^\/cart/, /^\/checkout/], loader: async () => (await import('./en/checkout.json')).default },
  ],
};
```

### File Size Guidelines

**Target sizes:**
- `common.json`: < 5 KB (essential shared content)
- Page-specific: < 20 KB per file
- If larger, consider splitting into sub-namespaces

**Example split:**

```
products/
├── list.json      # Product listing page
├── detail.json    # Product detail page
├── compare.json   # Product comparison
└── reviews.json   # Product reviews
```

## Key Naming Conventions

### Use Dot Notation

Organize keys hierarchically with dots:

```json
{
  "user.profile.name": "Name",
  "user.profile.email": "Email",
  "user.settings.privacy": "Privacy",
  "user.settings.notifications": "Notifications"
}
```

**✅ Clear structure, easy to find related translations**

### Descriptive Names

Use clear, descriptive key names:

```json
// ❌ Bad
{
  "t1": "Welcome",
  "btn": "Click",
  "txt": "Hello"
}

// ✅ Good
{
  "home.welcome.title": "Welcome",
  "common.button.submit": "Submit",
  "greeting.message": "Hello"
}
```

### Consistency Patterns

Establish naming patterns and stick to them:

```json
{
  // Pages
  "home.title": "Home",
  "about.title": "About",
  "contact.title": "Contact",
  
  // Forms
  "form.label.name": "Name",
  "form.label.email": "Email",
  "form.placeholder.search": "Search...",
  "form.error.required": "Required",
  
  // Buttons
  "button.submit": "Submit",
  "button.cancel": "Cancel",
  "button.save": "Save",
  
  // Messages
  "message.success.saved": "Successfully saved",
  "message.error.failed": "Operation failed"
}
```

### Avoid Deep Nesting

**❌ Too deep (harder to maintain):**

```json
{
  "pages.user.profile.settings.privacy.options.visibility.public": "Public"
}
```

**✅ Better (balanced):**

```json
{
  "profile.privacy.public": "Public"
}
```

**Rule of thumb:** Max 3-4 levels deep

### Context in Keys

Include context when the same word has different meanings:

```json
{
  "common.button.close": "Close",           // Button text
  "common.adjective.close": "Near",         // Adjective
  "store.status.open": "Open",              // Store is open
  "action.open": "Open file",               // Action to open
  "navigation.home": "Home",                // Nav link
  "address.home": "Home address"            // Address type
}
```

## Performance Optimization

### Lazy Loading

Load translations only when needed using route-based loaders:

```javascript
const config = {
  loaders: [
    // Always load
    { locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default },
    
    // Load on specific routes
    { locale: 'en', key: 'admin', routes: [/^\/admin/], loader: async () => (await import('./en/admin.json')).default },
  ],
};
```

**✅ Impact:**
- Reduces initial bundle size
- Faster page loads
- Better performance metrics

### Preload Critical Routes

Preload translations for likely next pages:

```svelte
<script>
  import { goto } from '$app/navigation';
  import { loadTranslations, locale } from '$lib/translations';
  
  async function navigateToProducts() {
    // Preload translations before navigation
    await loadTranslations($locale, '/products');
    await goto('/products');
  }
</script>

<button on:click={navigateToProducts}>
  View Products
</button>
```

### Cache Configuration

Set appropriate cache duration for your use case:

```javascript
// Production: Long cache (good performance)
const config = {
  cache: 86400000,  // 24 hours
};

// With CMS: Short cache (content updates frequently)
const config = {
  cache: 300000,    // 5 minutes
};

// Static content: Infinite cache
const config = {
  cache: Number.POSITIVE_INFINITY,
};
```

### Bundle Splitting

Use dynamic imports for large translation files:

```javascript
// ❌ Static import (always in bundle)
import translations from './large-translations.json';

// ✅ Dynamic import (lazy loaded)
loader: async () => (await import('./large-translations.json')).default
```

### Avoid Fallback Locale (If Possible)

`fallbackLocale` doubles translation loading:

```javascript
// ❌ Loads both 'cs' and 'en' translations
const config = {
  fallbackLocale: 'en',
};

// ✅ Complete all translations (no fallback needed)
// Only loads current locale
```

Use fallback only during development or partial translations.

## TypeScript Patterns

### Type-Safe Configuration

```typescript
import i18n, { type Config } from 'sveltekit-i18n';

const config: Config = {
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
  ],
};
```

### Translation Key Types (Custom Pattern)

The library doesn't automatically infer types from translation files. If you need type-safe translation keys, you can manually define them:

```typescript
// translations.d.ts
export interface TranslationKeys {
  'common.greeting': { name: string };
  'common.items': { count: number };
  'home.title': never;  // No params
}

// translations.ts
import type { TranslationKeys } from './translations.d';

export const { t } = new i18n(config);

// You'll need to create a typed wrapper for strict checking:
// export function typedT<K extends keyof TranslationKeys>(
//   key: K,
//   ...params: TranslationKeys[K] extends never ? [] : [TranslationKeys[K]]
// ): string {
//   return t.get(key, ...(params as any));
// }
```

**Note:** This requires manual maintenance. Consider generating types from your translation files using tools like `typesafe-i18n` if you need automatic type inference.

### Typed Helpers

Create typed helper functions:

```typescript
import { t } from '$lib/translations';

export function formatPrice(amount: number, currency: string = 'USD'): string {
  return t.get('common.price', { amount }, { currency });
}

export function pluralize(count: number, singular: string, plural: string): string {
  return count === 1 ? singular : plural;
}
```

### Module Augmentation

Extend types for better IDE support:

```typescript
// app.d.ts
declare module '$lib/translations' {
  export const t: import('svelte/store').Readable<
    (key: string, vars?: Record<string, any>, props?: any) => string
  > & {
    get: (key: string, vars?: Record<string, any>, props?: any) => string;
  };
  
  export const locale: import('svelte/store').Writable<string> & {
    get: () => string;
  };
  
  // ... other exports
}
```

## SSR and CSR Considerations

### Load in Layout

Always load translations in `+layout.js` for SSR:

```javascript
// src/routes/+layout.js
import { loadTranslations } from '$lib/translations';

export const load = async ({ url }) => {
  const { pathname } = url;
  const initLocale = 'en';  // Determine from cookie, header, etc.
  
  await loadTranslations(initLocale, pathname);
  
  return {};
};
```

**✅ Benefits:**
- Translations ready on server
- No flash of untranslated content (FOUC)
- SEO-friendly

### Handle Loading State

Show proper loading indicators:

```svelte
<script>
  import { loading, t } from '$lib/translations';
</script>

{#if $loading}
  <div class="skeleton">Loading...</div>
{:else}
  <h1>{$t('home.title')}</h1>
  <p>{$t('home.content')}</p>
{/if}
```

### Avoid Client-Only Code in SSR

```javascript
import { browser } from '$app/environment';
import { loadTranslations, locale } from '$lib/translations';

export const load = async ({ url }) => {
  // Get saved locale (client only)
  const savedLocale = browser ? localStorage.getItem('locale') : null;
  const initLocale = savedLocale || 'en';
  
  await loadTranslations(initLocale, url.pathname);
  
  return {};
};
```

### Serialize Minimal Data

Don't serialize entire translation objects:

```javascript
// ❌ Bad (sends all translations to client)
export const load = async () => {
  return {
    translations: getAllTranslations(),
  };
};

// ✅ Good (library handles serialization)
export const load = async ({ url }) => {
  await loadTranslations('en', url.pathname);
  return {};  // Library handles everything
};
```

## Component-Scoped Translations

### When to Use

Use component-scoped translations for:
- Reusable components with their own text
- Third-party component wrappers
- Component libraries

### Setup Pattern

```
src/lib/components/DataTable/
├── DataTable.svelte
├── translations.js
└── translations/
    ├── en.json
    └── cs.json
```

**translations.js:**

```javascript
import i18n from 'sveltekit-i18n';

const config = {
  loaders: [
    {
      locale: 'en',
      key: 'dataTable',
      loader: async () => (await import('./translations/en.json')).default,
    },
    {
      locale: 'cs',
      key: 'dataTable',
      loader: async () => (await import('./translations/cs.json')).default,
    },
  ],
};

export const { t: tDataTable, loadTranslations: loadDataTableTranslations } = new i18n(config);
```

**DataTable.svelte:**

```svelte
<script>
  import { onMount } from 'svelte';
  import { tDataTable, loadDataTableTranslations } from './translations';
  import { locale } from '$lib/translations';  // App locale
  
  onMount(async () => {
    await loadDataTableTranslations($locale);
  });
  
  // Watch for locale changes
  $: if ($locale) {
    loadDataTableTranslations($locale);
  }
</script>

<table>
  <thead>
    <tr>
      <th>{$tDataTable('dataTable.column.name')}</th>
      <th>{$tDataTable('dataTable.column.date')}</th>
    </tr>
  </thead>
  <!-- ... -->
</table>
```

### Shared Global Locale

Keep components in sync with app locale:

```javascript
// lib/translations/index.js (main app)
export const { locale } = new i18n(appConfig);

// lib/components/DataTable/translations.js (component)
import { locale as appLocale } from '$lib/translations';

export const { t: tDataTable } = new i18n(componentConfig);

// Use app locale, don't create separate locale store
export { appLocale as locale };
```

## Dynamic Routes and Locales

### Locale in URL Path

For SEO-friendly locale routing:

```
src/routes/[lang]/
├── +layout.js
├── +layout.svelte
├── +page.svelte
└── about/
    └── +page.svelte
```

**hooks.server.js:**

```javascript
export const handle = async ({ event, resolve }) => {
  const lang = event.params.lang || 'en';
  
  // Validate locale
  const supportedLocales = ['en', 'cs', 'de'];
  if (!supportedLocales.includes(lang)) {
    return new Response('Not found', { status: 404 });
  }
  
  return resolve(event);
};
```

**+layout.js:**

```javascript
import { loadTranslations } from '$lib/translations';

export const load = async ({ params, url }) => {
  const { lang } = params;
  
  await loadTranslations(lang, url.pathname);
  
  return { lang };
};
```

### Generate Locale Links

Helper for creating locale-aware links:

```typescript
// lib/utils/i18n.ts
export function localePath(path: string, locale: string): string {
  return `/${locale}${path}`;
}

// Usage
import { localePath } from '$lib/utils/i18n';
import { locale } from '$lib/translations';

const aboutLink = localePath('/about', $locale);
// → '/en/about' or '/cs/about'
```

### Language Switcher for URLs

```svelte
<script>
  import { page } from '$app/stores';
  import { locales } from '$lib/translations';
  
  function getLocalizedPath(newLocale) {
    const currentPath = $page.url.pathname;
    const pathWithoutLocale = currentPath.replace(/^\/[a-z]{2}/, '');
    return `/${newLocale}${pathWithoutLocale}`;
  }
</script>

{#each $locales as loc}
  <a href={getLocalizedPath(loc)}>
    {loc.toUpperCase()}
  </a>
{/each}
```

## Content Management

### CMS Integration

Load translations from headless CMS:

```javascript
const config = {
  loaders: [
    {
      locale: 'en',
      key: 'content',
      loader: async () => {
        const response = await fetch('https://api.cms.com/translations/en');
        return await response.json();
      },
    },
  ],
  cache: 300000,  // 5 minutes (CMS content changes frequently)
};
```

### Database Loading

```javascript
import { db } from '$lib/server/database';

const config = {
  loaders: [
    {
      locale: 'en',
      key: 'dynamic',
      loader: async () => {
        const translations = await db.translations.findOne({
          locale: 'en',
          key: 'dynamic',
        });
        return translations.data;
      },
    },
  ],
};
```

### Mixing Static and Dynamic

```javascript
const config = {
  loaders: [
    // Static (fast, versioned with code)
    {
      locale: 'en',
      key: 'common',
      loader: async () => (await import('./en/common.json')).default,
    },
    
    // Dynamic (CMS, updates without deployment)
    {
      locale: 'en',
      key: 'content',
      loader: async () => {
        const res = await fetch('/api/translations/en/content');
        return await res.json();
      },
    },
  ],
};
```

## Testing

### Mock Translations

```typescript
// tests/helpers.ts
import { writable } from 'svelte/store';

export function mockTranslations() {
  return {
    t: writable((key: string) => key),  // Returns key as-is
    locale: writable('en'),
    locales: writable(['en', 'cs']),
    loading: writable(false),
    initialized: writable(true),
  };
}
```

**Usage:**

```typescript
import { render } from '@testing-library/svelte';
import { mockTranslations } from './helpers';
import MyComponent from './MyComponent.svelte';

// Mock the translations module
vi.mock('$lib/translations', () => mockTranslations());

test('renders component', () => {
  const { getByText } = render(MyComponent);
  expect(getByText('home.title')).toBeInTheDocument();  // Key appears as-is
});
```

### Test with Real Translations

```typescript
import { render, waitFor } from '@testing-library/svelte';
import { loadTranslations } from '$lib/translations';

test('renders translated content', async () => {
  await loadTranslations('en', '/');
  
  const { getByText } = render(MyComponent);
  
  await waitFor(() => {
    expect(getByText('Welcome Home')).toBeInTheDocument();
  });
});
```

## Production Deployment

### Environment-Specific Config

```javascript
import { dev } from '$app/environment';

const config = {
  cache: dev ? 60000 : 86400000,  // 1 min in dev, 24 hrs in prod
  log: {
    level: dev ? 'debug' : 'warn',
  },
};
```

### Error Handling

```javascript
const config = {
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => {
        try {
          return (await import('./en/common.json')).default;
        } catch (error) {
          console.error('Failed to load translations:', error);
          // Return minimal fallback
          return {
            'error.generic': 'An error occurred',
          };
        }
      },
    },
  ],
};
```

### Prerendering

For static sites, ensure translations load during prerender:

```javascript
// +page.js
export const prerender = true;

export const load = async ({ url }) => {
  // Translations will be baked into HTML
  await loadTranslations('en', url.pathname);
  return {};
};
```

### CDN Optimization

Host translation files on CDN:

```javascript
const config = {
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => {
        const res = await fetch('https://cdn.example.com/translations/en/common.json');
        return await res.json();
      },
    },
  ],
};
```

### Monitoring

Track translation loading performance:

```javascript
const config = {
  loaders: [
    {
      locale: 'en',
      key: 'common',
      loader: async () => {
        const start = performance.now();
        const translations = (await import('./en/common.json')).default;
        const duration = performance.now() - start;
        
        console.log(`Loaded translations in ${duration}ms`);
        
        // Send to monitoring service
        if (typeof analytics !== 'undefined') {
          analytics.track('translations_loaded', { locale: 'en', duration });
        }
        
        return translations;
      },
    },
  ],
};
```

## Summary

**Key Takeaways:**

1. **Organization** – Use clear directory structure and naming conventions
2. **Performance** – Lazy load route-specific translations
3. **TypeScript** – Leverage types for safety and IDE support
4. **SSR** – Load translations in layouts for proper server-side rendering
5. **Component-scoped** – Use for reusable components with their own text
6. **Testing** – Mock translations for fast tests, use real ones for integration
7. **Production** – Configure caching, error handling, and monitoring

## See Also

- [Getting Started](./GETTING_STARTED.md) – Basic setup tutorial
- [Architecture Overview](./ARCHITECTURE.md) – How it all works
- [API Documentation](./README.md) – Complete API reference
- [Troubleshooting](./TROUBLESHOOTING.md) – Common issues and solutions
- [Examples](../examples) – Working code examples

