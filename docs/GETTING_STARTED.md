# Getting Started with sveltekit-i18n

This guide will walk you through adding internationalization to your SvelteKit application using `sveltekit-i18n`. We'll start with the simplest setup and gradually explore more advanced features.

## Table of Contents

- [Installation](#installation)
- [Basic Concepts](#basic-concepts)
- [Your First Multilingual App](#your-first-multilingual-app)
- [Route-based Loading](#route-based-loading)
- [Switching Locales](#switching-locales)
- [Next Steps](#next-steps)

## Installation

Install the package using your preferred package manager:

```bash
npm install sveltekit-i18n
```

That's it! The package has zero external dependencies.

## Basic Concepts

Before we dive in, let's understand the key concepts:

### Locales

A **locale** is a language identifier (like `en`, `cs`, `de`). Your app can support multiple locales.

### Translation Keys

Translations are stored as key-value pairs. Keys use dot notation:

```json
{
  "common.greeting": "Hello",
  "common.farewell": "Goodbye",
  "home.title": "Welcome to our app"
}
```

### Loaders

**Loaders** define how and when to load translations. They can load:
- All translations at once
- Translations for specific routes only
- Translations on demand

### Namespaces

A **namespace** (the `key` in loaders) groups related translations together (like `common`, `home`, `about`). This helps organize translations and enables lazy loading.

## Your First Multilingual App

Let's create a simple multilingual application from scratch.

### Step 1: Create Translation Files

First, create your translation files. We'll support English and Czech:

```
src/lib/translations/
├── en/
│   └── common.json
├── cs/
│   └── common.json
└── index.js
```

Create English translations:

```json
// src/lib/translations/en/common.json
{
  "app.name": "My Application",
  "greeting": "Hello, {{name}}!",
  "nav.home": "Home",
  "nav.about": "About",
  "farewell": "Goodbye!"
}
```

Create Czech translations:

```json
// src/lib/translations/cs/common.json
{
  "app.name": "Moje Aplikace",
  "greeting": "Ahoj, {{name}}!",
  "nav.home": "Domů",
  "nav.about": "O nás",
  "farewell": "Nashledanou!"
}
```

### Step 2: Configure i18n

Create your i18n configuration file:

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

**What's happening here:**
- We import `sveltekit-i18n`
- We configure loaders for each locale and namespace
- We export `t` (translation function), `locale` (current locale), and other utilities

### Step 3: Load Translations in Layout

Load translations in your root layout:

```javascript
// src/routes/+layout.js
import { loadTranslations } from '$lib/translations';

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ url }) => {
  const { pathname } = url;
  
  // Determine the initial locale (we'll improve this later)
  const initLocale = 'en';
  
  await loadTranslations(initLocale, pathname);
  
  return {};
};
```

**Why in the layout?**
- Layouts run before pages
- Ensures translations are ready before any page renders
- Works with SSR (Server-Side Rendering)

### Step 4: Use Translations in Components

Now you can use translations anywhere in your app:

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { t, locale } from '$lib/translations';
  
  const userName = 'World';
</script>

<h1>{$t('app.name')}</h1>
<p>{$t('greeting', { name: userName })}</p>
<p>Current locale: {$locale}</p>

<nav>
  <a href="/">{$t('nav.home')}</a>
  <a href="/about">{$t('nav.about')}</a>
</nav>
```

**Key points:**
- Use `$t()` to get translations (the `$` makes it reactive)
- Pass variables as an object: `$t('key', { variable: value })`
- Access current locale with `$locale`

### Step 5: Test Your App

Run your development server:

```bash
npm run dev
```

Visit `http://localhost:5173` and you should see your translated content!

## Route-based Loading

For larger apps, you don't want to load all translations at once. Let's add route-specific translations.

### Add Page-Specific Translations

Create translations for specific pages:

```
src/lib/translations/
├── en/
│   ├── common.json
│   ├── home.json
│   └── about.json
├── cs/
│   ├── common.json
│   ├── home.json
│   └── about.json
└── index.js
```

```json
// src/lib/translations/en/home.json
{
  "title": "Welcome Home",
  "content": "This is the homepage content."
}
```

```json
// src/lib/translations/en/about.json
{
  "title": "About Us",
  "content": "Learn more about our company."
}
```

### Update Configuration

Add route-specific loaders:

```javascript
// src/lib/translations/index.js
import i18n from 'sveltekit-i18n';

/** @type {import('sveltekit-i18n').Config} */
const config = {
  loaders: [
    // Common translations (loaded on every page)
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
    
    // Home page translations (loaded only on '/')
    {
      locale: 'en',
      key: 'home',
      routes: ['/'],
      loader: async () => (await import('./en/home.json')).default,
    },
    {
      locale: 'cs',
      key: 'home',
      routes: ['/'],
      loader: async () => (await import('./cs/home.json')).default,
    },
    
    // About page translations (loaded only on '/about')
    {
      locale: 'en',
      key: 'about',
      routes: ['/about'],
      loader: async () => (await import('./en/about.json')).default,
    },
    {
      locale: 'cs',
      key: 'about',
      routes: ['/about'],
      loader: async () => (await import('./cs/about.json')).default,
    },
  ],
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
```

**Benefits:**
- `common.json` loads on every page (for navigation, etc.)
- `home.json` loads only when visiting `/`
- `about.json` loads only when visiting `/about`
- Reduces initial bundle size
- Translations load only once per route

### Use Route-Specific Translations

```svelte
<!-- src/routes/+page.svelte -->
<script>
  import { t } from '$lib/translations';
</script>

<h1>{$t('home.title')}</h1>
<p>{$t('home.content')}</p>

<nav>
  <a href="/about">{$t('common.nav.about')}</a>
</nav>
```

```svelte
<!-- src/routes/about/+page.svelte -->
<script>
  import { t } from '$lib/translations';
</script>

<h1>{$t('about.title')}</h1>
<p>{$t('about.content')}</p>
```

## Switching Locales

Let's add a language switcher to your app.

### Create a Language Switcher Component

```svelte
<!-- src/lib/components/LanguageSwitcher.svelte -->
<script>
  import { locale, locales } from '$lib/translations';
  
  function changeLocale(newLocale) {
    locale.set(newLocale);
  }
</script>

<div class="language-switcher">
  {#each $locales as loc}
    <button
      on:click={() => changeLocale(loc)}
      class:active={$locale === loc}
    >
      {loc.toUpperCase()}
    </button>
  {/each}
</div>

<style>
  .language-switcher {
    display: flex;
    gap: 0.5rem;
  }
  
  button {
    padding: 0.5rem 1rem;
    border: 1px solid #ccc;
    background: white;
    cursor: pointer;
  }
  
  button.active {
    background: #007bff;
    color: white;
    border-color: #007bff;
  }
</style>
```

### Add to Your Layout

```svelte
<!-- src/routes/+layout.svelte -->
<script>
  import LanguageSwitcher from '$lib/components/LanguageSwitcher.svelte';
  import { loading } from '$lib/translations';
</script>

<header>
  <LanguageSwitcher />
</header>

{#if $loading}
  <p>Loading translations...</p>
{:else}
  <slot />
{/if}
```

**What happens when switching:**
1. User clicks a language button
2. `locale.set(newLocale)` is called
3. Library loads translations for the new locale (if not already loaded)
4. All `$t()` calls re-evaluate with new translations
5. UI updates automatically (Svelte reactivity!)

### Persisting Locale Preference

Save the user's language preference:

```javascript
// src/routes/+layout.js
import { browser } from '$app/environment';
import { loadTranslations, locale } from '$lib/translations';

/** @type {import('./$types').LayoutLoad} */
export const load = async ({ url }) => {
  const { pathname } = url;
  
  // Get locale from localStorage or default to 'en'
  const savedLocale = browser ? localStorage.getItem('locale') : null;
  const initLocale = savedLocale || 'en';
  
  await loadTranslations(initLocale, pathname);
  
  return {};
};
```

```svelte
<!-- src/lib/components/LanguageSwitcher.svelte -->
<script>
  import { browser } from '$app/environment';
  import { locale, locales } from '$lib/translations';
  
  function changeLocale(newLocale) {
    locale.set(newLocale);
    
    // Save preference
    if (browser) {
      localStorage.setItem('locale', newLocale);
    }
  }
</script>

<!-- ... rest of component ... -->
```

## Advanced Features Preview

### Placeholders

Use variables in your translations:

```json
{
  "greeting": "Hello, {{name}}!",
  "items": "You have {{count}} items."
}
```

```javascript
$t('greeting', { name: 'Alice' })
$t('items', { count: 5 })
```

### Modifiers

Format numbers, dates, and more:

```json
{
  "price": "Price: {{amount:currency;}}",
  "updated": "Updated {{date:ago;}}"
}
```

```javascript
$t('price', { amount: 99.99 }, { currency: 'USD' })
$t('updated', { date: Date.now() - 3600000 })
// → "Updated 1 hour ago"
```

### Conditionals

Show different text based on conditions:

```json
{
  "items": "You have {{count}} {{count; 1:item; default:items;}}."
}
```

```javascript
$t('items', { count: 1 })  // → "You have 1 item."
$t('items', { count: 5 })  // → "You have 5 items."
```

Learn more in the [API Documentation](./README.md).

## Next Steps

Now that you have a working multilingual app, explore these topics:

### 📚 Learn More

- **[API Documentation](./README.md)** – Complete API reference
- **[Architecture Overview](./ARCHITECTURE.md)** – How everything works
- **[Best Practices](./BEST_PRACTICES.md)** – Recommended patterns and organization
- **[Troubleshooting](./TROUBLESHOOTING.md)** – Common issues and solutions

### 🎨 Examples

Check out working examples for specific use cases:

- **[Multi-page app](../examples/multi-page)** – Route-based loading (you just built this!)
- **[Locale routing](../examples/locale-router)** – SEO-friendly URLs (`/en/about`, `/cs/about`)
- **[Component-scoped](../examples/component-scoped-ssr)** – Isolated translation contexts
- **[Fallback locales](../examples/fallback-locale)** – Handling missing translations
- **[All examples](../examples)** – Browse all examples

### 🔧 Advanced Topics

- **Custom parsers** – Use ICU message format or create your own
- **TypeScript** – Complete type definitions for configuration and API
- **Dynamic loading** – Load translations from APIs
- **SEO** – Locale-based routing for better SEO

### 💡 Tips

1. **Keep it simple** – Start with one namespace (`common`) and split later if needed
2. **Use route-based loading** – Only load what you need
3. **Common translations** – Keep navigation and shared UI text in a `common` namespace
4. **Consistent keys** – Use dot notation and clear naming (e.g., `page.section.item`)

## Need Help?

- **[Troubleshooting Guide](./TROUBLESHOOTING.md)** – Common issues
- **[GitHub Issues](https://github.com/sveltekit-i18n/lib/issues)** – Report bugs or ask questions
- **[Examples](../examples)** – Working code you can reference

Happy translating! 🌍

