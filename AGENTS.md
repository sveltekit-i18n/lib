# AGENTS.md

Behavioral guidelines for LLM coding assistants working on **sveltekit-i18n**
(the `lib` repository). Applies to anything that drives commits, PRs, or file
edits on this repo.

**Precedence:** These repo rules override individual LLM memory or personal
preference. If your own memory conflicts with this file, follow this file.

This repo follows the same working rules as
[`base`'s AGENTS.md](https://github.com/sveltekit-i18n/base/blob/master/AGENTS.md)
(sections 1-14: think before coding, simplicity first, surgical changes,
verify and review cycle with release planning, commit on approval, fixup
hygiene, branch & push discipline, PRs, docs track code, coding conventions,
security posture, English-only artifacts, test rules, terse output, no
emojis). What follows is only what differs here.

---

## The repository

The end-user package `sveltekit-i18n`: it composes
[`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) with
[`@sveltekit-i18n/parser-curly`](https://github.com/sveltekit-i18n/parsers)
and re-exports the core's whole surface along with the parser's build-time
half, so users install a single package. It also hosts the ecosystem's shared
issue tracker, docs, and examples for the whole family
(`base` / `lib` / `parsers` / `extensions`).

## Current state: v3 released from `master`

- **`master` is the v3 line.** Stack: pnpm, Vitest, tsup, ESLint 10 flat
  config, ESM-only, Node 22 / Bun 1.2 / Deno 2 or newer, peer `svelte >=5`.
- **`2.x` is a frozen snapshot** of the published v2 line: critical fixes only.
- **The family released aligned at 3.0.0** — `base`, the parsers,
  `extension-stores` and this package — as
  [#214](https://github.com/sveltekit-i18n/lib/issues/214) set out. Each
  package moves on its own from there, so read a version off npm rather than
  off this file. The pins on `base` and `parser-curly` are exact and stay that
  way.
- **3.2 is the stable line.** `README.md` and `docs/` describe it. The site
  deploys from `master` on every push (`site.yml`). The site and the examples
  run the workspace package, so each change of behaviour the core brings lands
  in them with the bump that carries it. The examples' range, `^3.2.0`,
  links the workspace package.
- **`examples/` is on v3** — nine standalone applications, each with a real
  adapter and route tree and a shared design, pinning the published package so
  a copied-out directory installs on its own. `.github/workflows/examples.yml`
  builds all nine on any change under `examples/**` or `src/**` and asserts on
  the rendered output. They are a reference for how v3 is used, alongside
  `README.md` and `docs/`.
- **This package is released last** (base's §4, *Releases*). Its pins are
  exact, so every release of `base` or `parser-curly` means one of this
  package: plan them as one release, and never publish this package while
  either holds an unreleased change or a planned fix. `README.md` is the npm
  page and the site deploys from `master`, so both describe the version being
  published, and each of their links resolves.

## Architecture you must respect

- **Composition, not inheritance.** base v3 exports a typed facade rather than
  the raw class, so there is nothing to subclass. `new I18n(config)` builds the
  curly parser, hands the core a config carrying it, and returns the core's own
  instance — every member a consumer touches is base's. Never wrap the instance
  or re-implement one of its methods.
- **The parser is injected by an extension prepended to the consumer's pipe.**
  It patches `loadConfig` so a reconfiguration keeps the parser, and it is
  prepended so every later extension copies the patched method. It returns its
  input, so it contributes nothing to the piped type and the runtime patch
  cannot drift from the declared one.
- **`/kit` wraps base's `defineI18n`, never re-implements it.** The wrapper
  hands the core's factory a config that carries the parser and leads its
  pipe with the same prepended extension, so every instance the core builds
  per request and per tab interpolates, and a reconfiguration through one keeps
  the parser. The core resolves its server half by the `browser` condition
  from its own `imports` map; this package adds no map of its own, and tsup
  keeps base external so the consumer's bundler does that resolution.
- **`loadConfig` is retyped by intersection, never by an `Omit` rewrite.** The
  emitted instance type carries `#private`, so an `Omit`-based rewrite stops
  being assignable to the core instance and every `Extension.Operator`
  extension resolves its input to `never`.
- **Reports are silent by default.** `parser-curly` requires `onReport` to be
  stated, `null` included; this package states `null` and relaxes the key to
  optional in its own `Config`. A consumer wanting reports passes
  `parserOptions.onReport`.
- **The re-export surface is the point of this package** (#228). Every name
  base publishes is reachable from here — `Config` and `Parser` already name
  this package's own types, so base's namespaces of those names are re-exported
  as `BaseConfig` and `BaseParser`. From the parser it carries the types and
  the two values no render reaches: `extractParamsFactory`, which a schema
  generator needs beside the instance it types, and `cst`, which an editor
  describes a message with. The parser factory stays internal: this package
  fills the slot, so there is nothing to construct.
  `tests/specs/exports.spec.ts` diffs the core's entry, `/utils` and `/kit` and
  the parser's surface, and fails if any of them gains an export this package
  does not carry; extend the rename map (base's `Config` and `Parser`) or the
  excluded names (the parser's `default` and its own `Config`, which this
  package exports for something else) rather than letting the surface drift.
- **`i18n instanceof I18n` does not hold**, and base does not guarantee it
  either whenever `config.extensions` replaces the instance. Documented, not
  fixed.

## Tests

- The suite proves **this package's wiring** — the parser being present without
  the consumer supplying one, `parserOptions` flowing through the constructor
  and through `loadConfig`, the report channel, the extension pipe, the `/kit`
  wiring, the re-export surface and the typing. It does not re-test base's
  behaviour (base's own suite does) and it does not test the Curly Message
  Format's grammar (the format's conformance set does, inside `parser-curly`).
- `tests/specs/types.spec.ts` asserts by compiling: `pretest` runs
  `tsc --noEmit` over it, so a `@ts-expect-error` that stops being an error
  fails the run. Its closures are never invoked.
- A type test that needs a registration in `SvelteKitI18n.Register` goes to
  `tests/types/registry/`, never into `types.spec.ts`: a registration types
  every schema-less instance of the program it is part of. That directory is a
  program of its own, excluded from `typecheck` and ESLint, resolving
  `sveltekit-i18n` to the build by the package's own name;
  `tests/specs/registry.spec.ts` compiles it with `tsc` at
  `skipLibCheck: false`.
- Vitest needs `@sveltejs/vite-plugin-svelte` **and** base inlined
  (`test.server.deps.inline`): base ships its rune modules uncompiled for the
  consumer's bundler, and an externalized dependency never reaches the plugin.
  Every spec runs in two projects, as base's do: `server` compiles the rune
  modules for the server, `client` for the browser and resolves with the
  `browser` condition, which also picks the browser half of base's `#kit-*`
  imports.

## Comments

If you need a paragraph-long comment to justify why the workaround is OK,
the code is wrong — fix the code.
