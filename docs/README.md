# sveltekit-i18n API Documentation

Complete API reference for `sveltekit-i18n` – the complete i18n solution for SvelteKit with `@sveltekit-i18n/parser-default` included.

## Table of Contents

- [Configuration](#configuration)
- [Parser Options](#parser-options)
- [Instance Properties and Methods](#instance-properties-and-methods)
- [Message Format](#message-format)
- [TypeScript](#typescript)
- [See Also](#see-also)

## Configuration

`sveltekit-i18n` includes all configuration options from `@sveltekit-i18n/base`, plus specific options for the default parser.

```javascript
import i18n from 'sveltekit-i18n';

/** @type {import('sveltekit-i18n').Config} */
const config = {
  loaders: [/* ... */],
  parserOptions: {/* parser-default specific options */},
  // All @sveltekit-i18n/base options available
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
```

### Inherited from @sveltekit-i18n/base

The following options work exactly as in `@sveltekit-i18n/base`:

- `loaders` – Define how and when translations load
- `translations` – Synchronous translations
- `preprocess` – Transform translation data
- `initLocale` – Initialize with specific locale
- `fallbackLocale` – Fallback when translation missing
- `fallbackValue` – Default value for missing keys
- `cache` – Server-side cache duration
- `log` – Logging configuration

**📖 Full documentation:** [@sveltekit-i18n/base API docs](https://github.com/sveltekit-i18n/base/tree/master/docs/README.md)

### Quick Example

```javascript
import i18n from 'sveltekit-i18n';

/** @type {import('sveltekit-i18n').Config} */
const config = {
  // Common translations loaded on every page
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
  
  // Optional: Configure default parser
  parserOptions: {
    modifierDefaults: {
      number: { minimumFractionDigits: 2 },
    },
  },
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
```

## Parser Options

`sveltekit-i18n` uses `@sveltekit-i18n/parser-default` which supports placeholders and modifiers.

### `parserOptions.modifierDefaults`

Configure default formatting options for built-in modifiers.

```javascript
const config = {
  parserOptions: {
    modifierDefaults: {
      number: {
        // Intl.NumberFormat options
        minimumFractionDigits: 0,
        maximumFractionDigits: 2,
      },
      date: {
        // Intl.DateTimeFormat options
        dateStyle: 'medium',
      },
      ago: {
        // Intl.RelativeTimeFormat options
        numeric: 'auto',
        format: 'auto', // 'auto' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
      },
      currency: {
        // Intl.NumberFormat currency options
        style: 'currency',
        currency: 'USD',
        ratio: 1, // Conversion ratio
      },
    },
  },
};
```

#### Number Modifier Defaults

Control how numbers are formatted:

```javascript
const config = {
  parserOptions: {
    modifierDefaults: {
      number: {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      },
    },
  },
};
```

**Translation:**

```json
{
  "price": "Price: {{value:number;}}"
}
```

**Usage:**

```javascript
$t('price', { value: 99 })
// → "Price: 99.00" (with defaults)
// Without defaults → "Price: 99"
```

**Override per translation:**

```javascript
$t('price', { value: 99.999 }, { minimumFractionDigits: 3 })
// → "Price: 99.999"
```

#### Date Modifier Defaults

Control date formatting:

```javascript
const config = {
  parserOptions: {
    modifierDefaults: {
      date: {
        dateStyle: 'full',        // 'full' | 'long' | 'medium' | 'short'
        timeStyle: 'short',       // 'full' | 'long' | 'medium' | 'short'
        // Or use individual options:
        // year: 'numeric',
        // month: 'long',
        // day: 'numeric',
      },
    },
  },
};
```

**Translation:**

```json
{
  "published": "Published: {{date:date;}}"
}
```

**Usage:**

```javascript
$t('published', { date: new Date('2024-01-15') })
// → "Published: Monday, January 15, 2024" (with dateStyle: 'full')
```

#### Ago Modifier Defaults

Control relative time formatting:

```javascript
const config = {
  parserOptions: {
    modifierDefaults: {
      ago: {
        numeric: 'auto',     // 'auto' | 'always'
        format: 'auto',      // 'auto' | 'second' | 'minute' | 'hour' | 'day' | 'week' | 'month' | 'year'
      },
    },
  },
};
```

**Translation:**

```json
{
  "updated": "Updated {{time:ago;}}"
}
```

**Usage:**

```javascript
const oneHourAgo = Date.now() - 3600000;
$t('updated', { time: oneHourAgo })
// → "Updated 1 hour ago" (with numeric: 'auto')
// → "Updated in 1 hour" (with numeric: 'always')
```

**Format option:**

```javascript
// Auto-detect best unit
ago: { format: 'auto' }  // Uses most appropriate unit

// Force specific unit
ago: { format: 'day' }   // Always show in days
```

#### Currency Modifier Defaults

Control currency formatting:

```javascript
const config = {
  parserOptions: {
    modifierDefaults: {
      currency: {
        style: 'currency',
        currency: 'EUR',     // Default currency
        ratio: 1,            // Exchange rate conversion
      },
    },
  },
};
```

**Translation:**

```json
{
  "total": "Total: {{amount:currency;}}"
}
```

**Usage:**

```javascript
$t('total', { amount: 99.99 })
// → "Total: €99.99" (with currency: 'EUR')
```

**With conversion ratio:**

```javascript
const config = {
  parserOptions: {
    modifierDefaults: {
      currency: {
        currency: 'CZK',
        ratio: 25,  // 1 EUR = 25 CZK
      },
    },
  },
};

$t('total', { amount: 10 })  // 10 EUR
// → "Total: 250 CZK" (10 * 25)
```

**Override per translation:**

```javascript
$t('total', { amount: 99.99 }, { currency: 'GBP' })
// → "Total: £99.99"
```

### `parserOptions.customModifiers`

Add your own modifiers for specialized formatting.

```javascript
const config = {
  parserOptions: {
    customModifiers: {
      // Modifier name → implementation
      upper: ({ value }) => String(value).toUpperCase(),
      
      lower: ({ value }) => String(value).toLowerCase(),
      
      capitalize: ({ value }) => {
        const str = String(value);
        return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
      },
    },
  },
};
```

**Translation:**

```json
{
  "title": "{{text:upper;}}",
  "subtitle": "{{text:capitalize;}}"
}
```

**Usage:**

```javascript
$t('title', { text: 'hello world' })
// → "HELLO WORLD"

$t('subtitle', { text: 'hello world' })
// → "Hello world"
```

#### Complex Custom Modifiers

Custom modifiers receive these parameters:

```javascript
const config = {
  parserOptions: {
    customModifiers: {
      myModifier: ({ value, options, props, defaultValue, locale }) => {
        // value: the placeholder value
        // options: parsed options from translation
        // props: additional props from $t() call
        // defaultValue: default value if set
        // locale: current locale
        
        return transformedValue;
      },
    },
  },
};
```

**Example: Conditional modifier with options**

```javascript
const config = {
  parserOptions: {
    customModifiers: {
      status: ({ value, options, defaultValue }) => {
        const option = options.find(opt => opt.key === value);
        return option?.value || defaultValue || value;
      },
    },
  },
};
```

**Translation:**

```json
{
  "order": "Status: {{status:status; pending:⏳ Pending; shipped:📦 Shipped; delivered:✅ Delivered; default:❓ Unknown;}}"
}
```

**Usage:**

```javascript
$t('order', { status: 'shipped' })
// → "Status: 📦 Shipped"
```

**Example: Truncate with props**

```javascript
const config = {
  parserOptions: {
    customModifiers: {
      truncate: ({ value, props }) => {
        const maxLength = props?.maxLength || 50;
        const str = String(value);
        return str.length > maxLength ? str.slice(0, maxLength) + '...' : str;
      },
    },
  },
};
```

**Translation:**

```json
{
  "description": "{{text:truncate;}}"
}
```

**Usage:**

```javascript
$t('description', { text: 'Very long text here...' }, { maxLength: 20 })
// → "Very long text here..."
```

**Example: Format with locale awareness**

```javascript
const config = {
  parserOptions: {
    customModifiers: {
      phone: ({ value, locale }) => {
        const number = String(value).replace(/\D/g, '');
        
        if (locale === 'us' || locale === 'en') {
          // US format: (123) 456-7890
          return `(${number.slice(0,3)}) ${number.slice(3,6)}-${number.slice(6)}`;
        } else if (locale === 'cs' || locale === 'cz') {
          // Czech format: +420 123 456 789
          return `+420 ${number.slice(0,3)} ${number.slice(3,6)} ${number.slice(6)}`;
        }
        
        return value;
      },
    },
  },
};
```

**Translation:**

```json
{
  "contact": "Call us: {{phone:phone;}}"
}
```

**Usage:**

```javascript
// In English (en)
$t('contact', { phone: '1234567890' })
// → "Call us: (123) 456-7890"

// In Czech (cs)
$t('contact', { phone: '123456789' })
// → "Call us: +420 123 456 789"
```

## Instance Properties and Methods

`sveltekit-i18n` instances include all properties and methods from `@sveltekit-i18n/base`:

- **`t`** – Translation function
- **`l`** – Locale-specific translation function
- **`locale`** – Current locale (writable)
- **`locales`** – All available locales
- **`loading`** – Loading state
- **`initialized`** – Initialization state
- **`translations`** – All loaded translations
- **`loadTranslations`** – Load translations for locale and route
- **`setLocale`** – Change current locale
- **`setRoute`** – Update current route
- And more...

**📖 Full API reference:** [@sveltekit-i18n/base API docs](https://github.com/sveltekit-i18n/base/tree/master/docs/README.md#instance-properties-and-methods)

### Quick Reference

```javascript
const { t, locale, locales, loading, loadTranslations } = new i18n(config);

// Translation function
$t('home.title')                          // Simple
$t('greeting', { name: 'Alice' })        // With variables
$t('price', { value: 99 }, { currency: 'EUR' })  // With props

// In .js files
t.get('home.title')

// Locale management
$locale                                   // Current locale
locale.set('cs')                         // Change locale
$locales                                 // ['en', 'cs', ...]

// Loading state
$loading                                 // true/false
await loading.toPromise()                // Wait for load

// Load translations
await loadTranslations('en', pathname)   // In +layout.js
```

## Message Format

`sveltekit-i18n` uses `@sveltekit-i18n/parser-default` for message interpolation.

### Placeholders

Simple variable substitution:

```json
{
  "greeting": "Hello, {{name}}!",
  "message": "You have {{count}} notifications."
}
```

```javascript
$t('greeting', { name: 'Alice' })        // → "Hello, Alice!"
$t('message', { count: 5 })              // → "You have 5 notifications."
```

### Default Values

Fallback when variable is missing:

```json
{
  "welcome": "Welcome, {{name; default:Guest;}}!"
}
```

```javascript
$t('welcome', { name: 'Bob' })           // → "Welcome, Bob!"
$t('welcome', {})                        // → "Welcome, Guest!"
```

### Modifiers

Transform values before display:

#### Number

```json
{
  "population": "Population: {{count:number;}}"
}
```

```javascript
$t('population', { count: 1000000 })
// → "Population: 1,000,000"
```

#### Date

```json
{
  "published": "Published: {{date:date;}}"
}
```

```javascript
$t('published', { date: new Date() })
// → "Published: Jan 15, 2024"
```

#### Ago (Relative Time)

```json
{
  "updated": "Updated {{time:ago;}}"
}
```

```javascript
$t('updated', { time: Date.now() - 3600000 })
// → "Updated 1 hour ago"
```

#### Currency

```json
{
  "price": "Price: {{amount:currency;}}"
}
```

```javascript
$t('price', { amount: 99.99 }, { currency: 'USD' })
// → "Price: $99.99"
```

### Conditionals

Show different text based on values:

#### Simple Conditions

```json
{
  "items": "You have {{count}} {{count; 1:item; default:items;}}."
}
```

```javascript
$t('items', { count: 1 })                // → "You have 1 item."
$t('items', { count: 5 })                // → "You have 5 items."
```

#### Comparison Operators

Available: `eq`, `ne`, `lt`, `lte`, `gt`, `gte`

```json
{
  "stock": "{{count:gt; 0:In stock ({{count}}); default:Out of stock;}}",
  "age": "{{age:gte; 18:Adult; default:Minor;}}",
  "status": "{{value:eq; active:✓ Active; inactive:✗ Inactive; default:Unknown;}}"
}
```

```javascript
$t('stock', { count: 5 })                // → "In stock (5)"
$t('stock', { count: 0 })                // → "Out of stock"
$t('age', { age: 25 })                   // → "Adult"
$t('age', { age: 15 })                   // → "Minor"
```

### Nested Placeholders

Combine placeholders and modifiers:

```json
{
  "notification": "You have {{count:gt; 0:{{count}} new {{count; 1:message; default:messages;}}!; default:no messages.;}}"
}
```

```javascript
$t('notification', { count: 1 })
// → "You have 1 new message!"

$t('notification', { count: 5 })
// → "You have 5 new messages!"

$t('notification', { count: 0 })
// → "You have no messages."
```

**📖 Complete syntax guide:** [parser-default documentation](https://github.com/sveltekit-i18n/parsers/tree/master/parser-default#readme)

## TypeScript

Full TypeScript support with complete type definitions:

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
  parserOptions: {
    modifierDefaults: {
      number: {
        minimumFractionDigits: 2,
      },
    },
  },
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);
```

**What's Included:**
- ✅ Type definitions for all configuration options
- ✅ Typed API methods and stores
- ✅ Generic types for custom parsers
- ❌ Automatic inference of translation keys (not built-in)

### Type-Safe Translations (Custom Pattern)

The library doesn't automatically infer translation keys from JSON files, but you can implement your own type-safe pattern:

```typescript
// translations.d.ts - Define your translation key types
export interface TranslationParams {
  'common.greeting': { name: string };
  'common.items': { count: number };
  'home.title': never;  // No parameters
}

// translations.ts - Create typed wrapper (optional)
import i18n, { type Config } from 'sveltekit-i18n';

const config: Config = {
  // ... configuration
};

export const { t, locale, locales, loading, loadTranslations } = new i18n(config);

// For stricter typing, you can create a wrapper:
// export function typedT<K extends keyof TranslationParams>(
//   key: K,
//   ...params: TranslationParams[K] extends never ? [] : [TranslationParams[K]]
// ): string {
//   return t.get(key, ...(params as any));
// }
```

This pattern provides compile-time checking but requires manual maintenance of the `TranslationParams` interface.

## See Also

### Documentation

- **[Getting Started](./GETTING_STARTED.md)** – Step-by-step tutorial
- **[Architecture Overview](./ARCHITECTURE.md)** – How everything works
- **[Best Practices](./BEST_PRACTICES.md)** – Recommended patterns
- **[Troubleshooting](./TROUBLESHOOTING.md)** – Common issues and solutions

### Related Packages

- **[@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base)** – Core functionality (for custom parsers)
- **[@sveltekit-i18n/parser-default](https://github.com/sveltekit-i18n/parsers/tree/master/parser-default)** – Default parser (included)
- **[@sveltekit-i18n/parser-icu](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu)** – ICU message format parser
- **[Parsers Overview](https://github.com/sveltekit-i18n/parsers)** – All available parsers

### Examples

- **[Multi-page App](../examples/multi-page)** – Most common setup
- **[Locale Routing](../examples/locale-router)** – SEO-friendly URLs
- **[All Examples](../examples)** – Complete list with live demos
