import { Marked } from 'marked';
import { createHighlighter } from 'shiki';

import { REPO, ROUTE_OF_FILE } from './docs.js';

const sources = import.meta.glob('../../../docs/*.md', { query: '?raw', import: 'default', eager: true });

const LANGS = ['javascript', 'typescript', 'svelte', 'json', 'jsonc', 'bash', 'markdown'];

const THEMES = { light: 'github-light', dark: 'github-dark' };

let highlighting;

const highlighter = () => (highlighting ??= createHighlighter({ themes: Object.values(THEMES), langs: LANGS }));

export const highlight = async (code, lang) => (await highlighter())
  .codeToHtml(code, { lang, themes: THEMES, defaultColor: false });

export const source = (file) => {
  const found = Object.entries(sources).find(([path]) => path.endsWith(`/${file}`));

  if (!found) throw new Error(`docs/${file} is not there — the site renders docs/, it does not keep a copy`);

  return found[1];
};

const ENTITIES = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'" };

/** Slugs are computed from the text a reader sees, so the markup and the
 *  entities the inline parser introduced have to come back off first. */
const plain = (html) => html
  .replace(/<[^>]+>/g, '')
  .replace(/&(#39|amp|lt|gt|quot);/g, (_, name) => ENTITIES[name]);

/** GitHub's heading slugs, so anchors written for GitHub keep working here. */
const slugger = () => {
  const seen = new Map();

  return (text) => {
    const base = text.toLowerCase().replace(/[^\w\s-]/g, '').replace(/\s/g, '-');
    const count = seen.get(base) ?? 0;

    seen.set(base, count + 1);

    return count ? `${base}-${count}` : base;
  };
};

/**
 * `docs/` is written for GitHub, where a sibling document is `./FILE.md`.
 * Here those become site routes, and anything outside `docs/` stays in the
 * repository rather than turning into a broken local link.
 */
const rewrite = (href, prefix) => {
  if (!href?.startsWith('.')) return href;

  const [path, hash] = href.split('#');
  const route = ROUTE_OF_FILE[path.replace(/^\.\//, '')];

  if (route) return `${prefix}${route}${hash ? `#${hash}` : ''}`;

  const target = path.replace(/^\.\.\//, '');

  return `${REPO}/${target.includes('.') ? 'blob' : 'tree'}/master/${target}`;
};

export const render = async (file, { prefix = '' } = {}) => {
  const shiki = await highlighter();
  const slug = slugger();
  const headings = [];

  let title = '';

  const marked = new Marked({
    async: true,
    walkTokens: (token) => {
      if (token.type !== 'code') return;

      const lang = LANGS.includes(token.lang) ? token.lang : 'text';

      token.highlighted = shiki.codeToHtml(token.text, { lang, themes: THEMES, defaultColor: false });
    },
    renderer: {
      code: ({ highlighted, text }) => highlighted ?? `<pre><code>${text}</code></pre>`,
      heading({ tokens, depth }) {
        const text = this.parser.parseInline(tokens);
        const label = plain(text);
        const id = slug(label);

        if (depth === 1 && !title) title = label;
        if (depth === 2) headings.push({ id, text: label });

        return `<h${depth} id="${id}"><a class="anchor" href="#${id}" aria-hidden="true">#</a>${text}</h${depth}>\n`;
      },
      link({ href, title: linkTitle, tokens }) {
        const text = this.parser.parseInline(tokens);
        const target = rewrite(href, prefix);
        const external = /^https?:/.test(target);

        return `<a href="${target}"${linkTitle ? ` title="${linkTitle}"` : ''}${external ? ' rel="noreferrer"' : ''}>${text}</a>`;
      },
    },
  });

  const html = await marked.parse(source(file));

  return { html, title, headings };
};
