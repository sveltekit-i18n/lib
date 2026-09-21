/**
 * Unicode MessageFormat 2: the engine this site wraps, and a drawing of the
 * message beside it.
 *
 * The drawing is the engine's own syntax tree. `parseCST` reads a message that
 * is not finished — it collects what it could not read as junk rather than
 * raising — so a message a visitor is typing is drawn by the same reader that
 * will resolve it.
 */

import { parseCST } from 'messageformat/cst';

import { drawSpans } from '$lib/highlight.js';

export { default as parser } from '@sveltekit-i18n/parser-mf2';

const ESCAPABLE = '\\{}|';

const mark = (kinds, kind, node) => {
  if (!node) return;

  kinds.fill(kind, Math.max(0, node.start), Math.max(0, node.end));
};

// An escape belongs to the text around it, so the tree has no node for one:
// inside a span the tree calls text, a backslash pair is all there is to find.
const escapes = (kinds, text, start, end) => {
  for (let index = start; index < end - 1; index += 1) {
    if (text[index] !== '\\' || !ESCAPABLE.includes(text[index + 1])) continue;

    kinds.fill('escape', index, index + 2);
    index += 1;
  }
};

/**
 * What an expression or an option was handed. A variable is the value being
 * substituted wherever it stands; a literal is one only where it stands in for
 * that value, and is what the format quotes wherever it is quoted.
 */
const operand = (kinds, text, node, bare) => {
  if (!node) return;
  if (node.type !== 'literal') return mark(kinds, 'key', node);
  if (!node.quoted) return mark(kinds, bare, node);

  mark(kinds, 'string', node);
  escapes(kinds, text, node.open?.end ?? node.start, node.close?.start ?? node.end);
};

const callable = (kinds, text, node) => {
  if (!node || node.type === 'junk') return;

  mark(kinds, 'modifier', node);

  node.options.forEach((option) => {
    mark(kinds, 'option', option);
    mark(kinds, 'punctuation', option.equals);
    operand(kinds, text, option.value, 'option');
  });
};

const expression = (kinds, text, node) => {
  if (!node || node.type === 'junk') return;

  node.braces.forEach((brace) => mark(kinds, 'punctuation', brace));
  operand(kinds, text, node.arg, 'key');
  callable(kinds, text, node.functionRef);
  callable(kinds, text, node.markup);

  node.attributes.forEach((attribute) => {
    mark(kinds, 'option', attribute);
    mark(kinds, 'punctuation', attribute.equals);
    operand(kinds, text, attribute.value, 'option');
  });
};

const pattern = (kinds, text, node) => {
  if (!node) return;

  node.braces?.forEach((brace) => mark(kinds, 'punctuation', brace));

  node.body.forEach((child) => {
    if (child.type !== 'text') return expression(kinds, text, child);

    mark(kinds, 'plain', child);
    escapes(kinds, text, child.start, child.end);
  });
};

const paint = (text, kinds) => {
  const cst = parseCST(text);

  cst.declarations?.forEach((declaration) => {
    if (declaration.type === 'junk') return;

    mark(kinds, 'punctuation', declaration.keyword);

    if (declaration.type === 'local') {
      if (declaration.target?.type === 'variable') mark(kinds, 'key', declaration.target);

      mark(kinds, 'punctuation', declaration.equals);
    }

    expression(kinds, text, declaration.value);
  });

  if (cst.type !== 'select') return pattern(kinds, text, cst.pattern);

  mark(kinds, 'punctuation', cst.match);
  cst.selectors.forEach((selector) => mark(kinds, 'key', selector));

  cst.variants.forEach(({ keys, value }) => {
    keys.forEach((key) => (key.type === 'literal' ? operand(kinds, text, key, 'option') : mark(kinds, 'option', key)));
    pattern(kinds, text, value);
  });
};

export const highlight = (text) => drawSpans(text, paint);
