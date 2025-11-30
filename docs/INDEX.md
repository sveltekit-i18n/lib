# Documentation Index

Complete documentation for the `sveltekit-i18n` ecosystem. Whether you're just getting started or need detailed API references, you'll find everything here.

## 🚀 Getting Started

New to sveltekit-i18n? Start here:

### [Getting Started Guide](./GETTING_STARTED.md)
**Time to complete: 15 minutes**

Step-by-step tutorial that walks you through:
- Installing the library
- Creating your first translations
- Loading translations in your app
- Using translations in components
- Switching between languages

Perfect for: First-time users, quick setup

---

## 📚 Core Documentation

### [Architecture Overview](./ARCHITECTURE.md)
**Understanding how everything works**

Learn about:
- Package relationships (base, lib, parsers)
- Data flow (configuration → loading → translation)
- Loading strategies (route-based, SSR/CSR)
- When to use each package
- Performance considerations

Perfect for: Understanding internals, making architecture decisions

### [API Documentation](./README.md)
**Complete reference for sveltekit-i18n**

Includes:
- All configuration options with examples
- Parser options (modifierDefaults, customModifiers)
- Instance properties and methods ($t, $locale, etc.)
- Message format syntax
- TypeScript usage

Perfect for: Day-to-day development, looking up specific APIs

### [@sveltekit-i18n/base API Documentation](https://github.com/sveltekit-i18n/base/tree/master/docs/README.md)
**API reference for base package**

Detailed documentation for:
- Core configuration options
- Loaders (local files, APIs, databases)
- Preprocessing strategies
- All stores and methods
- Advanced use cases

Perfect for: Using base package with custom parsers

---

## ✨ Best Practices

### [Best Practices Guide](./BEST_PRACTICES.md)
**Recommended patterns for production apps**

Covers:
- **Organization** – File structure, naming conventions
- **Performance** – Lazy loading, caching, bundle optimization
- **TypeScript** – Typed configuration, custom type-safe patterns
- **SSR/CSR** – Server-side rendering considerations
- **Component-scoped** – Isolated translation contexts
- **Dynamic routes** – Locale-based routing patterns
- **Content management** – CMS and database integration
- **Testing** – Mocking translations, test strategies
- **Production** – Deployment, monitoring, error handling

Perfect for: Building production applications, scaling your i18n implementation

---

## 🔧 Troubleshooting

### [Troubleshooting & FAQ](./TROUBLESHOOTING.md)
**Solutions to common problems**

Includes:
- **Common Issues** with step-by-step solutions:
  - Translations not loading
  - Keys displayed instead of values
  - Flashing content (FOUC)
  - Route-based loading problems
  - Locale not changing
  - TypeScript errors
  - SSR errors
  - Performance issues
- **Debugging tips** – Inspect stores, test loaders, enable logging
- **FAQ** – 15+ frequently asked questions
- **Known limitations** – What to be aware of

Perfect for: Fixing issues, understanding limitations

---

## 🎨 Parser Documentation

### [Parsers Overview](https://github.com/sveltekit-i18n/parsers)
**Available parsers and creating custom ones**

Learn about:
- Choosing between parsers
- Parser comparison
- Creating custom parsers
- Parser integration with base

### [@sveltekit-i18n/parser-default](https://github.com/sveltekit-i18n/parsers/tree/master/parser-default)
**Default parser with placeholders and modifiers**

Features:
- Simple placeholder syntax: `{{name}}`
- Built-in modifiers: number, date, currency, ago
- Conditionals: `{{count; 1:item; default:items;}}`
- Comparison operators: eq, ne, lt, gt, lte, gte
- Custom modifiers
- No external dependencies

### [@sveltekit-i18n/parser-icu](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu)
**ICU message format parser**

Features:
- Industry-standard ICU syntax
- Advanced pluralization
- Select format (gender, etc.)
- Number/date/time formatting
- Comprehensive Intl support

---

## 💡 Examples

### [All Examples](../examples)
**Working code you can learn from**

Browse examples by use case:

#### Basic Examples
- **[Single Load](../examples/single-load)** – Load all translations at once
- **[One Page](../examples/one-page)** – Simple one-page app
- **[Multi Page](../examples/multi-page)** – Multiple routes (most common)

#### Routing Examples
- **[Locale Parameter](../examples/locale-param)** – URL parameter (`?lang=en`)
- **[Locale Router](../examples/locale-router)** – Path-based (`/en/about`)
- **[Locale Router Advanced](../examples/locale-router-advanced)** – Default locale without prefix
- **[Locale Router Static](../examples/locale-router-static)** – Static adapter optimized

#### Advanced Examples
- **[Component Scoped CSR](../examples/component-scoped-csr)** – Client-side component translations
- **[Component Scoped SSR](../examples/component-scoped-ssr)** – Server-side component translations
- **[Fallback Locale](../examples/fallback-locale)** – Handling missing translations

#### Parser Examples
- **[Parser Default](../examples/parser-default)** – Default parser features
- **[Parser ICU](../examples/parser-icu)** – ICU message format

#### Configuration Examples
- **[Loaders](../examples/loaders)** – Different loader configurations
- **[Preprocess](../examples/preprocess)** – Preprocessing strategies

Each example includes:
- Complete working code
- Live demo on Netlify
- README with explanations

---

## 📦 Package Documentation

### Main Library
- **[sveltekit-i18n](../../README.md)** – Main library README
- **[Changelog](https://github.com/sveltekit-i18n/lib/releases)** – Version history

### Core Package
- **[@sveltekit-i18n/base](../../../base/README.md)** – Base package README
- **[Base Changelog](https://github.com/sveltekit-i18n/base/releases)** – Version history

### Parsers
- **[Parsers](../../../parsers/README.md)** – Parsers overview
- **[parser-default](../../../parsers/parser-default/README.md)** – Default parser
- **[parser-icu](../../../parsers/parser-icu/README.md)** – ICU parser
- **[Parser Changelogs](https://github.com/sveltekit-i18n/parsers/releases)** – Version history

---

## 🎯 Quick Links by Task

### I want to...

#### Learn the basics
→ [Getting Started Guide](./GETTING_STARTED.md)

#### Understand how it works
→ [Architecture Overview](./ARCHITECTURE.md)

#### Look up an API
→ [API Documentation](./README.md) or [Base API Documentation](https://github.com/sveltekit-i18n/base/tree/master/docs/README.md)

#### Build a production app
→ [Best Practices Guide](./BEST_PRACTICES.md)

#### Fix an issue
→ [Troubleshooting Guide](./TROUBLESHOOTING.md)

#### See working code
→ [Examples](../examples)

#### Use a different parser
→ [Parsers Overview](https://github.com/sveltekit-i18n/parsers)

#### Create locale-based URLs
→ [Locale Router Example](../examples/locale-router) or [Best Practices: Dynamic Routes](./BEST_PRACTICES.md#dynamic-routes-and-locales)

#### Optimize performance
→ [Best Practices: Performance](./BEST_PRACTICES.md#performance-optimization) or [Architecture: Performance](./ARCHITECTURE.md#performance-considerations)

#### Add TypeScript
→ [Best Practices: TypeScript](./BEST_PRACTICES.md#typescript-patterns) or [API Docs: TypeScript](./README.md#typescript)

#### Load from API/database
→ [Best Practices: Content Management](./BEST_PRACTICES.md#content-management) or [Base API: Loaders](https://github.com/sveltekit-i18n/base/tree/master/docs/README.md#loader-required)

#### Test my translations
→ [Best Practices: Testing](./BEST_PRACTICES.md#testing)

#### Deploy to production
→ [Best Practices: Production](./BEST_PRACTICES.md#production-deployment)

---

## 📖 Reading Order

### For Beginners
1. [Getting Started Guide](./GETTING_STARTED.md) – Learn by building
2. [Examples](../examples) – See more use cases
3. [Best Practices](./BEST_PRACTICES.md) – Level up your implementation

### For Advanced Users
1. [Architecture Overview](./ARCHITECTURE.md) – Understand the system
2. [Base API Documentation](https://github.com/sveltekit-i18n/base/tree/master/docs/README.md) – Deep dive into APIs
3. [Parsers](https://github.com/sveltekit-i18n/parsers) – Custom message formats

### For Troubleshooting
1. [Troubleshooting Guide](./TROUBLESHOOTING.md) – Find your issue
2. [FAQ](./TROUBLESHOOTING.md#frequently-asked-questions) – Common questions
3. [GitHub Issues](https://github.com/sveltekit-i18n/lib/issues) – Get help

---

## 🤝 Contributing

Interested in contributing to sveltekit-i18n?

- **[GitHub Repository](https://github.com/sveltekit-i18n/lib)** – Main library
- **[Issues](https://github.com/sveltekit-i18n/lib/issues)** – Report bugs, request features
- **[Discussions](https://github.com/sveltekit-i18n/lib/discussions)** – Ask questions, share ideas

**Note:** We're currently looking for maintainers. If you're interested in helping maintain this project, please see [this issue](https://github.com/sveltekit-i18n/lib/issues/197).

---

## 📄 License

MIT License – See individual repositories for details.

---

**Can't find what you're looking for?** Check the [Troubleshooting Guide](./TROUBLESHOOTING.md#getting-help) for how to get help.

