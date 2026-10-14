# @sveltekit-i18n/extension-markdown

Renders the Markdown a translation carries — `Read [the docs](/docs)` — as elements and Svelte components, for [`@sveltekit-i18n/base`](https://github.com/sveltekit-i18n/base) v3. No `{@html}`: every element is created by Svelte, from a closed set of nodes.

## Install

```sh
npm i -D @sveltekit-i18n/base @sveltekit-i18n/extension-markdown
```

With [`sveltekit-i18n`](https://github.com/sveltekit-i18n/lib), install the extension alone — the core comes with it — and import `I18n` from `sveltekit-i18n` where a snippet here imports it from `@sveltekit-i18n/base`, so the instance gets its parser:

```sh
npm i -D @sveltekit-i18n/extension-markdown
```

## Usage

Add the extension to `config.extensions`. It adds one member to the instance, the `T` component:

```ts
import I18n from '@sveltekit-i18n/base';
import markdown from '@sveltekit-i18n/extension-markdown';

export const i18n = new I18n({
  ...config,
  extensions: [markdown({ onReport: null })],
});
```

```json
{ "intro": "Hi **{{name}}**, read [the docs](/docs)." }
```

```svelte
<i18n.T key="intro" params={{ name }} />
```

renders

```html
Hi <strong>Ann</strong>, read <a href="/docs">the docs</a>.
```

`T` is a component, so it is used as `<i18n.T>`, or taken off the instance first (`const { T } = i18n`). `t()` and `l()` do not change: they return the message with its Markdown as text, which is what an attribute, a `<title>` or an `aria-label` needs. Use `<T>` where the Markdown should render, and `t()` everywhere else.

The extension returns the instance it receives, so `new I18n(...)` stays the instance, `T` included. It can also be applied directly — `markdown(options)(i18n)` — and applying it twice is harmless.

### Props

| Prop | Description |
|------|-------------|
| `key` | The key of the message. A key nothing translates renders as what the parser returns for it, read as Markdown, so a key is never built from untrusted data. |
| `params` | The payload, as the first param of `t()`. Required where the `schema` requires it. |
| `args` | The parser's params after the payload (curly's formatting props, ICU's `formats`), as an array. |
| `locale` | Renders in this locale rather than the active one, as `l()` does. |
| `components` | This usage's layer of the component map (see below). |

`<T>` follows its props, the active locale and the loaded translations, like `t()` in a template. With a `schema`, `key` completes and narrows `params` exactly as `t()` does. A `key` held in a variable typed by a union of keys renders too when none of them needs `params`; a union of keys that do is typed only up to 25 of them, a limit of how TypeScript matches a union of props. TypeScript finds the props of a literal `key` by a lookup rather than comparing a usage with those of every key in turn. It cannot for a key whose payload is optional, for any key of a schema with an open namespace (a template-literal key such as ``[key: `post.${string}`]``), or for a `key` held in a variable typed by a union of keys; with [`@sveltekit-i18n/typegen`](https://github.com/sveltekit-i18n/typegen), that is every key of its keys-only output (payloads `any`) and every key whenever it leaves a namespace open under a `preprocess` other than `'none'`.

## Options

```ts
markdown({
  onReport: (report) => console.warn(report.message),
  components: { emphasis: 'i', link: { component: Link, props: { rel: 'noopener' } } },
});
```

| Option | Description |
|--------|-------------|
| `onReport` | Required: where the reports of what a message could not render go (see [Reports](#reports)); `null` discards them. |
| `components` | The app's layer of the component map. |

## Syntax

A message is read as [CommonMark](https://spec.commonmark.org/0.31.2/)'s inline syntax: backslash escapes, entity and numeric references (`&nbsp;`, `&#8209;`), code spans, emphasis and strong emphasis with `*` and `_`, inline links and images with an optional title, autolinks (`<https://example.com>`, `<ann@example.com>`) and hard line breaks (two spaces or a backslash before a line ending). It reads every example of the specification's inline sections that is one paragraph as the specification does, raw HTML and reference links aside.

Nothing else is syntax, and renders as the characters it is written with:

- block syntax — headings, lists, block quotes, fences, tables, thematic breaks: `- item` is text;
- raw HTML: `<b>x</b>` renders those characters ([`extension-html`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-html) renders markup);
- reference links: a message holds no definitions, so `[text][label]` and `[text]` are text;
- extensions of other flavours: strikethrough, tables, bare URLs.

A line ending is text, as in a paragraph of CommonMark: HTML shows it as a space. The spaces, tabs and line endings that end a message are dropped once they hold a line ending. So are the spaces and tabs a line starts with, but for the first line's. A blank line splits the message into paragraphs, each read on its own, so no node spans two.

## The component map

A node of a message renders as whatever the map says for it. The map has three layers, and the highest that names a node decides:

1. the defaults;
2. the `components` option;
3. the `components` prop of a usage.

| Node | Written as | Default | Attributes |
|------|------------|---------|------------|
| `emphasis` | `*text*`, `_text_` | `'em'` | |
| `strong` | `**text**`, `__text__` | `'strong'` | |
| `code` | `` `text` `` | `'code'` | |
| `link` | `[text](/href "title")`, `<https://…>` | `'a'` | `href`, `title` |
| `image` | `![alt](/src "title")` | unmapped | `src`, `alt`, `title` |
| `break` | two spaces or `\` before a line ending | `'br'` | |
| `paragraph` | a blank line between two | unmapped | |

An entry is

- an element name — `emphasis: 'i'` renders emphasis as `<i>`;
- a component — `link: Link` renders a link as `<Link>`, with the node's attributes as props and its content as `children` (an image's is its `alt`);
- either of them with props of the app's own, laid over the node's attributes — `link: { component: 'a', props: { class: 'link' } }`;
- `null`, which unmaps a node a lower layer maps.

A layer's entry replaces a lower layer's entry whole, props included: a usage's `link: Link` drops the `props` the option gave `link`. An entry of `undefined` is none, so a lower layer's entry applies.

A node no layer maps renders its content without it, and is reported; one a layer unmaps with `null` is not. An image renders its description, a break its line ending, which HTML shows as a space, and paragraphs their content, a blank line apart.

`image` and `paragraph` are off by default. An image loads its `src` once it renders, and a translation would choose what the page loads. A `<T>` is often inside a `<p>`, a `<button>` or an `<a>`, which cannot hold a `<p>`: the browser would move the element out of its parent and the server-rendered page would not hydrate. Map them where the context allows: `<T key="terms" components={{ paragraph: 'p' }} />`. Mapping any node onto a block element is the app's to place the same way. A link never holds a link — one in a link's text, an autolink, renders as its text and is reported — but what the message cannot know is where it goes: a `<T>` inside an `<a>` renders the message's links inside it, which the browser splits apart. Pass `components={{ link: null }}` there.

A message that nests nodes more than 32 deep renders as its text, and is reported, since a render recurses per level; a component adds levels of its own, which the limit cannot count.

## URLs

A link's `href` renders only with no scheme (`/docs`, `docs`, `#top`, `//example.com`) or with `http:`, `https:`, `mailto:` or `tel:`; an image's `src` with no scheme or with `http:` or `https:`. Any other — `javascript:`, `data:` — drops the attribute and is reported. A URL without a scheme is not necessarily on the same site: `//example.com` is not. A mapped `image` loads whatever such a URL names, so where translations are not the app's own, map it to a component that checks the host.

`href` and `src` render, and are checked, without the bidi controls in their value (U+061C, U+200E, U+200F, U+202A–U+202E and U+2066–U+2069): [`parser-mf2`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-mf2#bidi-isolation) isolates a placeholder with them, and `Intl` marks a number or a date with them in a right-to-left locale. In a URL they would make another one, so `[docs](/docs/{$slug})` with `slug: 'intro'` links to `/docs/intro`, and a `javascript:` behind them is blocked. A `title` and an `alt` are text, and keep them.

## Payloads

Interpolation brings no Markdown: every string in `params`, at any depth, renders as the text it is — in text, a code span, a URL, a title or an autolink. Each character the syntax reads in it (`\`, `` ` ``, `*`, `_`, `[`, `]`, `(`, `)`, `<`, `>`, `!`, `&`, `;`, `"`, `'`, space, tab and line endings) stands in as a Unicode noncharacter until the message is parsed, and reads as a letter there. That has consequences:

- A value the parser selects by (a `select` or `.match` key) with one of those characters no longer matches it.
- The payload's other characters still read as what they are next to a delimiter the translation wrote: `*{name}*` is emphasis for a name that is a word and stays text for one that starts with a no-break space, and `a*{name}*b` stays text for one that starts with punctuation. A payload can decide whether delimiters around its placeholder pair; it never adds a node.
- A control character or a noncharacter in the payload renders as U+FFFD, and so does a reference to one in the translation. A noncharacter from U+FDD0 to U+FDE2 that the translation itself holds renders as the character it stands for.
- A plain object's keys stay as they are, since a placeholder names them (`{{first_name}}`), and an object a parser serialises writes its keys without syntax too. Any other object — a `Date`, a class instance, a boxed string — reaches the parser as it is, for it to format, and a plain object keeps its own methods, so an object whose `toString()` returns Markdown renders that Markdown: it is the app's own code. A symbol reaches it as its string, `Symbol(…)`, made inert. A `URL` leaves much of the syntax unencoded — `[`, `]`, `(`, `)`, `*`, `_`, `!`, `&`, `;`, `'`, and `` ` `` in its query: pass one built from untrusted input as its `href`, a string.
- What the parser writes itself is the message's, and reads as syntax: the brackets of an array it serialises as JSON, the parentheses of an accounting format.
- `args` are the parser's and are not touched: formatting options go there. Options inside the payload, such as the `props` of curly's [wrappers](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly#payload), are strings of the payload and made inert like any: a `timeZone` of `America/New_York` names no zone there.

## Parsers

The parser runs first and `<T>` reads what it returns, so the parser has to pass Markdown through. [`parser-curly`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-curly), [`parser-mf2`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-mf2) and [`parser-i18next`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-i18next) do.

- With curly, a backslash before whitespace, `\`, `:`, `;`, `{` or `}` is curly's own escape: write a backslash break, or a backslash Markdown is to read, as `\\`.
- With MF2, write Markdown as text: its own markup (`{#link}`) renders no element. The marks MF2 [isolates](https://github.com/sveltekit-i18n/parsers/tree/master/parser-mf2#bidi-isolation) a placeholder with are removed from a URL ([URLs](#urls)), and an autolink a placeholder fills (`<{$url}>`) is read without them.
- [`parser-icu`](https://github.com/sveltekit-i18n/parsers/tree/master/parser-icu) reads an autolink as a tag of its own rich-text syntax and fails the message. Pass `ignoreTag: true`:

  ```ts
  import icu from '@sveltekit-i18n/parser-icu';

  const parser = icu({ onReport: null, ignoreTag: true });
  ```

## Reports

A report says what a message could not render, as the parsers' reports do:

```ts
type Report = {
  code: 'node-unmapped' | 'url-blocked' | 'nesting-invalid';
  key: string;
  locale: string;
  node?: 'paragraph' | 'emphasis' | 'strong' | 'code' | 'link' | 'image' | 'break';
  attribute?: 'href' | 'src';
  message: string;
};
```

| Code | What happened |
|------|---------------|
| `node-unmapped` | A node no layer maps: its content rendered without it. |
| `url-blocked` | An `href` or a `src` with a scheme that is not allowed: the node rendered without it. |
| `nesting-invalid` | A link in a link's text, rendered as its text (`node: 'link'`), or a message that nests nodes more than 32 deep, rendered as its text (no `node`). |

A report is made each time the message renders — on the server and again in the browser, and on every change of a prop, the locale or the translations — so a channel that counts should deduplicate. A channel that throws does not stop the render.

## Other extensions

An extension whose output is no instance — such as [`extension-stores`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-stores) — goes after this one, and `T` is then at `instance.T`:

```ts
export const { t, locale, instance: { T } } = new I18n({ ...config, extensions: [markdown({ onReport: null }), stores] });
```

Put the other way round, `markdown` throws at construction, and its output type carries no `T`. [`extension-typed-access`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-typed-access) returns an output that is still an instance, so `markdown` may go after it and adds `T` beside the tree: `extensions: [typedAccess, markdown({ onReport: null })]`. `markdown` is a factory of the options: `extensions: [markdown]` and `markdown()` throw too.

[`extension-html`](https://github.com/sveltekit-i18n/extensions/tree/master/extension-html) adds a `T` too, rendering markup: an instance takes one of the two, and the second of them in a pipe throws at construction rather than replace the first's `T`. An `extension-html` older than 3.0.3 does not check: after `markdown`, it replaces its `T` without a word.

## With SvelteKit

Put the extension in the config [`@sveltekit-i18n/base/kit`](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md#sveltekit) wires (base 3.1 or newer), and `data.i18n`, `use()` and `get()` carry `T`. With `sveltekit-i18n` 3.1 or newer, import `defineI18n` from `sveltekit-i18n/kit` instead. The server renders the elements, and the browser hydrates them.

## Size

The parser is this package's own, linear in the length of a message, crafted ones included. Its one runtime dependency is [`character-entities`](https://github.com/wooorm/character-entities), the names of HTML's references, about 12 kB minified and gzipped. With the extension's own code, an app's client bundle grows by about 17 kB gzipped.

## Documentation

- 🌐 [sveltekit-i18n.github.io](https://sveltekit-i18n.github.io) – The documentation site, with a live playground
- 📖 [@sveltekit-i18n/base docs](https://github.com/sveltekit-i18n/base/blob/master/docs/README.md) – The core, and the `extensions` reference
- 📚 [Documentation Index](https://github.com/sveltekit-i18n/lib/tree/master/docs/INDEX.md) – Guides, tutorials and best practices

## Issues

This package is a part of the [sveltekit-i18n](https://github.com/sveltekit-i18n/lib) ecosystem. Please report issues [here](https://github.com/sveltekit-i18n/lib/issues).

## License

[MIT](https://github.com/sveltekit-i18n/extensions/blob/master/extension-markdown/LICENSE)
