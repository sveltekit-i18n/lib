# HTML

The markup a translation carries, rendered as elements. One extension,
[`@sveltekit-i18n/extension-html`](https://github.com/sveltekit-i18n/extensions/tree/extension-html@3.0.0/extension-html),
sits in the config handed to `defineI18n()` and adds the `T` component to the
instance `use()` and `get()` hand out: `<i18n.T key="home.lead" />` renders
`<b>` and `<code>` where `{i18n.t('home.lead')}` would print them as text.
Svelte creates every element, from an allowlist — there is no `{@html}`.

One page, on `@sveltejs/adapter-node`, because the locale is negotiated per
request: the `lang` cookie the language switcher writes, then
`Accept-Language`, then `initLocale`.

[Run this example in StackBlitz](https://stackblitz.com/github/sveltekit-i18n/lib/tree/master/examples/html?startScript=dev&file=src/lib/translations/index.ts) — Node and the dev server boot inside
the browser tab, with nothing installed locally.

## What to look at

| File | Why |
|---|---|
| [`src/lib/translations/index.ts`](./src/lib/translations/index.ts) | `extensions: [html({ onReport })]` in the **config**, and `defineI18n(config, { preferredLocale })` — `handle`, `load`, `use` and `get`, never a module-level instance |
| [`src/routes/+page.svelte`](./src/routes/+page.svelte) | `<i18n.T>` with a payload, with `components={{ a: Link }}` and with `components={BLOCK_ELEMENTS}`, and `i18n.t()` where text is needed |
| [`src/lib/Link.svelte`](./src/lib/Link.svelte) | a component a tag renders as: the attributes the translation may set on the tag arrive as props, its content as `children` |
| [`src/lib/translations/home/en.json`](./src/lib/translations/home/en.json) | the messages, markup included |
| [`vite.config.ts`](./vite.config.ts) | `@sveltekit-i18n/typegen`, which writes `src/i18n-schema.d.ts` on `vite dev` and `vite build` |

## `T` and `t()`

`<i18n.T key params />` takes what `i18n.t(key, params)` takes, typed from the
generated schema alike: `params={{ name }}` is required where the message
names `{{name}}`. `t()` does not change — it returns the message with its
markup as text, which is what a `<title>`, an attribute or an `aria-label`
needs. The page ends with the payload message as `t()` returns it, to
compare with its `<i18n.T>` rendering further up.

The server renders the elements, and the browser hydrates them.

## A payload is text

Every string in `params` is escaped before the parser sees it, so the
`<b>Ann</b>` the input starts with renders as those characters, inside the
`<b>` the message itself carries.

## The component map

A tag renders as what the map names for it. The inline elements — `a`, `b`,
`code`, `em` and the like — render as themselves by default; a layer of the
map can rename one, hand it to a component, or unmap it. This page passes
`components={{ a: Link }}` to one usage only, so that link opens in a new tab
and the others stay plain.

Block elements — `p`, `div`, `ul`, `li`, … — are off by default: a message
often sits inside a `<p>` or a `<button>`, where a list would break the page
the server renders. `components={BLOCK_ELEMENTS}` turns them on for the usage
inside a `<div>`.

## What never renders

No element that loads, runs or submits anything is in the map, and an `href`
renders only with no scheme or with `http:`, `https:`, `mailto:` or `tel:`. The
message with a `javascript:` link and an `<img onerror>` renders the link's
text without its address and leaves the image out. Each of those is reported
to `onReport` — in the server's log on a server render, and in the browser's
console as the page hydrates and on every render after. A report is made each
time the message renders, so a channel that counts should deduplicate.

## Parsers and size

The parser runs first, and `T` reads what it returns, so the parser has to
pass markup through: `sveltekit-i18n`'s Curly Message Format parser does. The
markup is parsed with `parse5`, the HTML parser of the standard, which adds
about 48 kB gzipped to the client bundle with the extension's own code.

## With other extensions

`html(…)` goes before an extension whose output is no instance: with
`[html(…), stores]`, `T` is at `instance.T`. After one whose output still is
an instance, such as `[typedAccess, html(…)]`, it adds `T` to that output.

## Run it

```bash
npm install
npm run dev -- --open
```
