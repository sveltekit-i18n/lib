# Contributing to sveltekit-i18n

Thank you for your interest in contributing to `sveltekit-i18n`! We welcome contributions from the community.

> **Note:** We're currently looking for maintainers to help with the project. If you're interested, please see [this issue](https://github.com/sveltekit-i18n/lib/issues/197).

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
- [Release Process](#release-process-maintainers-only)
- [Getting Help](#getting-help)

## Ecosystem Overview

The `sveltekit-i18n` ecosystem consists of three separate repositories:

- **[sveltekit-i18n/lib](https://github.com/sveltekit-i18n/lib)** (this repository) – Main user-facing package that combines base with default parser
- **[@sveltekit-i18n/base](https://github.com/sveltekit-i18n/base)** – Core i18n functionality with parser support
- **[@sveltekit-i18n/parsers](https://github.com/sveltekit-i18n/parsers)** – Message parsers (parser-default, parser-icu)

This repository (`lib`) is what most users install and is the main entry point for contributions.

## Repository Structure

```
lib/
├── src/              # Source code (TypeScript)
│   ├── index.ts      # Main entry point
│   └── types.ts      # Type definitions
├── tests/            # Test files (Jest)
│   ├── specs/        # Test specifications
│   └── data/         # Test data and fixtures
├── examples/         # Working SvelteKit example apps
├── docs/             # User documentation
│   ├── INDEX.md
│   ├── GETTING_STARTED.md
│   ├── ARCHITECTURE.md
│   ├── BEST_PRACTICES.md
│   └── TROUBLESHOOTING.md
├── dist/             # Built files (git-ignored)
└── package.json
```

## Getting Started

### Prerequisites

- Node.js 18+ (or current LTS version)
- npm or pnpm
- Git

### Setup

```bash
# Clone the repository
git clone https://github.com/sveltekit-i18n/lib.git
cd lib

# Install dependencies
npm install
```

### Development Commands

```bash
npm run dev      # Watch mode with auto-rebuild
npm run build    # Production build
npm test         # Run tests
npm run lint     # Check code style (runs automatically on commit)
```

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
git commit -m "Add feature X"

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

```
Brief description in imperative mood (max 72 characters)

Optional longer explanation if needed. Explain WHAT and WHY,
not HOW (the code shows how).

Reference related issues if applicable:
Fixes #123
Relates to #456
```

### Good Commit Examples

```
Add locale switcher component
Fix translation loading race condition
Update API docs with TypeScript examples
Refactor loader matching logic for clarity
Add tests for route-based translation loading
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

- All source code is in `src/`
- TypeScript strict mode is enforced
- ESLint runs automatically on commit (pre-commit hook)
- **No `any` types** – use proper typing or `unknown` if necessary

### Documentation Changes

- User documentation is in `docs/`
- All code comments must be in **English**
- Update relevant documentation when changing APIs
- Add examples for new features

### Adding Examples

- Examples are in `examples/`
- Each example should be a complete, working SvelteKit application
- Include a README explaining the use case and how it works

## Testing

### Running Tests

```bash
# Run all tests
npm test

# Watch mode
npm test -- --watch

# Run specific test file
npm test -- path/to/test.spec.ts
```

### Writing Tests

- Place tests in `tests/specs/`
- Test data and fixtures in `tests/data/`
- Use Jest with TypeScript
- Test both functionality and TypeScript types
- Aim for high coverage on core functionality

### Test Structure

```typescript
describe('feature name', () => {
  it('should do something specific', () => {
    // Arrange - set up test data
    const input = { locale: 'en', key: 'test' };
    
    // Act - execute the code
    const result = someFunction(input);
    
    // Assert - verify the result
    expect(result).toBe(expected);
  });
});
```

## Pull Request Process

### Before Creating a PR

1. **Rebase on latest master:** `git rebase origin/master`
2. **Run tests:** `npm test` (all tests must pass)
3. **Run linter:** `npm run lint` (no errors)
4. **Build successfully:** `npm run build`
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
git commit -m "Address review feedback"

# Rebase and clean up commits if needed
git rebase -i origin/master

# Force push with updated commits
git push origin my-branch-name --force-with-lease
```

## Code Standards

### TypeScript

- **Strict mode enabled** – all strict checks enforced
- **No `any` types** – use proper types or `unknown` if type is truly unknown
- **Proper type definitions** for all exports
- Use `const` assertions where appropriate
- Leverage TypeScript's inference when possible

### ESLint

- Airbnb TypeScript configuration
- Auto-fixes run on commit (pre-commit hook)
- Follow existing code style in the repository
- Don't disable rules without good reason (and explanation)

### Code Comments

- **English only** – all comments and documentation in English
- Use JSDoc for public APIs
- Explain **WHY**, not WHAT (code shows what)
- Add comments for non-obvious logic

**Example:**

```typescript
// ✅ Good - explains why
// Use WeakMap to avoid memory leaks when components are destroyed
const cache = new WeakMap();

// ❌ Bad - just describes what code does
// Create a new WeakMap
const cache = new WeakMap();
```

## Architecture Overview

For developers working on the codebase, here's a brief technical overview:

### Package Structure

This package extends `@sveltekit-i18n/base` and pre-configures it with `@sveltekit-i18n/parser-default`:

```typescript
import Base from '@sveltekit-i18n/base';
import parser from '@sveltekit-i18n/parser-default';

class I18n extends Base {
  constructor(config) {
    // Normalize config to include default parser
    super({
      ...config,
      parser: parser(config.parserOptions)
    });
  }
}
```

### Key Concepts

- **Loaders** – Define how and when translations load
- **Routes** – Match loaders to specific routes
- **Parser** – Handles message interpolation
- **Preprocessing** – Transforms translation data after loading

### For Detailed Architecture

See the [Architecture Documentation](./docs/ARCHITECTURE.md) for in-depth explanation of how everything works.

## Related Repositories

### Contributing to Other Parts of the Ecosystem

**Core functionality (@sveltekit-i18n/base):**
- Repository: https://github.com/sveltekit-i18n/base
- Contribute here for: Core i18n logic, store management, loader system

**Parsers (@sveltekit-i18n/parsers):**
- Repository: https://github.com/sveltekit-i18n/parsers
- Contribute here for: Parser syntax changes, new parsers, modifier logic

Each repository has its own issues and contribution guidelines.

## Release Process (Maintainers Only)

This section is for maintainers with publish access.

### Version Bump

```bash
# Patch release (bug fixes)
npm version patch

# Minor release (new features, backwards compatible)
npm version minor

# Major release (breaking changes)
npm version major
```

### Publishing

```bash
# Build the package
npm run build

# Publish to npm
npm publish

# Push tags to GitHub
git push origin master --tags
```

### Changelog

- Update `CHANGELOG.md` before releasing
- Follow [Semantic Versioning](https://semver.org/)
- Group changes by type: Features, Bug Fixes, Breaking Changes

## Getting Help

### Questions

- **GitHub Discussions:** https://github.com/sveltekit-i18n/lib/discussions
- **Issues:** https://github.com/sveltekit-i18n/lib/issues

### Reporting Bugs

When reporting a bug, include:

- `sveltekit-i18n` version
- `SvelteKit` version
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

1. Review the [maintainer opportunity issue](https://github.com/sveltekit-i18n/lib/issues/197)
2. Make consistent, quality contributions
3. Demonstrate understanding of the codebase and architecture
4. Reach out to express your interest

---

Thank you for contributing to `sveltekit-i18n`! Your efforts help make internationalization easier for the SvelteKit community. 🌍

