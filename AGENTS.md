# AGENTS.md

Behavioral guidelines for LLM coding assistants working on **sveltekit-i18n**
(the `lib` repository). Applies to anything that drives commits, PRs, or file
edits on this repo.

**Precedence:** These repo rules override individual LLM memory or personal
preference. If your own memory conflicts with this file, follow this file.

This repo follows the same working rules as
[`base`'s AGENTS.md](https://github.com/sveltekit-i18n/base/blob/master/AGENTS.md)
(sections 1-14: think before coding, simplicity first, surgical changes,
verify before committing, commit on approval, fixup hygiene, branch & push
discipline, PRs, docs track code, coding conventions, security posture,
English-only artifacts, test rules, terse output, no emojis). What follows is
only what differs here.

---

## The repository

The end-user package `sveltekit-i18n`: it composes
[`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) with
[`@sveltekit-i18n/parser-curly`](https://github.com/sveltekit-i18n/parsers)
and re-exports the core's whole surface along with the parser's types and its
parameter extractor, so users install a single package. It also
hosts the ecosystem's shared issue tracker, docs, and examples for the whole
family (`base` / `lib` / `parsers` / `extensions`).

## Current state: v3 released from `master`

- **`master` is the v3 line.** Stack: pnpm, Vitest, tsup, ESLint 10 flat
  config, ESM-only, Node 22 / Bun 1.2 / Deno 2 or newer, peer `svelte >=5`.
- **`2.x` is a frozen snapshot** of the published v2 line: critical fixes only.
- **The family is published at 3.0.0** — `base`, both parsers,
  `extension-stores` and this package — released aligned, as
  [#214](https://github.com/sveltekit-i18n/lib/issues/214) set out. The pins on
  `base` and `parser-curly` are exact and stay that way.
- **`examples/` is still v2** and is the one piece v3 did not reach; the rework
  is [#230](https://github.com/sveltekit-i18n/lib/issues/230), sequenced after
  the release so the examples present published versions. Until it lands,
  nothing in `examples/` is a reference for how v3 is used — `README.md` and
  `docs/` are.

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
  as `BaseConfig` and `BaseParser`. `tests/specs/exports.spec.ts` fails if base
  gains an export this package does not carry; extend the rename map there
  rather than letting the surface drift. From the parser it carries the types
  and `extractParamsFactory` — the build-time half of the contract, which a
  schema generator needs beside the instance it types. The parser factory stays
  internal: this package fills the slot, so there is nothing to construct.
- **`i18n instanceof I18n` does not hold**, and base does not guarantee it
  either whenever `config.extensions` replaces the instance. Documented, not
  fixed.

## Tests

- The suite proves **this package's wiring** — the parser being present without
  the consumer supplying one, `parserOptions` flowing through the constructor
  and through `loadConfig`, the report channel, the extension pipe, the
  re-export surface and the typing. It does not re-test base's behaviour
  (base's own suite does) and it does not test the Curly Message Format's
  grammar (the format's conformance set does, inside `parser-curly`).
- `tests/specs/types.spec.ts` asserts by compiling: `pretest` runs
  `tsc --noEmit` over it, so a `@ts-expect-error` that stops being an error
  fails the run. Its closures are never invoked.
- Vitest needs `@sveltejs/vite-plugin-svelte` **and** base inlined
  (`test.server.deps.inline`): base ships its rune modules uncompiled for the
  consumer's bundler, and an externalized dependency never reaches the plugin.

## Comments

If you need a paragraph-long comment to justify why the workaround is OK,
the code is wrong — fix the code.
