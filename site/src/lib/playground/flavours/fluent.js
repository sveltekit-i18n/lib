/**
 * Fluent: the engine this site wraps, and a drawing of the message beside it.
 *
 * `@fluent/bundle` keeps no offsets and skips what it cannot read without a
 * word, so the drawing walks the grammar the way that reader does — blanks
 * around every token, commas between arguments optional — and never fails: a
 * part it cannot read stays the colour of message text.
 */

import { drawSpans } from '#lib/highlight.js';

export { default as parser } from '@sveltekit-i18n/parser-fluent';

const IDENTIFIER = /[a-zA-Z][\w-]*/y;
const NUMBER = /-?[0-9]+(?:\.[0-9]+)?/y;
const FUNCTION = /^[A-Z][A-Z0-9_-]*$/;
const ESCAPE = /\\(?:[\\"]|u[a-fA-F0-9]{4}|U[a-fA-F0-9]{6})/y;
const BLANK = /\s/;

/** Placeables and calls nest, and a message a visitor types can nest forever. */
const MAX_DEPTH = 100;

const paint = (text, kinds) => {
  const fill = (start, end, kind) => { kinds.fill(kind, start, end); };
  let i = 0;

  const at = (offset = 0) => text[i + offset];
  const space = () => { while (i < text.length && BLANK.test(text[i])) i += 1; };
  const sticky = (re) => { re.lastIndex = i; return re.exec(text)?.[0] ?? ''; };

  const token = (word, kind) => {
    if (!text.startsWith(word, i)) return false;

    fill(i, i + word.length, kind);
    i += word.length;

    return true;
  };

  // A quoted run holds no line break, and an escape it does not know fails
  // the message.
  const string = () => {
    const start = i;
    const escapes = [];
    let read = true;

    i += 1;

    while (i < text.length && at() !== '"' && at() !== '\n' && at() !== '\r') {
      if (at() !== '\\') { i += 1; continue; }

      const escape = sticky(ESCAPE);

      if (!escape) { read = false; break; }

      escapes.push([i, i + escape.length]);
      i += escape.length;
    }

    read &&= at() === '"';

    if (read) i += 1;

    fill(start, i, 'string');
    escapes.forEach(([from, to]) => fill(from, to, 'escape'));

    return read;
  };

  /** A literal is a value where it stands, and the value of a named argument. */
  const literal = (kind) => {
    const number = sticky(NUMBER);

    if (number) { fill(i, i + number.length, kind); i += number.length; return 'literal'; }
    if (at() === '"') return string() && 'literal';

    return '';
  };

  /**
   * A variable, a message or term reference, a call, a literal, or another
   * placeable: what was read, or `''` where the reading stops.
   */
  function expression(depth) {
    if (at() === '{') return placeable(depth + 1) && 'placeable';

    const start = i;
    const sigil = at() === '$' || at() === '-' ? at() : '';

    i += sigil.length;

    const name = sticky(IDENTIFIER);

    if (!name) { i = start; return literal('key'); }

    i += name.length;

    if (at() === '.') {
      i += 1;

      const attribute = sticky(IDENTIFIER);

      if (attribute) i += attribute.length;
      else i -= 1;
    }

    const end = i;

    space();

    if (sigil === '$' || at() !== '(') {
      i = end;
      fill(start, end, 'key');

      return { '': 'reference', $: 'variable', '-': 'term' }[sigil];
    }

    if (sigil === '' && !FUNCTION.test(name)) { i = start; return ''; }

    fill(start, end, sigil === '-' ? 'key' : 'modifier');

    return args(depth + 1) && 'call';
  }

  function args(depth) {
    if (depth > MAX_DEPTH) { i = text.length; return false; }

    fill(i, i + 1, 'punctuation');
    i += 1;
    space();

    while (i < text.length) {
      if (token(')', 'punctuation')) return true;

      const start = i;
      const read = expression(depth);

      if (!read) return false;

      const end = i;

      space();

      // A message reference before a colon names an argument instead.
      if (read === 'reference' && at() === ':') {
        fill(start, end, 'option');
        fill(i, i + 1, 'punctuation');
        i += 1;
        space();

        if (!literal('option')) return false;

        space();
      }

      token(',', 'punctuation');
      space();
    }

    return false;
  }

  function variants(depth) {
    for (;;) {
      space();

      const start = i;

      if (at() === '*') i += 1;
      if (at() !== '[') { i = start; break; }

      fill(start, i + 1, 'punctuation');
      i += 1;
      space();

      const key = sticky(NUMBER) || sticky(IDENTIFIER);

      if (!key) return false;

      fill(i, i + key.length, 'option');
      i += key.length;
      space();

      if (!token(']', 'punctuation')) return false;

      pattern(depth, true);
    }

    return token('}', 'punctuation');
  }

  function placeable(depth) {
    if (depth > MAX_DEPTH) { i = text.length; return false; }

    fill(i, i + 1, 'punctuation');
    i += 1;
    space();

    if (!expression(depth)) return false;

    space();

    if (token('}', 'punctuation')) return true;
    if (!token('->', 'punctuation')) return false;

    return variants(depth);
  }

  function pattern(depth, variant) {
    while (i < text.length) {
      const c = at();

      if (c === '{') { placeable(depth + 1); continue; }
      if (variant && c === '}') return;

      if (variant && (c === '\n' || c === '\r')) {
        // A variant's value ends where a line starts with a key, the closing
        // brace or an attribute; the blanks before it are text either way.
        while (i < text.length && BLANK.test(text[i])) i += 1;

        if (i === text.length || '[*}.'.includes(text[i])) return;

        continue;
      }

      i += 1;
    }
  }

  pattern(0, false);
};

export const highlight = (text) => drawSpans(text, paint);
