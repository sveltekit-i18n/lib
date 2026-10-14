# Markdown

The Markdown a translation carries, rendered as elements. One extension,
[`@sveltekit-i18n/extension-markdown`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-markdown),
sits in the config handed to `defineI18n()` and adds the `T` component to the
instance `use()` and `get()` hand out: `<i18n.T key="home.lead" />` renders
`**strong**` and `` `code` `` where `{i18n.t('home.lead')}` would print them as
text. Svelte creates every element, from a closed set of nodes — there is no
`{@html}`.

One page, on `@sveltejs/adapter-node`, because the locale is negotiated per
request: the `lang` cookie the language switcher writes, then
`Accept-Language`, then `initLocale`.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/markdown?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `extensions: [markdown({ onReport })]` in the **config**, and `defineI18n(config, { preferredLocale })` — `handle`, `load`, `use` and `get`, never a module-level instance |
| [`src/routes/+page.svelte`](./src/routes/+page.svelte) | `<i18n.T>` with a payload, with `components={{ link: Link }}` and with `components={{ paragraph: 'p' }}`, and `i18n.t()` where text is needed |
| [`src/lib/Link.svelte`](./src/lib/Link.svelte) | a component a link renders as: its `href` and `title` arrive as props, its text as `children` |
| [`src/lib/translations/home/en.json`](./src/lib/translations/home/en.json) | the messages, Markdown included |
| [`vite.config.ts`](./vite.config.ts) | `@sveltekit-i18n/typegen`, which writes `src/i18n-schema.d.ts` on `vite dev` and `vite build` |

## `T` and `t()`

`<i18n.T key params />` takes what `i18n.t(key, params)` takes, typed from the
generated schema alike: `params={{ name }}` is required where the message
names `{{name}}`. `t()` does not change — it returns the message with its
Markdown as text, which is what a `<title>`, an attribute or an `aria-label`
needs. The page ends with the payload message as `t()` returns it, to
compare with its `<i18n.T>` rendering further up.

The server renders the elements, and the browser hydrates them.

## A payload is text

Interpolation brings no Markdown: every string in `params` renders as the
text it is, so the `*Ann*` the input starts with renders as those characters,
inside the `**` the message itself carries. Type `[a](/b)` or `` `x` `` to see
it stay text.

## The component map

A node renders as what the map names for it. Emphasis, strong emphasis, code,
links and line breaks render as `em`, `strong`, `code`, `a` and `br` by
default; a layer of the map can rename one, hand it to a component, or unmap
it. This page passes `components={{ link: Link }}` to one usage only, so that
link opens in a new tab and the others stay plain.

Paragraphs are off by default: a message often sits inside a `<p>` or a
`<button>`, which cannot hold one, and the page the server renders would not
hydrate. `components={{ paragraph: 'p' }}` turns them on for the usage inside
a `<div>`. The same message breaks a line with a backslash before its line
ending, which the Curly Message Format reads as an escape of its own, so the
JSON catalogue writes it `\\\\`.

## What stays text

Only CommonMark's inline syntax is read. Block syntax, a list or a heading,
and raw HTML render as the characters they are written with. A link's `href`
renders only with no scheme or with `http:`, `https:`, `mailto:` or `tel:`, and
an image is off by default, since it would let a translation choose what the
page loads. The message with a `javascript:` link and an image renders the
link's text without its address and the image's description alone. Each of
those is reported to `onReport` — in the server's log on a server render, and
in the browser's console as the page hydrates and on every render after. A
report is made each time the message renders, so a channel that counts should
deduplicate.

## Parsers and size

The parser runs first, and `T` reads what it returns, so the parser has to
pass Markdown through: `sveltekit-i18n`'s Curly Message Format parser does.
The Markdown is read by the extension's own parser, with
`character-entities` for the names of HTML's references, which adds about
17 kB gzipped to the client bundle with the extension's own code.

## With other extensions

`markdown(…)` goes before an extension whose output is no instance: with
`[markdown(…), stores]`, `T` is at `instance.T`. After one whose output still
is an instance, such as `[typedAccess, markdown(…)]`, it adds `T` to that
output. It takes the place of `extension-html`, which adds a `T` of its own:
an instance takes one of the two.

## Run it

```bash
npm install
npm run dev -- --open
```
