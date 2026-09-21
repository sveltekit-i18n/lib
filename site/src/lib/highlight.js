/**
 * The drawings this site makes in the browser. The snippets are highlighted by
 * Shiki on the server; these are for text a visitor typed, so they emit the
 * same markup with the same palette instead of shipping a highlighter.
 */

import { cst } from 'sveltekit-i18n';

/**
 * GitHub's theme, light then dark, as Shiki emits it, and what each colour is
 * for across the formats drawn here: `key` is the value being substituted,
 * `modifier` the function that formats it, `option` whatever configures or
 * selects, `string` a run the format quotes, `escape` an escape sequence, and
 * `punctuation` the braces, separators and sigils that hold a message together.
 */
const PALETTE = {
  plain: ['#24292E', '#E1E4E8'],
  // Property names and literals share one blue in that theme.
  key: ['#005CC5', '#79B8FF'],
  string: ['#032F62', '#9ECBFF'],
  punctuation: ['#D73A49', '#F97583'],
  modifier: ['#6F42C1', '#B392F0'],
  option: ['#E36209', '#FFAB70'],
  escape: ['#22863A', '#85E89D'],
};

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const span = ({ kind, text }) => {
  const [light, dark] = PALETTE[kind];

  return `<span style="--shiki-light:${light};--shiki-dark:${dark}">${escape(text)}</span>`;
};

/**
 * Pieces of coloured text, as Shiki lays them out: one `.line` span per line,
 * and inside it one span per run of a single colour.
 */
const draw = (pieces) => {
  const lines = [[]];

  pieces.forEach(({ kind, text }) => {
    text.split('\n').forEach((part, index) => {
      if (index) lines.push([]);
      if (!part) return;

      const previous = lines.at(-1).at(-1);

      if (previous?.kind === kind) previous.text += part;
      else lines.at(-1).push({ kind, text: part });
    });
  });

  return lines.map((runs) => `<span class="line">${runs.map(span).join('')}</span>`).join('\n');
};

/**
 * A drawing built by painting over the text: a painter fills one kind per code
 * unit, which is the unit every format here counts a span in.
 */
export const drawSpans = (text, painter) => {
  const kinds = new Array(text.length).fill('plain');

  painter(text, kinds);

  return draw(text.split('').map((unit, index) => ({ kind: kinds[index], text: unit })));
};

const TOKEN = /("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b)|([\s\S])/g;

// Anything outside a string or a literal is punctuation and whitespace, which
// that theme leaves plain.
const json = (text) => [...text.matchAll(TOKEN)].map(([, key, string, literal, other]) => ({
  kind: other === undefined ? (string === undefined ? 'key' : 'string') : 'plain',
  text: key ?? string ?? literal ?? other,
}));

/**
 * What each part of a message is drawn as. A part named here paints over what
 * encloses it, and one left out keeps that colour: the text spelling a name is
 * the name, a placeholder is only its parts, and an option's value is message
 * text until a placeholder in it says otherwise.
 */
const CURLY = {
  space: 'plain',
  'option-value': 'plain',
  open: 'punctuation',
  close: 'punctuation',
  separator: 'punctuation',
  key: 'key',
  modifier: 'modifier',
  'option-key': 'option',
  escape: 'escape',
};

const paint = (node, kinds) => {
  const kind = CURLY[node.type];

  if (kind) kinds.fill(kind, node.start, node.end);

  node.nodes?.forEach((child) => paint(child, kinds));
};

const curly = (text, kinds) => paint(cst(text), kinds);

/**
 * The drawings for text a visitor is still typing, which need not parse. Each
 * is the inner markup alone: an editor supplies the element it lies under.
 */
export const highlightJsonText = (text) => draw(json(text));

export const highlightCurly = (text) => drawSpans(text, curly);

export const highlightPlain = (text) => draw([{ kind: 'plain', text }]);

export const highlightJson = (value) => `<pre class="shiki shiki-themes github-light github-dark" style="--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e" tabindex="0"><code>${draw(json(JSON.stringify(value, null, 2)))}</code></pre>`;
