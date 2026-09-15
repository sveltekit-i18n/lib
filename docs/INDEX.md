# Documentation Index

Complete documentation for the `sveltekit-i18n` ecosystem, covering **v3**: one
reactive instance built on Svelte 5 runes, no stores, and the parser wired in —
`npm install sveltekit-i18n` is the whole install.

Upgrading from v2? Go straight to
[Upgrading from v2](./TROUBLESHOOTING.md#upgrading-from-v2) and the
[migration table](./README.md#migrating-from-v2).

---

## 🚀 Getting Started

New to sveltekit-i18n? Start here:

### [Getting Started Guide](./GETTING_STARTED.md)
**A SvelteKit app from nothing to multilingual, in eight steps**

- [Requirements](./GETTING_STARTED.md#requirements) and
  [installation](./GETTING_STARTED.md#installation) – Svelte 5, Node 22 / Bun 1.2 / Deno 2,
  ESM-only
- [Basic concepts](./GETTING_STARTED.md#basic-concepts) – locales, keys, loaders,
  namespaces, the instance
- [Your first multilingual app](./GETTING_STARTED.md#your-first-multilingual-app) –
  translation files, exporting the config, resolving the visitor's locale, one
  instance per request, the snapshot, Svelte context, components
- [Route-based loading](./GETTING_STARTED.md#route-based-loading) and
  [switching locales](./GETTING_STARTED.md#switching-locales)
- [Placeholders and modifiers](./GETTING_STARTED.md#placeholders-and-modifiers),
  including `parserOptions`
- [TypeScript](./GETTING_STARTED.md#typescript) and
  [testing components](./GETTING_STARTED.md#testing-components-that-translate)

Perfect for: first-time users, quick setup

---

## 📚 Core Documentation

### [Architecture Overview](./ARCHITECTURE.md)
**Understanding how everything works**

- [Package overview](./ARCHITECTURE.md#package-overview) and
  [relationships](./ARCHITECTURE.md#package-relationships) – core, parser, this
  package; composition rather than inheritance, and the parser extension
- [The reactive engine](./ARCHITECTURE.md#the-reactive-engine) – runes, and why
  the core ships its rune modules uncompiled
- [Data flow](./ARCHITECTURE.md#data-flow) – construction, loading, translation,
  locale switch
- [Loading strategy](./ARCHITECTURE.md#loading-strategy) – route matching,
  load-once, deduplication, cache and invalidation
- [Instance lifetime](./ARCHITECTURE.md#instance-lifetime) – per-request
  instances, `snapshot()`, `destroy()`
- [Core concepts](./ARCHITECTURE.md#core-concepts),
  [when to use each package](./ARCHITECTURE.md#when-to-use-each-package),
  [performance](./ARCHITECTURE.md#performance-considerations)

Perfect for: understanding internals, making architecture decisions

### [API Documentation](./README.md)
**Complete reference for `sveltekit-i18n`**

- [Installation and packaging](./README.md#installation-and-packaging) – ESM-only,
  one install, bundler requirements
- [Configuration](./README.md#configuration) – `loaders`, `translations`,
  `initLocale`, `fallbackLocale`, `fallbackValue`, `preprocess`,
  `sanitizeLocales`, `cache`, `log`, `schema`, `extensions`
- [Parser options](./README.md#parser-options) – `modifierDefaults`,
  `customModifiers`, `onReport`
- [The instance](./README.md#the-instance) – reactive properties, reactive
  functions, promise-returning methods, synchronous methods
- [Message format](./README.md#message-format),
  [exported types](./README.md#exported-types),
  [utilities](./README.md#utilities)
- [TypeScript](./README.md#typescript), [extensions](./README.md#extensions),
  [SSR](./README.md#server-side-rendering),
  [testing](./README.md#testing-components-that-translate)
- [Migrating from v2](./README.md#migrating-from-v2)

Perfect for: day-to-day development, looking up specific APIs

### [@sveltekit-i18n/base API Documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md)
**The canonical reference for every member this package inherits**

- [Configuration](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#configuration)
  and [loaders](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#loaders)
- [Instance properties and methods](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#instance-properties-and-methods)
- [Server-side rendering](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#server-side-rendering)
- [The parser contract](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#the-parser-contract)
  – for building on the core with a different parser
- [TypeScript](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#typescript)

Perfect for: member-level detail, or using the core with a custom parser

---

## ✨ Best Practices

### [Best Practices Guide](./BEST_PRACTICES.md)
**Recommended patterns for production apps**

- **[Instance ownership](./BEST_PRACTICES.md#instance-ownership)** – per-request
  instances, the module-level singleton hazard, `destroy()`, why value
  properties must not be destructured
- **[Awaiting loads](./BEST_PRACTICES.md#awaiting-loads)** – await the matching
  load instead of polling `loading`
- **[SSR and CSR](./BEST_PRACTICES.md#ssr-and-csr-considerations)** – snapshot,
  hydration, no flash of untranslated content
- **[Organization](./BEST_PRACTICES.md#translation-file-organization)** and
  **[key naming](./BEST_PRACTICES.md#key-naming-conventions)**
- **[Performance](./BEST_PRACTICES.md#performance-optimization)** – lazy loading,
  preloading, `cache` and `invalidate()`
- **[TypeScript](./BEST_PRACTICES.md#typescript-patterns)** – `schema`, one
  payload type, locale completion, custom modifier props
- **[Extensions](./BEST_PRACTICES.md#extensions)** – the pipe, and getting the
  `$t` surface back
- **[Component-scoped](./BEST_PRACTICES.md#component-scoped-translations)** –
  isolated translation contexts
- **[Library authors](./BEST_PRACTICES.md#library-authors-shipping-translations)** –
  shipping translations with a package
- **[Dynamic routes](./BEST_PRACTICES.md#dynamic-routes-and-locales)** –
  locale-based routing patterns
- **[Content management](./BEST_PRACTICES.md#content-management)** – CMS, API and
  database sources
- **[Testing](./BEST_PRACTICES.md#testing)** – a real instance instead of a mock
- **[Production](./BEST_PRACTICES.md#production-deployment)** – logging, parser
  reports, loader failures, monitoring

Perfect for: building production applications, scaling your i18n implementation

---

## 🔧 Troubleshooting

### [Troubleshooting & FAQ](./TROUBLESHOOTING.md)
**Solutions to common problems**

- **[Upgrading from v2](./TROUBLESHOOTING.md#upgrading-from-v2)** – `$t` is not a
  store, destructured values that never update, the removal of `.get()` /
  `.set()` / `.subscribe()` / `toPromise()` / `getTranslationProps()`, and
  `instanceof`
- **[Setup and packaging](./TROUBLESHOOTING.md#setup-and-packaging)** –
  `$state is not defined`, two copies of the core, `ERR_REQUIRE_ESM`
- **[Common issues](./TROUBLESHOOTING.md#common-issues)** – translations not
  loading, keys instead of values, flashing content, route matching, locale not
  changing, stale translations, one visitor's locale in another's page, silent
  parser reports, TypeScript errors, tests, performance
- **[Debugging tips](./TROUBLESHOOTING.md#debugging-tips)** – inspect
  translations, enable debug logging, open the report channel, test a loader
- **[FAQ](./TROUBLESHOOTING.md#frequently-asked-questions)** – 17 common
  questions
- **[Known limitations](./TROUBLESHOOTING.md#known-limitations)** – what to be
  aware of

Perfect for: fixing issues, understanding limitations

---

## 🎨 Parser Documentation

Message interpolation lives in a parser. This package wires one; the core takes
any parser that satisfies
[base's parser contract](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#the-parser-contract).

### [@sveltekit-i18n/parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly)
**The parser wired into this package**

- Placeholders `{{name}}`, default values, nested placeholders, escaping
- Modifiers (`number`, `date`, `currency`, `ago`, …) and comparisons
- Custom modifiers, modifier defaults and the report channel — all reachable
  here through [`parserOptions`](./README.md#parser-options)
- Implements the [Curly Message Format](https://curlymessage.dev)

### [@sveltekit-i18n/parser-icu](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu)
**ICU message format**

For an application that wants ICU syntax, built on
[@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base) directly — this
package fills the `parser` slot itself and cannot take another parser.

### [Parsers Overview](https://github.com/sveltekit-i18n/parsers)
**The parser monorepo, and writing your own**

---

## 💡 Examples

### [All Examples](../examples)
**Working code you can learn from**

Eight standalone applications on v3: locale routing (URL parameter, path
prefix, static adapter, default locale unprefixed), per-request negotiation
from a cookie and `Accept-Language`, component-scoped translations rendered on
the client and seeded through `snapshot()`, and `t()` inside Markdown routes.

---

## 📦 Package Documentation

### This Package
- **[sveltekit-i18n README](../README.md)** – overview and quick start
- **[Contributing guide](../CONTRIBUTING.md)** – repository layout, workflow, tests
- **[Releases](https://github.com/sveltekit-i18n/lib/releases)** – version history

### The Family
- **[@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base)** – the core;
  state, loading, caching, route matching, preprocessing
  ([releases](https://github.com/sveltekit-i18n/base/releases))
- **[@sveltekit-i18n/parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly)**
  and **[@sveltekit-i18n/parser-icu](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu)**
  ([releases](https://github.com/sveltekit-i18n/parsers/releases))
- **[Extensions](https://github.com/sveltekit-i18n/extensions)** – official
  adapters for the `config.extensions` pipe, including
  **[@sveltekit-i18n/extension-stores](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores)**
  (the `$t` / `$locale` / `$loading` surface)
- **[Curly Message Format](https://curlymessage.dev)** – the message
  format specification

`base`, `parsers` and `extensions` release aligned at 3.0.0; `sveltekit-i18n`
last.

---

## 🎯 Quick Links by Task

### I want to...

#### Learn the basics
→ [Getting Started Guide](./GETTING_STARTED.md)

#### Upgrade an app from v2
→ [Upgrading from v2](./TROUBLESHOOTING.md#upgrading-from-v2) and the
[migration table](./README.md#migrating-from-v2)

#### Get `$t` back
→ [Best Practices: Extensions](./BEST_PRACTICES.md#extensions)

#### Understand how it works
→ [Architecture Overview](./ARCHITECTURE.md)

#### Look up an API
→ [API Documentation](./README.md) or
[base API Documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md)

#### Render on the server without leaking a visitor's locale
→ [API Docs: SSR](./README.md#server-side-rendering) or
[Best Practices: Instance Ownership](./BEST_PRACTICES.md#instance-ownership)

#### Build a production app
→ [Best Practices Guide](./BEST_PRACTICES.md)

#### Fix an issue
→ [Troubleshooting Guide](./TROUBLESHOOTING.md)

#### See working code
→ [Examples](../examples)

#### Write a custom modifier or open the report channel
→ [API Docs: Parser options](./README.md#parser-options) or
[parser-curly](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly)

#### Use a different message format
→ [Architecture: When to Use Each Package](./ARCHITECTURE.md#when-to-use-each-package)

#### Create locale-based URLs
→ [Best Practices: Dynamic Routes](./BEST_PRACTICES.md#dynamic-routes-and-locales)

#### Optimize performance
→ [Best Practices: Performance](./BEST_PRACTICES.md#performance-optimization) or
[Architecture: Performance](./ARCHITECTURE.md#performance-considerations)

#### Type my keys and payloads
→ [Best Practices: TypeScript](./BEST_PRACTICES.md#typescript-patterns) or
[API Docs: TypeScript](./README.md#typescript)

#### Load from an API or database
→ [Best Practices: Content Management](./BEST_PRACTICES.md#content-management) or
[base API: Loaders](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#loaders)

#### Test components that translate
→ [Best Practices: Testing](./BEST_PRACTICES.md#testing) or
[Getting Started: Testing](./GETTING_STARTED.md#testing-components-that-translate)

#### Deploy to production
→ [Best Practices: Production](./BEST_PRACTICES.md#production-deployment)

---

## 📖 Reading Order

### For Beginners
1. [Getting Started Guide](./GETTING_STARTED.md) – learn by building
2. [API Documentation](./README.md) – the surface, member by member
3. [Best Practices](./BEST_PRACTICES.md) – level up your implementation

### For Upgraders
1. [Upgrading from v2](./TROUBLESHOOTING.md#upgrading-from-v2) – the first-day errors
2. [Migrating from v2](./README.md#migrating-from-v2) – the old member, the new one
3. [Best Practices: Instance Ownership](./BEST_PRACTICES.md#instance-ownership) –
   what per-request instances change

### For Advanced Users
1. [Architecture Overview](./ARCHITECTURE.md) – understand the system
2. [base API Documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md) – deep dive
3. [Parsers](https://github.com/sveltekit-i18n/parsers) and
   [Extensions](https://github.com/sveltekit-i18n/extensions) – custom message
   formats and custom surfaces

### For Troubleshooting
1. [Troubleshooting Guide](./TROUBLESHOOTING.md) – find your issue
2. [FAQ](./TROUBLESHOOTING.md#frequently-asked-questions) – common questions
3. [GitHub Issues](https://github.com/sveltekit-i18n/lib/issues) – get help

---

## 🤝 Contributing

Interested in contributing to sveltekit-i18n?

- **[Contributing Guide](../CONTRIBUTING.md)** – setup, workflow, tests, PRs
- **[GitHub Repository](https://github.com/sveltekit-i18n/lib)** – main library,
  and the shared issue tracker for the whole family
- **[Issues](https://github.com/sveltekit-i18n/lib/issues)** – report bugs, request features
- **[Discussions](https://github.com/sveltekit-i18n/lib/discussions)** – ask questions, share ideas

---

## 📄 License

MIT License – See individual repositories for details.

---

**Can't find what you're looking for?** Check the
[Troubleshooting Guide](./TROUBLESHOOTING.md#getting-help) for how to get help.
