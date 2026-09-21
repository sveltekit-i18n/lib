/**
 * i18next: the engine this site wraps, and a drawing of the message beside it.
 *
 * i18next has no parser — interpolation is two regexes over the message — so
 * the drawing is a reading of what the interpolator substitutes and of nothing
 * else. Nesting (`$t(...)`) is not drawn because this adapter never reaches
 * it: it calls the interpolator, which resolves no nested key.
 */

import { drawSpans } from '$lib/highlight.js';

export { default as parser } from '@sveltekit-i18n/parser-i18next';

/** What the `.` of those regexes does not match, so a placeholder never spans one. */
const BREAK = new Set(['\n', '\r', '\u2028', '\u2029']);

/**
 * For every offset, where the `}}` closing a placeholder that opens there
 * lies, or -1 when a line break or the end of the message comes first. One
 * pass back to front, so the scan below stays linear on `{{{{{{...`.
 */
const closers = (text) => {
  const at = new Array(text.length + 1).fill(-1);

  for (let i = text.length - 1; i >= 0; i -= 1) {
    if (BREAK.has(text[i])) at[i] = -1;
    else if (text[i] === '}' && text[i + 1] === '}') at[i] = i;
    else at[i] = at[i + 1];
  }

  return at;
};

/** Every `open ... }}` the regex finds: leftmost, then shortest, never overlapping. */
const scan = (text, open, at) => {
  const found = [];
  let i = 0;

  while (i + open.length < text.length) {
    if (!text.startsWith(open, i)) { i += 1; continue; }

    const from = i + open.length;
    // `(.+?)` needs a character, and that character may not be a line break.
    const end = BREAK.has(text[from]) ? -1 : at[from + 1];

    if (end === -1) { i += 1; continue; }

    found.push({ start: i, end: end + 2, from, to: end });
    i = end + 2;
  }

  return found;
};

const find = (text, char, start, end) => {
  for (let i = start; i < end; i += 1) if (text[i] === char) return i;

  return -1;
};

// i18next trims every part it reads, so the space around one is message text.
const trim = (text, start, end) => {
  let from = start;
  let to = end;

  while (from < to && /\s/.test(text[from])) from += 1;
  while (to > from && /\s/.test(text[to - 1])) to -= 1;

  return [from, to];
};

const fill = (kinds, kind, start, end) => { if (end > start) kinds.fill(kind, start, end); };

const part = (kinds, kind, [start, end]) => fill(kinds, kind, start, end);

// `name: value` pairs separated by `;` — a comma belongs to the value.
const options = (text, kinds, start, end) => {
  let i = start;

  while (i <= end) {
    const semicolon = find(text, ';', i, end);
    const stop = semicolon === -1 ? end : semicolon;
    const colon = find(text, ':', i, stop);

    if (colon === -1) part(kinds, 'option', trim(text, i, stop));
    else {
      part(kinds, 'option', trim(text, i, colon));
      fill(kinds, 'punctuation', colon, colon + 1);
      part(kinds, 'option', trim(text, colon + 1, stop));
    }

    fill(kinds, 'punctuation', stop, Math.min(stop + 1, end));
    i = stop + 1;
  }
};

// `name`, or `name(options)`. An unclosed `(` runs to the end of the format.
const format = (text, kinds, start, end) => {
  const open = find(text, '(', start, end);

  if (open === -1) { fill(kinds, 'modifier', start, end); return; }

  fill(kinds, 'modifier', start, open);
  fill(kinds, 'punctuation', open, open + 1);

  const close = text[end - 1] === ')' && end - 1 > open ? end - 1 : end;

  options(text, kinds, open + 1, close);
  fill(kinds, 'punctuation', close, end);
};

// Formats are separated by `,`, except that one which opened a `(` it has not
// closed swallows the next — that is how i18next reads them back.
const formats = (text, kinds, start, end) => {
  let i = start;

  while (i <= end) {
    let stop = i;

    for (;;) {
      const comma = find(text, ',', stop, end);

      if (comma === -1) { stop = end; break; }

      const piece = text.slice(i, comma);

      if (piece.includes('(') && !piece.includes(')')) { stop = comma + 1; continue; }

      stop = comma;
      break;
    }

    format(text, kinds, ...trim(text, i, stop));
    fill(kinds, 'punctuation', stop, Math.min(stop + 1, end));
    i = stop + 1;
  }
};

const placeholder = (text, kinds, { start, end, from, to }) => {
  fill(kinds, 'punctuation', start, from);
  fill(kinds, 'punctuation', to, end);

  const comma = find(text, ',', from, to);

  part(kinds, 'key', trim(text, from, comma === -1 ? to : comma));

  if (comma === -1) return;

  fill(kinds, 'punctuation', comma, comma + 1);
  formats(text, kinds, ...trim(text, comma + 1, to));
};

const paint = (text, kinds) => {
  const at = closers(text);
  // The unescaping pass runs first and over the whole message, so what it
  // takes is no longer there for the second pass to find.
  const unescaped = scan(text, '{{-', at);
  let taken = 0;

  const rest = scan(text, '{{', at).filter(({ start, end }) => {
    while (taken < unescaped.length && unescaped[taken].end <= start) taken += 1;

    return taken === unescaped.length || unescaped[taken].start >= end;
  });

  [...unescaped, ...rest].forEach((one) => placeholder(text, kinds, one));
};

export const highlight = (text) => drawSpans(text, paint);
