/**
 * JSON drawn the way the snippets are. Those are highlighted by Shiki on the
 * server; this is for a value computed in the browser from what the visitor
 * typed, so it emits the same markup with the same palette instead of
 * shipping the highlighter.
 */

/** GitHub's theme, light then dark, as Shiki emits it. */
const PALETTE = {
  plain: ['#24292E', '#E1E4E8'],
  // Property names and literals share one blue in that theme.
  key: ['#005CC5', '#79B8FF'],
  string: ['#032F62', '#9ECBFF'],
};

const TOKEN = /("(?:[^"\\]|\\.)*")(?=\s*:)|("(?:[^"\\]|\\.)*")|(-?\d+(?:\.\d+)?(?:[eE][+-]?\d+)?|\btrue\b|\bfalse\b|\bnull\b)|([\s\S])/g;

const escape = (text) => text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const span = (kind, text) => {
  const [light, dark] = PALETTE[kind];

  return `<span style="--shiki-light:${light};--shiki-dark:${dark}">${escape(text)}</span>`;
};

const line = (text) => {
  let html = '';
  let plain = '';

  // Anything outside a string or a literal is punctuation and whitespace, and
  // one span per run of it keeps the markup close to Shiki's.
  const flush = () => {
    if (plain) html += span('plain', plain);
    plain = '';
  };

  for (const [, key, string, literal, other] of text.matchAll(TOKEN)) {
    if (other !== undefined) {
      plain += other;
      continue;
    }

    flush();
    html += key !== undefined ? span('key', key) : string !== undefined ? span('string', string) : span('key', literal);
  }

  flush();

  return `<span class="line">${html}</span>`;
};

const lines = (text) => text.split('\n').map(line).join('\n');

/**
 * The same drawing for text a visitor is still typing, which need not parse.
 * It is the inner markup alone: an editor supplies the element it lies under.
 */
export const highlightJsonText = (text) => lines(text);

export const highlightJson = (value) => `<pre class="shiki shiki-themes github-light github-dark" style="--shiki-light:#24292e;--shiki-dark:#e1e4e8;--shiki-light-bg:#fff;--shiki-dark-bg:#24292e" tabindex="0"><code>${lines(JSON.stringify(value, null, 2))}</code></pre>`;
