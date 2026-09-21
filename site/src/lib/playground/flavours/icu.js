/**
 * ICU MessageFormat: the engine this site wraps, and a drawing of the message
 * beside it.
 *
 * The engine's parser raises on a message that is not finished, and a message
 * a visitor is typing is unfinished at almost every keystroke, so the drawing
 * walks the grammar itself and never fails: a part it cannot read stays the
 * colour of message text.
 */

import { drawSpans } from '$lib/highlight.js';

export { default as parser } from '@sveltekit-i18n/parser-icu';

/** The argument types that give `#` its meaning and `offset:` its place. */
const POUND = new Set(['plural', 'selectordinal']);

const SELECTORS = new Set(['plural', 'selectordinal', 'select']);

/** An argument name: anything the grammar has not reserved. */
const IDENT = /[^\s\p{Pattern_Syntax}]/u;

/** A tag name, which is XML's and narrower. */
const NAME = /[-.0-9_a-zA-Z·À-ÖØ-öø-ͽͿ-῿‌-‍‿-⁀⁰-↏Ⰰ-⿯、-퟿\uD800-\uDFFF豈-﷏ﷰ-�]/;

const ALPHA = /[a-zA-Z]/;
const DIGIT = /[0-9]/;

/** Arguments and tags nest, and a message a visitor types can nest forever. */
const MAX_DEPTH = 100;

const paint = (text, kinds) => {
  const fill = (start, end, kind) => { kinds.fill(kind, start, end); };
  let i = 0;

  const at = (offset = 0) => text[i + offset];
  const space = () => { while (i < text.length && /\s/.test(text[i])) i += 1; };
  const ident = () => { const start = i; while (i < text.length && IDENT.test(text[i])) i += 1; return text.slice(start, i); };
  const digits = () => { const start = i; if (at() === '+' || at() === '-') i += 1; while (i < text.length && DIGIT.test(at())) i += 1; return start; };
  const close = () => { if (at() === '}') { fill(i, i + 1, 'punctuation'); i += 1; } };

  // A quote holds the run until the next lone quote; a doubled one is the
  // quote itself and belongs to neither side.
  const quoted = () => {
    const start = i;
    const doubled = [];

    i += 2;

    while (i < text.length) {
      if (at() === "'") {
        if (at(1) === "'") { doubled.push(i); i += 2; continue; }
        break;
      }
      i += 1;
    }

    if (at() === "'") i += 1;

    fill(start, i, 'string');
    doubled.forEach((offset) => fill(offset, offset + 2, 'escape'));
  };

  // A quote only quotes before a character that would otherwise be syntax.
  const literal = (argType) => {
    if (at() === "'") {
      const next = at(1);

      if (next === "'") { fill(i, i + 2, 'escape'); i += 2; return; }
      if (next === '{' || next === '}' || next === '<' || next === '>' || (next === '#' && POUND.has(argType))) { quoted(); return; }
    }

    i += 1;
  };

  // Everything after the type is the style, up to the brace that closes the
  // argument: a name, a pattern, or `::` and a skeleton.
  const style = () => {
    space();

    if (at() !== ',') { close(); return; }

    fill(i, i + 1, 'punctuation');
    i += 1;
    space();

    const start = i;
    let depth = 0;

    while (i < text.length) {
      const c = at();

      if (c === "'") { i += 1; const quote = text.indexOf("'", i); i = quote < 0 ? text.length : quote + 1; continue; }
      if (c === '{') { depth += 1; i += 1; continue; }
      if (c === '}') { if (depth === 0) break; depth -= 1; i += 1; continue; }

      i += 1;
    }

    let end = i;

    while (end > start && /\s/.test(text[end - 1])) end -= 1;

    if (text.startsWith('::', start)) {
      fill(start, start + 2, 'punctuation');

      let body = start + 2;

      while (body < end && /\s/.test(text[body])) body += 1;

      fill(body, end, 'option');
    } else fill(start, end, 'option');

    close();
  };

  const selectors = (type, depth, inTag) => {
    space();

    if (at() !== ',') { close(); return; }

    fill(i, i + 1, 'punctuation');
    i += 1;
    space();

    let selector = ident();
    let start = i - selector.length;

    if (type !== 'select' && selector === 'offset' && at() === ':') {
      fill(start, i, 'option');
      fill(i, i + 1, 'punctuation');
      i += 1;
      space();
      fill(digits(), i, 'option');
      space();
      selector = ident();
      start = i - selector.length;
    }

    for (;;) {
      if (selector) fill(start, i, 'option');
      else if (type !== 'select' && at() === '=') {
        fill(i, i + 1, 'punctuation');
        i += 1;
        fill(digits(), i, 'option');
      } else break;

      space();

      if (at() !== '{') break;

      fill(i, i + 1, 'punctuation');
      i += 1;
      message(depth + 1, type, inTag);
      close();
      space();
      selector = ident();
      start = i - selector.length;
    }

    close();
  };

  const argument = (depth, inTag) => {
    fill(i, i + 1, 'punctuation');
    i += 1;
    space();

    const name = ident();

    if (name) fill(i - name.length, i, 'key');

    space();

    if (at() === '}') { fill(i, i + 1, 'punctuation'); i += 1; return; }
    if (at() !== ',') return;

    fill(i, i + 1, 'punctuation');
    i += 1;
    space();

    const type = ident();

    if (type) fill(i - type.length, i, 'modifier');

    if (SELECTORS.has(type)) selectors(type, depth, inTag);
    else style();
  };

  const tagName = () => {
    const start = i;

    i += 1;

    while (i < text.length && NAME.test(at())) i += 1;

    fill(start, i, 'modifier');
  };

  const closeTag = () => {
    fill(i, i + 2, 'punctuation');
    i += 2;

    if (i < text.length && ALPHA.test(at())) tagName();

    space();

    if (at() === '>') { fill(i, i + 1, 'punctuation'); i += 1; }
  };

  const tag = (depth, argType) => {
    const start = i;

    fill(i, i + 1, 'punctuation');
    i += 1;
    tagName();
    space();

    // A tag that closes itself is not a tag to the engine, only text.
    if (at() === '/' && at(1) === '>') { fill(start, i + 2, 'plain'); i += 2; return; }
    if (at() !== '>') return;

    fill(i, i + 1, 'punctuation');
    i += 1;
    message(depth + 1, argType, true);

    if (at() === '<' && at(1) === '/') closeTag();
  };

  function message(depth, argType, inTag) {
    if (depth > MAX_DEPTH) return;

    while (i < text.length) {
      const c = at();

      if (c === '{') { argument(depth, inTag); continue; }
      if (c === '}' && depth > 0) return;
      if (c === '#' && POUND.has(argType)) { fill(i, i + 1, 'key'); i += 1; continue; }
      if (c === '<' && at(1) === '/') { if (inTag) return; closeTag(); continue; }
      if (c === '<' && at(1) !== undefined && ALPHA.test(at(1))) { tag(depth, argType); continue; }

      literal(argType);
    }
  }

  message(0, '', false);
};

export const highlight = (text) => drawSpans(text, paint);
