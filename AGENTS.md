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
[`@sveltekit-i18n/parser-default`](https://github.com/sveltekit-i18n/parsers)
and re-exports the surface, so users install a single package. It also hosts
the ecosystem's shared issue tracker, docs, and examples for the whole family
(`base` / `lib` / `parsers` / `extensions`).

## Current state: v2, frozen for the v3 rewrite

- `master` still carries the **v2 codebase** (pnpm, Jest, tsup — see the repo
  configs). The v2 line is frozen: critical fixes only, applied on the `2.x`
  maintenance branch. Don't land v2 feature work.
- The v3 rewrite is tracked in
  [#214](https://github.com/sveltekit-i18n/lib/issues/214) and lands here
  **last** (#228-#230), after `base`, `parsers`, and `extensions` are ready.

## Comments

If you need a paragraph-long comment to justify why the workaround is OK,
the code is wrong — fix the code.
