# Troubleshooting & FAQ

This guide helps you diagnose and fix common issues when using `sveltekit-i18n`. If you don't find your issue here, check [GitHub Issues](https://github.com/sveltekit-i18n/lib/issues) or create a new one.

## Table of Contents

- [Common Issues](#common-issues)
  - [Translations Not Loading](#translations-not-loading)
  - [Translation Keys Displayed Instead of Values](#translation-keys-displayed-instead-of-values)
  - [Translations Flash/Change After Page Load](#translations-flashchange-after-page-load)
  - [Route-Based Loading Not Working](#route-based-loading-not-working)
  - [Locale Not Changing](#locale-not-changing)
  - [TypeScript Errors](#typescript-errors)
  - [SSR Errors](#ssr-errors)
  - [Performance Issues](#performance-issues)
- [Debugging Tips](#debugging-tips)
- [Frequently Asked Questions](#frequently-asked-questions)
- [Known Limitations](#known-limitations)
- [Getting Help](#getting-help)

## Common Issues

### Translations Not Loading

**Symptoms:**
- Translation keys appear instead of values
- `$loading` is always `true`
- Console shows no errors

**Possible Causes & Solutions:**

#### 1. Forgot to call `loadTranslations`

**Problem:**

```javascript
// ❌ +layout.js
export const load = async ({ url }) => {
  // Missing loadTranslations call
  return {};
};
```

**Solution:**

```javascript
// ✅ +layout.js
import { loadTranslations } from '$lib/translations';

export const load = async ({ url }) => {
  await loadTranslations('en', url.pathname);
  return {};
};
```

#### 2. Loader function not returning data

**Problem:**

```javascript
// ❌ Loader doesn't return anything
{
  locale: 'en',
  key: 'common',
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
  key: 'common',
  loader: async () => (await import('./en/common.json')).default,
}
```

#### 3. Import path is wrong

**Problem:**

```javascript
// ❌ Wrong path
loader: async () => (await import('./translations/en.json')).default
// File is actually at ./en/common.json
```

**Solution:**
- Check file path relative to your configuration file
- Use absolute imports if needed: `import('$lib/translations/en/common.json')`

#### 4. JSON syntax error

**Problem:**

```json
// ❌ Invalid JSON (trailing comma)
{
  "greeting": "Hello",
}
```

**Solution:**

```json
// ✅ Valid JSON
{
  "greeting": "Hello"
}
```

**Debugging:**
- Check browser console for import errors
- Try importing the JSON file directly in a test component

---

### Translation Keys Displayed Instead of Values

**Symptoms:**
- See `"home.title"` instead of `"Welcome"`
- Translations look correct in JSON files

**Possible Causes & Solutions:**

#### 1. Wrong translation key

**Problem:**

```svelte
<!-- ❌ Key doesn't exist -->
<h1>{$t('home.titel')}</h1>
```

```json
{
  "home.title": "Welcome"
}
```

**Solution:**
- Check spelling: `titel` → `title`
- Check key exists in translations
- Use `$translations` store to inspect loaded translations:

```svelte
<pre>{JSON.stringify($translations, null, 2)}</pre>
```

#### 2. Namespace not included in key

**Problem:**

```javascript
// Loader configuration
{
  locale: 'en',
  key: 'home',  // ← Namespace
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
<h1>{$t('title')}</h1>
```

**Solution:**

```svelte
<!-- ✅ Include namespace -->
<h1>{$t('home.title')}</h1>
```

#### 3. Translation not loaded for current route

**Problem:**

```javascript
// home translations only load on '/'
{
  locale: 'en',
  key: 'home',
  routes: ['/'],
  loader: async () => (await import('./en/home.json')).default,
}
```

```svelte
<!-- Trying to use on /about page -->
<h1>{$t('home.title')}</h1>
```

**Solution:**
- Remove `routes` to load on all pages, or
- Add route to the list, or
- Move to `common` namespace

#### 4. Preprocessing issue

**Problem with preprocess: 'none':**

```javascript
const config = {
  preprocess: 'none',  // No flattening
};
```

```json
{
  "home": {
    "title": "Welcome"
  }
}
```

```svelte
<!-- ❌ Doesn't work with 'none' preprocess -->
<h1>{$t('home.title')}</h1>
```

**Solution:**
- Use default preprocessing (`'full'`), or
- Access nested structure: `$t('home').title`

---

### Translations Flash/Change After Page Load

**Symptoms:**
- Translation keys briefly visible before correct translations appear
- Content "pops" or changes after page loads

**Cause:**
Translations loading on client-side instead of server-side

**Solution:**

#### 1. Load in +layout.js (not +layout.svelte)

**❌ Wrong (client-side only):**

```svelte
<!-- +layout.svelte -->
<script>
  import { onMount } from 'svelte';
  import { loadTranslations } from '$lib/translations';
  
  onMount(async () => {
    await loadTranslations('en', '/');  // Runs on client
  });
</script>
```

**✅ Correct (server and client):**

```javascript
// +layout.js
import { loadTranslations } from '$lib/translations';

export const load = async ({ url }) => {
  await loadTranslations('en', url.pathname);  // Runs on server
  return {};
};
```

#### 2. Show loading state

If client-side loading is necessary:

```svelte
<script>
  import { loading, t } from '$lib/translations';
</script>

{#if $loading}
  <div class="skeleton">Loading...</div>
{:else}
  <h1>{$t('home.title')}</h1>
{/if}
```

---

### Route-Based Loading Not Working

**Symptoms:**
- Translations always load regardless of route
- Or never load even on matching routes

**Possible Causes & Solutions:**

#### 1. Routes array is empty

**Problem:**

```javascript
{
  locale: 'en',
  key: 'home',
  routes: [],  // ❌ Empty array
  loader: async () => (await import('./en/home.json')).default,
}
```

**Solution:**

```javascript
routes: ['/']  // ✅ Specify routes, or omit for all routes
```

#### 2. Regex not matching

**Problem:**

```javascript
routes: [/^products/]  // ❌ Matches '/products' but not '/products/123'
```

**Solution:**

```javascript
routes: [/^\/products/]  // ✅ Note the \/ at start
```

Test your regex:

```javascript
const pattern = /^\/products/;
console.log(pattern.test('/products'));      // true
console.log(pattern.test('/products/123'));  // true
console.log(pattern.test('/about'));         // false
```

#### 3. Pathname includes locale prefix

**Problem:**

```javascript
// URL: /en/products
routes: ['/products']  // ❌ Doesn't match '/en/products'
```

**Solution:**

```javascript
// Option 1: Include locale in route pattern
routes: ['/en/products', '/cs/products']

// Option 2: Use regex
routes: [/^\/[a-z]{2}\/products/]

// Option 3: Strip locale before passing to loadTranslations
const pathname = url.pathname.replace(/^\/[a-z]{2}/, '');
await loadTranslations(locale, pathname);
```

---

### Locale Not Changing

**Symptoms:**
- `locale.set('cs')` doesn't change displayed translations
- Locale store updates but translations stay the same

**Possible Causes & Solutions:**

#### 1. Translations not loaded for new locale

**Problem:**
Only English translations defined:

```javascript
const config = {
  loaders: [
    { locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default },
    // ❌ Missing 'cs' loaders
  ],
};
```

**Solution:**
Add loaders for all locales:

```javascript
const config = {
  loaders: [
    { locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default },
    { locale: 'cs', key: 'common', loader: async () => (await import('./cs/common.json')).default },  // ✅
  ],
};
```

#### 2. Using `l` instead of `t`

**Problem:**

```svelte
<!-- ❌ Always shows English -->
<h1>{$l('en', 'home.title')}</h1>
```

**Solution:**

```svelte
<!-- ✅ Uses current locale -->
<h1>{$t('home.title')}</h1>
```

#### 3. Loader error

Check console for errors when locale changes. Translation loading might be failing silently.

---

### TypeScript Errors

#### Type 'Config' is not generic

**Error:**

```typescript
const config: Config<ParserConfig> = {  // ❌ Error here
  // ...
};
```

**Solution:**

```typescript
import type { Config } from 'sveltekit-i18n';

const config: Config = {  // ✅ Don't use generic for main lib
  // ...
};
```

For `@sveltekit-i18n/base`:

```typescript
import type { Config } from '@sveltekit-i18n/base';
import type { Config as ParserConfig } from '@sveltekit-i18n/parser-default';

const config: Config<ParserConfig> = {  // ✅ Generic for base
  // ...
};
```

#### Cannot find module '$lib/translations'

**Error:**

```typescript
import { t } from '$lib/translations';  // ❌ Cannot find module
```

**Solution:**

Check `svelte.config.js` has correct alias:

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

### SSR Errors

#### Error: window is not defined

**Problem:**

```javascript
// +layout.js
import { browser } from '$app/environment';

export const load = async () => {
  const locale = localStorage.getItem('locale');  // ❌ Fails on server
  // ...
};
```

**Solution:**

```javascript
import { browser } from '$app/environment';

export const load = async () => {
  const locale = browser ? localStorage.getItem('locale') : null;  // ✅
  // ...
};
```

#### Translations not hydrating properly

**Problem:**
Translations work on server but not on client after hydration.

**Solution:**
Ensure `loadTranslations` is called in `+layout.js` (not `.server.js`):

```javascript
// ✅ +layout.js (runs on both server and client)
export const load = async ({ url }) => {
  await loadTranslations('en', url.pathname);
  return {};
};
```

---

### Performance Issues

#### Slow initial page load

**Causes:**
1. Loading too many translations at once
2. Large translation files
3. No route-based loading

**Solutions:**

**1. Implement route-based loading:**

```javascript
// ❌ Before: Everything loads always
{ locale: 'en', key: 'everything', loader: async () => (await import('./en/everything.json')).default }

// ✅ After: Split by route
{ locale: 'en', key: 'common', loader: async () => (await import('./en/common.json')).default },
{ locale: 'en', key: 'home', routes: ['/'], loader: async () => (await import('./en/home.json')).default },
{ locale: 'en', key: 'products', routes: [/^\/products/], loader: async () => (await import('./en/products.json')).default },
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

**3. Measure and monitor:**

```javascript
{
  locale: 'en',
  key: 'common',
  loader: async () => {
    const start = performance.now();
    const data = (await import('./en/common.json')).default;
    console.log(`Loaded in ${performance.now() - start}ms`);
    return data;
  },
}
```

#### Memory issues (server)

**Cause:**
Translations cached forever

**Solution:**
Configure cache refresh:

```javascript
const config = {
  cache: 3600000,  // 1 hour (instead of default 24 hours)
};
```

---

## Debugging Tips

### 1. Inspect Loaded Translations

```svelte
<script>
  import { translations, locale } from '$lib/translations';
</script>

<details>
  <summary>Debug: Loaded Translations</summary>
  <pre>{JSON.stringify($translations, null, 2)}</pre>
</details>

<p>Current locale: {$locale}</p>
```

### 2. Check Loading State

```svelte
<script>
  import { loading, initialized } from '$lib/translations';
</script>

<p>Loading: {$loading}</p>
<p>Initialized: {$initialized}</p>
```

### 3. Test Loaders Directly

```javascript
// Test in browser console or separate script
const loader = async () => (await import('$lib/translations/en/common.json')).default;
const data = await loader();
console.log(data);
```

### 4. Enable Debug Logging

```javascript
const config = {
  log: {
    level: 'debug',  // See all operations
  },
};
```

### 5. Check Available Locales

```svelte
<script>
  import { locales } from '$lib/translations';
</script>

<p>Available locales: {$locales.join(', ')}</p>
```

### 6. Verify Route Matching

```javascript
// In +layout.js
export const load = async ({ url }) => {
  console.log('Current pathname:', url.pathname);
  await loadTranslations('en', url.pathname);
  return {};
};
```

---

## Frequently Asked Questions

### Can I use this library without SvelteKit?

`sveltekit-i18n` is designed specifically for SvelteKit. For plain Svelte apps, consider:
- [svelte-i18n](https://github.com/kaisermann/svelte-i18n)
- [svelte-intl-precompile](https://github.com/cibernox/svelte-intl-precompile)

### Can I use HTML in translations?

No, translations are rendered as text. For HTML content, use `@html`:

```svelte
<p>{@html $t('content.with.html')}</p>
```

**⚠️ Security Warning:** Only use `@html` with trusted content. Never use it with user-generated content.

### How do I handle plurals?

Use the default parser's conditional syntax:

```json
{
  "items": "You have {{count}} {{count; 1:item; default:items;}}."
}
```

Or use ICU parser for advanced pluralization:

```json
{
  "items": "You have {count, plural, =0 {no items} one {# item} other {# items}}."
}
```

### Can I change parser after initialization?

Not recommended. Create a new instance instead:

```javascript
const { t: tDefault } = new i18n(configWithDefaultParser);
const { t: tICU } = new i18n(configWithICUParser);
```

### How do I handle right-to-left (RTL) languages?

The library doesn't handle RTL directly. Manage it in your app:

```svelte
<script>
  import { locale } from '$lib/translations';
  
  $: isRTL = ['ar', 'he', 'fa'].includes($locale);
</script>

<div dir={isRTL ? 'rtl' : 'ltr'}>
  <p>{$t('content')}</p>
</div>
```

### Can I nest translation calls?

No, `$t()` returns a string, not a translation key. Pre-compose your translations:

```javascript
// ❌ Won't work
$t($t('dynamic.key'))

// ✅ Use variables
const key = someCondition ? 'key1' : 'key2';
$t(key)
```

### How do I translate dynamic content?

Use placeholders:

```json
{
  "welcome": "Welcome, {{name}}!",
  "error": "{{field}} is required."
}
```

```javascript
$t('welcome', { name: userName })
$t('error', { field: $t('form.field.email') })
```

### Can I load translations from a database?

Yes! Use async loader:

```javascript
{
  locale: 'en',
  key: 'dynamic',
  loader: async () => {
    const res = await fetch('/api/translations/en');
    return await res.json();
  },
}
```

### How do I handle missing translations during development?

Use `fallbackLocale` temporarily:

```javascript
const config = {
  fallbackLocale: 'en',  // Fall back to English
};
```

Or use a custom `fallbackValue`:

```javascript
const config = {
  fallbackValue: '🚧',  // Show construction emoji
};
```

### Does this work with SvelteKit adapters?

Yes! Works with all adapters:
- `@sveltejs/adapter-auto`
- `@sveltejs/adapter-node`
- `@sveltejs/adapter-static`
- `@sveltejs/adapter-vercel`
- `@sveltejs/adapter-netlify`
- And others

### How do I translate meta tags (SEO)?

In `+page.js` or `+page.server.js`:

```javascript
import { t } from '$lib/translations';

export const load = async () => {
  return {
    meta: {
      title: t.get('page.title'),
      description: t.get('page.description'),
    },
  };
};
```

In `+page.svelte`:

```svelte
<script>
  export let data;
</script>

<svelte:head>
  <title>{data.meta.title}</title>
  <meta name="description" content={data.meta.description} />
</svelte:head>
```

---

## Known Limitations

### 1. Cannot use dots in namespace keys

```javascript
// ❌ Won't work correctly
{ key: 'pages.home' }

// ✅ Use different separator or remove
{ key: 'pages_home' }
{ key: 'home' }
```

### 2. Translation keys are case-sensitive

```json
{
  "Greeting": "Hello"
}
```

```javascript
$t('greeting')  // ❌ Won't find 'Greeting'
$t('Greeting')  // ✅ Correct
```

### 3. Locale identifiers must be lowercase

```javascript
locale.set('EN')  // ❌ Converts to 'en'
locale.set('en')  // ✅ Correct
```

### 4. No automatic locale detection

You must explicitly set the locale:

```javascript
// Detect from browser
const browserLang = navigator.language.split('-')[0];

// Detect from URL
const urlLang = url.pathname.split('/')[1];

// Set locale
await loadTranslations(browserLang, url.pathname);
```

---

## Getting Help

### Before Asking for Help

1. **Check this guide** – Most issues are covered here
2. **Search existing issues** – Someone might have had the same problem
3. **Enable debug logging** – `log: { level: 'debug' }`
4. **Create a minimal reproduction** – Isolate the problem

### Where to Get Help

1. **[GitHub Issues](https://github.com/sveltekit-i18n/lib/issues)** – Bug reports and feature requests
2. **[GitHub Discussions](https://github.com/sveltekit-i18n/lib/discussions)** – Questions and community help
3. **[Examples](../examples)** – Working code you can reference

### Creating a Good Issue

Include:
- **SvelteKit version** (`npm list @sveltejs/kit`)
- **sveltekit-i18n version** (`npm list sveltekit-i18n`)
- **Minimal reproduction** (CodeSandbox, StackBlitz, or GitHub repo)
- **Expected behavior** vs **actual behavior**
- **Error messages** (full stack trace)
- **Configuration** (anonymized if needed)

**Example:**

```markdown
## Bug Report

### Environment
- SvelteKit: 2.0.0
- sveltekit-i18n: 2.4.2
- Node: 20.10.0

### Issue
Translations flash on page load

### Reproduction
https://stackblitz.com/edit/...

### Expected
Translations should be ready on initial render

### Actual
Keys briefly visible before translations load

### Configuration
... paste your config ...
```

---

## See Also

- [Getting Started](./GETTING_STARTED.md) – Setup tutorial
- [API Documentation](./README.md) – Complete API reference
- [Best Practices](./BEST_PRACTICES.md) – Recommended patterns
- [Architecture](./ARCHITECTURE.md) – How it works internally
- [Examples](../examples) – Working code examples

