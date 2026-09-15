# Contributing to sveltekit-i18n

Thank you for your interest in contributing to `sveltekit-i18n`! We welcome contributions from the community.

## Table of Contents

- [Ecosystem Overview](#ecosystem-overview)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Git Workflow](#git-workflow)
- [Commit Guidelines](#commit-guidelines)
- [Making Changes](#making-changes)
- [Testing](#testing)
- [Pull Request Process](#pull-request-process)
- [Code Standards](#code-standards)
- [Architecture Overview](#architecture-overview)
- [Related Repositories](#related-repositories)
- [Release Process](#release-process-maintainers-only)
- [Getting Help](#getting-help)

## Ecosystem Overview

The `sveltekit-i18n` ecosystem consists of four separate repositories:

- **[sveltekit-i18n/lib](https://github.com/sveltekit-i18n/lib)** (this repository) – the end-user package `sveltekit-i18n`: the core wired with `@sveltekit-i18n/parser-curly`, re-exporting both surfaces so an application installs one package
- **[@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base)** – the parser-agnostic core: translation state, loading, caching, route matching and preprocessing
- **[@sveltekit-i18n/parsers](https://github.com/sveltekit-i18n/parsers)** – the message parsers, `parser-curly` (the one this package wires) and `parser-icu`
- **[@sveltekit-i18n/extensions](https://github.com/sveltekit-i18n/extensions)** – official extensions for the core's `config.extensions` pipe, such as `extension-stores`, which brings back the Svelte-store surface of v2 (`$t`, `$locale`, `$loading`)

This repository is what most users install, and it hosts the **shared issue tracker, documentation and examples for the whole family** – issues for `base`, `parsers` and `extensions` are filed here too. Behavioural changes, however, usually belong in the repository that owns the behaviour: this package is thin wiring (see [Architecture Overview](#architecture-overview)).

The **Curly Message Format** – the `{{ … }}` syntax `parser-curly` resolves – is specified outside this organization, at [curlymessage.dev](https://curlymessage.dev). Grammar questions and syntax proposals belong there, not in this tracker.

### Current state

- **`master` is the v3 development line.** Svelte 5 runes, ESM-only, Node 22 / Bun 1.2 / Deno 2 or newer.
- **`2.x` is a frozen snapshot** of the published v2 line and receives critical fixes only.
- The family releases aligned: `base`, `parsers` and `extensions` first, `lib` last. Nothing publishes until all of them are ready.

## Repository Structure

```
lib/
├── .github/
│   ├── ISSUE_TEMPLATE/   # bug report, feature request, documentation
│   └── workflows/        # tests.yml (CI matrix), publish.yml (release)
├── docs/                 # user documentation
│   ├── INDEX.md
│   ├── GETTING_STARTED.md
│   ├── ARCHITECTURE.md
│   ├── README.md         # API reference
│   ├── BEST_PRACTICES.md
│   └── TROUBLESHOOTING.md
├── examples/             # standalone SvelteKit example apps (pnpm workspace)
├── src/
│   ├── index.ts          # entry - the I18n facade that wires the parser into the core
│   ├── types.ts          # this package's `Config` (the core's, minus `parser`)
│   └── utils.ts          # the `sveltekit-i18n/utils` subpath
├── tests/
│   ├── data/             # CONFIG + JSON fixtures
│   └── specs/            # index.spec.ts, exports.spec.ts, types.spec.ts
├── dist/                 # build output, generated (git-ignored)
├── AGENTS.md             # rules for LLM coding assistants (CLAUDE.md imports it)
├── eslint.config.js      # ESLint 10 flat config
├── tsup.config.js        # build
├── vitest.config.ts      # test runner
├── tsconfig.json
├── package.json
└── pnpm-lock.yaml
```

## Getting Started

### Prerequisites

- **Node.js 22+** (`.nvmrc` pins 22; CI runs 22 and 24 on Linux, macOS and Windows, plus the suite on Bun and on Deno)
- **pnpm 10** – the lockfile is `pnpm-lock.yaml`; npm and yarn are not supported here
- Git

The repository is **ESM-only**. There is no CommonJS build and no CommonJS test setup.

### Setup

```bash
# Clone the repository
git clone https://github.com/sveltekit-i18n/lib.git
cd lib

# Install dependencies (also installs the git hooks via `prepare`)
pnpm install
```

### Development Commands

| Command | Purpose |
|---------|---------|
| `pnpm run dev` | `tsup` build in watch mode |
| `pnpm run build` | build `dist/` with `tsup` (ESM + `.d.ts`) |
| `pnpm test` | the Vitest suite; `pretest` builds and typechecks first |
| `pnpm run typecheck` | `tsc --noEmit` over `src`, `tests` and the root configs |
| `pnpm run lint` | `eslint --fix .` (also the pre-commit hook, via `simple-git-hooks`) |

## Git Workflow

We use a **rebase-based workflow** to maintain a linear, clean git history.

### Branch Strategy

- `master` – Stable, production-ready code
- Use descriptive branch names for your work

### Workflow

```bash
# Create a feature branch (use any descriptive name)
git checkout -b my-descriptive-branch-name

# Make changes and commit atomically
git add .
git commit -m "fix: correct the loader match"

# Keep your branch updated (rebase, NOT merge)
git fetch origin
git rebase origin/master

# Push (use force-with-lease after rebase)
git push origin my-descriptive-branch-name --force-with-lease
```

### Important Guidelines

- **Use rebase**, not merge commits
- **Keep linear history** – no merge commits in the history
- **Force-push with `--force-with-lease`** (safer than `--force`)
- Rebase your branch on `master` before creating a PR

## Commit Guidelines

### Atomic Commits

Each commit must be **self-contained and meaningful**:

- ✅ Works independently (can be cherry-picked)
- ✅ Has a single, clear purpose
- ✅ Passes tests on its own
- ✅ Has a descriptive commit message

### Commit Message Format

Commits follow the conventional `type(scope): summary` form – the release workflow generates the release notes from them:

```
type(scope): brief description in imperative mood (max 72 characters)

Optional longer explanation if needed. Explain WHAT and WHY,
not HOW (the code shows how).

Reference related issues if applicable:
Fixes #123
Relates to #456
```

Common types: `feat`, `fix`, `docs`, `test`, `refactor`, `chore`, `ci`. A breaking change is marked with `!` after the type (`feat!:`).

### Good Commit Examples

```
feat: compose the runes core with parser-curly
fix(config): keep the parser through a reconfiguration
docs: document the extensions pipe
test: cover the re-export surface
chore(deps): bump vitest to 4
```

### Bad Commit Examples

```
WIP
fixes
Update stuff
Changed some files
lots of changes
```

## Making Changes

### Code Changes

- All source code is in `src/` – three small files, because this package is wiring. A change to how translations load, cache or interpolate almost always belongs in [`base`](https://github.com/sveltekit-i18n/base) or [`parsers`](https://github.com/sveltekit-i18n/parsers) instead.
- TypeScript strict mode is enforced
- ESLint runs automatically on commit (pre-commit hook)
- Keep the parser-less `Config` and the re-export surface intact – both are covered by tests

### Documentation Changes

- User documentation is in `docs/`; the package front page is `README.md`
- All code comments and documentation must be in **English**
- Update the documentation in the **same PR** that invalidates it
- Add examples for new features

If you drive changes with an LLM coding assistant, `AGENTS.md` (imported by `CLAUDE.md`) is the authority for it and takes precedence over the assistant's own memory.

### Adding Examples

- Examples are in `examples/`, each a standalone SvelteKit application with its own toolchain, consuming the package through `workspace:*`
- Include a README explaining the use case and how it works
- ESLint ignores `examples/` – each example lints under its own config

## Testing

### Running Tests

```bash
# Build, typecheck, then run the whole suite
pnpm test

# Narrow the run to matching spec files
pnpm test exports

# Watch mode (build `dist/` first - see below)
pnpm exec vitest

# Typecheck `src` and `tests` - how `types.spec.ts` makes its assertions
pnpm run typecheck
```

`pnpm test` runs `pretest` first, which builds and typechecks. Both matter: `tests/specs/exports.spec.ts` reads the **built declarations** in `dist/`, and `tests/specs/types.spec.ts` asserts by compiling. A bare `vitest` run skips that step, so build once before using watch mode.

### What this suite is responsible for

The suite proves **the wiring this package adds** – nothing more:

- **The parser is present without the consumer supplying one.** `new I18n(config)` interpolates out of the box, and the core's `parser` slot is a type error here.
- **`parserOptions` flow through** the constructor and through `loadConfig`, and a reconfiguration that names no parser options keeps the parser.
- **The report channel** is silent by default and routes to `parserOptions.onReport` when the application passes one.
- **The extension pipe** runs the consumer's extensions over a configured instance whose `loadConfig` already carries the parser.
- **The re-export surface** (`tests/specs/exports.spec.ts`) – every name the core publishes must be reachable from here, with the core's `Config` and `Parser` namespaces carried as `BaseConfig` and `BaseParser`. A new export in the core fails this test until this package carries it; extend the rename map in that spec rather than letting the surface drift.
- **The typing** (`tests/specs/types.spec.ts`) – the assertion *is* the compilation. Its closures are never invoked; a `@ts-expect-error` that stops being an error fails the run.

It deliberately does **not**:

- re-test the core's behaviour – loading, caching, route matching, preprocessing and reactivity are covered by [`base`'s own suite](https://github.com/sveltekit-i18n/base)
- test the Curly Message Format's grammar – the format's conformance set covers that, inside [`parser-curly`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly)

A fix for either of those belongs in that repository, together with its test.

### Writing Tests

- Place tests in `tests/specs/`, test data and fixtures in `tests/data/`
- Use **Vitest** with TypeScript – import `describe`, `it` and `expect` from `vitest`
- Drive behaviour through the public API: `new I18n(config)`, reactive properties, awaited method returns
- A real instance is cheap. Inline `config.translations` need no loader, so there is nothing to await and nothing to mock
- Where a test does need a load, await the method that started it – never a wall-clock sleep. The CI matrix has six legs and timing-based tests flake on the slow ones

The test setup needs `@sveltejs/vite-plugin-svelte` **and** the core inlined (`test.server.deps.inline` in `vitest.config.ts`): the core ships its rune modules uncompiled for the consumer's bundler, and an externalized dependency never reaches the plugin.

### Test Structure

```typescript
import { describe, expect, it } from 'vitest';
import { I18n } from '../../src';

describe('parser wiring', () => {
  it('interpolates without the consumer supplying a parser', () => {
    // Arrange - inline translations need no loader, so nothing is awaited
    const i18n = new I18n({
      initLocale: 'en',
      translations: { en: { greeting: 'Hello, {{name}}!' } },
    });

    // Act - execute the code
    const greeting = i18n.t('greeting', { name: 'Jarda' });

    // Assert - verify the result
    expect(greeting).toBe('Hello, Jarda!');
  });
});
```

## Pull Request Process

### Before Creating a PR

1. **Rebase on latest master:** `git rebase origin/master`
2. **Run tests:** `pnpm test` (all tests must pass)
3. **Run linter:** `pnpm run lint` (no errors)
4. **Build successfully:** `pnpm run build`
5. **Update documentation** if you changed APIs

### PR Title

- Descriptive and concise
- Use imperative mood: "Add feature" not "Added feature"
- Examples: "Add locale switching support", "Fix memory leak in loader cache"

### PR Description Template

```markdown
## What
Brief description of the changes made.

## Why
Explanation of why this change is needed. Link to related issues.

## How
How you implemented it (if the approach is complex or non-obvious).

## Testing
How you tested the changes. Include test scenarios.

## Checklist
- [ ] Tests pass locally
- [ ] Linter passes
- [ ] Documentation updated (if needed)
- [ ] All commits are atomic and well-described
- [ ] Branch rebased on latest master
```

### Review Process

1. A maintainer will review your PR
2. Feedback may be requested – discussion is encouraged
3. Make requested changes in new commits
4. Once approved, maintainer will merge using rebase

### Updating Your PR

```bash
# Make requested changes
git add .
git commit -m "fix: address review feedback"

# Rebase and clean up commits if needed
git rebase -i origin/master

# Force push with updated commits
git push origin my-branch-name --force-with-lease
```

## Code Standards

### TypeScript

- **Strict mode enabled** – all strict checks enforced
- **Proper type definitions** for all exports
- Use `const` assertions where appropriate
- Leverage TypeScript's inference when possible
- `any` is not banned outright: the core types translation values and loader payloads as `any`, and this package passes them through, so the `no-explicit-any` and `no-unsafe-*` rules are off. Don't reach for it where a real type exists – the async correctness rules (`no-floating-promises`, `no-misused-promises`, `require-await`) stay on.

### ESLint

- **ESLint 10 flat config** (`eslint.config.js`): typescript-eslint type-checked, `@stylistic` for formatting, and `import-x/no-extraneous-dependencies` – the core and `parser-curly` are the only runtime dependencies, so any other bare import reachable from `src/` is a bug
- Formatting contract: 2-space indent, single quotes, semicolons, trailing commas, no trailing whitespace, no double blank lines. Let `pnpm run lint` apply it rather than formatting by hand
- Auto-fixes run on commit (pre-commit hook, installed by `pnpm install` through `simple-git-hooks`)
- Don't disable rules without good reason (and explanation)

### Code Comments

- **English only** – all comments and documentation in English
- Use JSDoc for public APIs
- Explain **WHY**, not WHAT (code shows what)
- Add comments for non-obvious logic

**Example:**

```typescript
// ✅ Good - explains why
// Null prototype: the table is indexed by user-supplied locales, and a plain
// object would resolve a '__proto__' assignment through the setter.
const loadedKeys = Object.create(null);

// ❌ Bad - just describes what code does
// Create an object without a prototype
const loadedKeys = Object.create(null);
```

## Architecture Overview

For developers working on the codebase, here's a brief technical overview.

### Package Structure

This package composes `@sveltekit-i18n/base` with `@sveltekit-i18n/parser-curly` – it does **not** extend a class:

```typescript
// src/index.ts, abridged
import { I18n as Base } from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-curly';

const withParser = ({ parserOptions, ...config }: Config<any, any> = {}) => ({
  ...config,
  parser: parser({ onReport: null, ...parserOptions }),
});

// Prepended to the consumer's pipe, so a reconfiguration keeps the parser.
const withCurlyParser: Extension.T<Base, Base> = (i18n) => {
  const { loadConfig } = i18n;

  i18n.loadConfig = (config: Config<any, any>) => loadConfig(withParser(config));

  return i18n;
};

class I18nCurlyParser {
  constructor(config?: Config<any, any>) {
    return new Base({
      ...withParser(config),
      extensions: [withCurlyParser, ...(config?.extensions ?? [])],
    });
  }
}
```

What that means when you change something here:

- **Composition, not inheritance.** The core exports a typed facade rather than the raw class, so there is nothing to subclass. The constructor returns the core's own instance – every member a consumer touches is the core's. Never wrap the instance or re-implement one of its methods.
- **The parser is injected by an extension prepended to the consumer's pipe.** It patches `loadConfig` so a reconfiguration keeps the parser, and it runs first so every later extension copies the patched method. It returns its input, so it contributes nothing to the piped type.
- **`loadConfig` is retyped by intersection, never by an `Omit` rewrite.** The emitted instance type carries `#private` fields; an `Omit`-based rewrite stops being assignable to the core instance and every `Extension.Operator` extension then resolves its input to `never`.
- **Reports are silent by default.** `parser-curly` requires `onReport` to be stated, `null` included; this package states `null` and relaxes the key to optional in its own `Config`, so an application only passes `parserOptions.onReport` when it wants diagnostics.
- **`i18n instanceof I18n` does not hold.** The constructor returns the core's instance, and `config.extensions` may replace it again. Documented, not fixed.

### Key Concepts

- **Loaders** – define how and when translations load
- **Routes** – match loaders to specific routes
- **Parser** – handles message interpolation, and nothing else
- **Preprocessing** – transforms translation data after loading
- **Extensions** – a construction-time pipe that can augment or replace the instance surface
- **Runes, not stores** – the instance is one reactive object; the v2 store surface lives in `@sveltekit-i18n/extension-stores`

### For Detailed Architecture

See the [Architecture Documentation](./docs/ARCHITECTURE.md), the [API reference](./docs/README.md), and the [base API documentation](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md) for the members this package re-exports.

## Related Repositories

### Contributing to Other Parts of the Ecosystem

**Core functionality (@sveltekit-i18n/base):**
- Repository: https://github.com/sveltekit-i18n/base
- Contribute here for: translation state, loading and caching, route matching, preprocessing, the extension pipe, typing of the instance

**Parsers (@sveltekit-i18n/parsers):**
- Repository: https://github.com/sveltekit-i18n/parsers
- Contribute here for: `parser-curly` and `parser-icu` – modifier logic, parser options, diagnostics
- The Curly Message Format itself is specified at https://curlymessage.dev – syntax changes start there

**Extensions (@sveltekit-i18n/extensions):**
- Repository: https://github.com/sveltekit-i18n/extensions
- Contribute here for: `extension-stores` and other official extensions of the `config.extensions` pipe

Each repository has its own code and CI; issues and discussions for all of them live in [this repository's tracker](https://github.com/sveltekit-i18n/lib/issues).

## Release Process (Maintainers Only)

This section is for maintainers with publish access.

Releases run from CI, not from a maintainer's machine. Trigger the **NPM Publish** workflow (`.github/workflows/publish.yml`) with the version choice – `next`, `patch`, `minor` or `major`. It:

1. runs the full test matrix,
2. bumps the version with `pnpm version` (a `next` bump can only reach the `next` dist-tag; only a released version moves `latest`),
3. pushes the release commit and the tag atomically,
4. publishes to npm through trusted publishing (OIDC with provenance – no token), and
5. creates the GitHub release with notes generated from the commit history.

Because the notes are generated, commit messages are the changelog – see [Commit Guidelines](#commit-guidelines).

### Version Alignment

`base`, `parsers` and `extensions` release aligned on the same major; `lib` publishes **last**, once the versions it depends on are on the registry. Follow [Semantic Versioning](https://semver.org/).

## Getting Help

### Questions

- **GitHub Discussions:** https://github.com/sveltekit-i18n/lib/discussions
- **Issues:** https://github.com/sveltekit-i18n/lib/issues

### Reporting Bugs

When reporting a bug, include:

- `sveltekit-i18n` version
- `SvelteKit` and `Svelte` versions
- Node.js version
- Minimal reproduction (CodeSandbox, StackBlitz, or GitHub repo)
- Expected behavior vs. actual behavior
- Error messages and stack traces

### Feature Requests

When requesting a feature, include:

- **Use case description** – What are you trying to achieve?
- **Proposed API** (if you have ideas)
- **Why current features don't work** – Have you tried existing approaches?
- **Alternatives considered** – What other solutions did you consider?

### Discussions

For general questions, ideas, or showcasing what you've built, use [GitHub Discussions](https://github.com/sveltekit-i18n/lib/discussions).

## Maintainer Opportunity

We're actively looking for maintainers to help with:

- Reviewing pull requests
- Triaging issues
- Maintaining documentation
- Planning future direction

If you're interested:

1. Make consistent, quality contributions
2. Demonstrate understanding of the codebase and architecture
3. Open a [discussion](https://github.com/sveltekit-i18n/lib/discussions) to
   express your interest

---

Thank you for contributing to `sveltekit-i18n`! Your efforts help make internationalization easier for the SvelteKit community. 🌍
