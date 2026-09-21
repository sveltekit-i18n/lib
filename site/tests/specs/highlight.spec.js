import { describe, expect, it } from 'vitest';
import { createHighlighter } from 'shiki';

import { highlightCurly, highlightJson, highlightJsonText, highlightPlain } from '$lib/highlight.js';
import { highlight as i18next } from '$lib/playground/flavours/i18next.js';
import { highlight as icu } from '$lib/playground/flavours/icu.js';
import { highlight as mf2 } from '$lib/playground/flavours/mf2.js';
import { MESSAGES, PAYLOAD, TRANSLATIONS } from '$lib/playground.js';

/**
 * GitHub's theme as Shiki emits it, restated rather than imported: a drawing
 * names no kinds, only colours, and the whole point of these pairs is that they
 * are the ones Shiki puts on the page beside them. Changing `highlight.js` must
 * mean changing this too, and `describes the same block Shiki does` below
 * checks the pairs against a live render.
 */
const PALETTE = {
  plain: ['#24292E', '#E1E4E8'],
  key: ['#005CC5', '#79B8FF'],
  string: ['#032F62', '#9ECBFF'],
  punctuation: ['#D73A49', '#F97583'],
  modifier: ['#6F42C1', '#B392F0'],
  option: ['#E36209', '#FFAB70'],
  escape: ['#22863A', '#85E89D'],
};

const KIND = Object.fromEntries(Object.entries(PALETTE).map(([kind, [light]]) => [light, kind]));

const RUN = /<span style="--shiki-light:(#[0-9A-F]{6});--shiki-dark:(#[0-9A-F]{6})">([\s\S]*?)<\/span>/g;

/** One `.line` span holding runs, and nothing a visitor typed that is not escaped. */
const LINE = /^<span class="line">(?:<span style="--shiki-light:#[0-9A-F]{6};--shiki-dark:#[0-9A-F]{6}">(?:[^&<>]|&amp;|&lt;|&gt;)*<\/span>)*<\/span>$/;

// The ampersand last, or it would undo the two before it.
const unescape = (text) => text.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');

const runsOf = (line) => [...line.matchAll(RUN)].map(([, light, dark, text]) => ({ light, dark, text }));

const linesOf = (markup) => markup.split('\n').map(runsOf);

/** The drawing as `kind(text)` runs, ` <NL> ` between lines — what the tables pin. */
const mapOf = (markup) => linesOf(markup)
  .map((runs) => runs.map(({ light, text }) => `${KIND[light] ?? light}(${unescape(text)})`).join(' '))
  .join(' <NL> ');

/** The text the drawing puts on screen, which must be the text that went in. */
const textOf = (markup) => linesOf(markup)
  .map((runs) => runs.map(({ text }) => unescape(text)).join(''))
  .join('\n');

const bodyOf = (block) => block.slice(block.indexOf('<code>') + '<code>'.length, block.lastIndexOf('</code>'));

const DRAWINGS = {
  curly: highlightCurly,
  icu,
  mf2,
  i18next,
  json: highlightJsonText,
  plain: highlightPlain,
};

const prefixes = (text) => Array.from({ length: text.length + 1 }, (unused, cut) => text.slice(0, cut));

/**
 * Shapes nothing renders but a textarea accepts. The two long ones are the only
 * inputs that reach ICU's depth guard — nesting is what recurses there, length
 * is not — and every painter is held to them because a paste is a keystroke too.
 */
const HOSTILE = [
  '', '{', '}', '{{', '}}', "'", "''", '\\', '|', '#', '<', '</', '&<>', '\r', '\t',
  '\u2028', '\u2029', '\u{1F600}', '{{{{{{x}}', '{'.repeat(300), '{{'.repeat(500),
  '<a>'.repeat(20000), '{n,plural,one {'.repeat(20000),
];

/**
 * Every message the playground ships and every prefix of it: the editor redraws
 * on each keystroke, so an unfinished message is the ordinary case. It draws
 * `${value}\n`, so each input is held both ways.
 */
const CORPUS = [...[...Object.values(MESSAGES), PAYLOAD, TRANSLATIONS].flatMap(prefixes), ...HOSTILE]
  .flatMap((text) => [text, `${text}\n`]);

const attempt = (name, text) => {
  try {
    return { name, text, markup: DRAWINGS[name](text) };
  } catch (error) {
    return { name, text, error };
  }
};

// One pass, read by every invariant below: drawing the corpus six ways is the
// only slow thing here.
const DRAWN = Object.keys(DRAWINGS).flatMap((name) => CORPUS.map((text) => attempt(name, text)));

const drawings = () => DRAWN.filter(({ markup }) => markup !== undefined);

const where = ({ name, text }) => `${name} on ${JSON.stringify(text.length > 60 ? `${text.slice(0, 57)}...` : text)}`;

describe('every drawing', () => {
  it('draws whatever a textarea accepts', () => {
    expect(DRAWN.filter(({ error }) => error).map((one) => `${where(one)}: ${one.error.message}`)).toEqual([]);
  });

  it('gives back exactly the text it was given', () => {
    const lost = drawings().filter(({ text, markup }) => textOf(markup) !== text);

    expect(lost.map(where)).toEqual([]);
  });

  // The drawing goes through `{@html}` under a transparent textarea, so this is
  // the boundary that makes a visitor's own text safe to draw — and it is
  // stronger than the round trip above, which an unescaped `&lt;` would survive.
  it('lets nothing but its own spans through', () => {
    const stray = drawings().filter(({ markup }) => !markup.split('\n').every((line) => LINE.test(line)));

    expect(stray.map(where)).toEqual([]);
  });

  it('paints in the palette, and never crosses its halves', () => {
    const off = drawings().filter(({ markup }) => linesOf(markup).flat()
      .some(({ light, dark }) => PALETTE[KIND[light]]?.[1] !== dark));

    expect(off.map(where)).toEqual([]);
  });

  // `draw` merges a run into the one before it, so a correct drawing carries one
  // span per maximal run. Without the merge every keystroke ships one span per
  // character and nothing looks any different.
  it('emits one span per run of a colour', () => {
    const split = drawings().filter(({ markup }) => linesOf(markup)
      .some((runs) => runs.some(({ light }, index) => index && runs[index - 1].light === light)));

    expect(split.map(where)).toEqual([]);
  });

  // `Editor.svelte` draws `${value}\n` so the caret on a fresh last line has a
  // line box to sit in; without the empty trailing `.line` the textarea and the
  // drawing under it scroll apart.
  it('closes a trailing newline with an empty line box', () => {
    Object.values(DRAWINGS).forEach((draw) => {
      expect(draw('')).toBe('<span class="line"></span>');
      expect(draw('x\n')).toMatch(/\n<span class="line"><\/span>$/);
    });
  });
});

describe('a JSON block', () => {
  const THEMES = { light: 'github-light', dark: 'github-dark' };

  const shiki = async (code) => (await createHighlighter({ themes: Object.values(THEMES), langs: ['json'] }))
    .codeToHtml(code, { lang: 'json', themes: THEMES, defaultColor: false });

  // `highlightJson` writes its own `<pre>` wrapper, on pages that also carry real
  // Shiki blocks. Nothing but a live render says whether the two still match.
  it('wraps itself the way Shiki wraps a block', async () => {
    const real = await shiki('{}');
    const ours = highlightJson({});

    expect(ours).toBe(real);
  });

  it('reads a real Shiki block as its own markup', async () => {
    const real = await shiki('{\n  "count": 1234\n}');

    bodyOf(real).split('\n').forEach((line) => expect(line).toMatch(LINE));
    expect(linesOf(bodyOf(real)).flat().every(({ light, dark }) => PALETTE[KIND[light]]?.[1] === dark)).toBe(true);
  });

  it('indents a value it is given, two spaces deep', () => {
    expect(mapOf(bodyOf(highlightJson({ nav: { home: 'Home' }, tags: ['new'] })))).toBe(
      'plain({) <NL> plain(  ) key("nav") plain(: {) <NL> plain(    ) key("home") plain(: ) string("Home")'
      + ' <NL> plain(  },) <NL> plain(  ) key("tags") plain(: [) <NL> plain(    ) string("new") <NL> plain(  ]) <NL> plain(})',
    );
  });
});

/**
 * What each format is drawn as, observed from the painters themselves. The
 * notation is the one `mapOf` emits: `kind(text)` runs in order, ` <NL> ` where
 * the drawing breaks a line.
 */
const CASES = {
  curly: [
    ['You have {{count:number;}} {{count; 1:message; default:messages;}}.',
      'plain(You have ) punctuation({{) key(count) punctuation(:) modifier(number) punctuation(;}}) plain( ) punctuation({{) key(count) punctuation(;) plain( ) option(1) punctuation(:) plain(message) punctuation(;) plain( ) option(default) punctuation(:) plain(messages) punctuation(;}}) plain(.)'],
    // An option's VALUE is message text: `currency` and `USD` are plain, not option.
    ['{{value:number;style:currency;currency:USD;}}',
      'punctuation({{) key(value) punctuation(:) modifier(number) punctuation(;) option(style) punctuation(:) plain(currency) punctuation(;) option(currency) punctuation(:) plain(USD) punctuation(;}})'],
    // ...until a placeholder inside it says otherwise.
    ['{{count; 1:one {{count}} thing; default:many;}}',
      'punctuation({{) key(count) punctuation(;) plain( ) option(1) punctuation(:) plain(one ) punctuation({{) key(count) punctuation(}}) plain( thing) punctuation(;) plain( ) option(default) punctuation(:) plain(many) punctuation(;}})'],
    // The one drawing that reaches the escape colour, and a newline inside braces.
    ['\\{\\{ and {{a\nb}}', 'escape(\\{\\{) plain( and {{a) <NL> plain(b}})'],
    ['a & b < c > d', 'plain(a & b < c > d)'],
    // The same input reads as a different message in every format below.
    ['{{{{{{x}}', 'plain({{{) punctuation({{) key({x) punctuation(}})'],
  ],
  icu: [
    ['You have {count, plural, one {# message} other {# messages}}.',
      'plain(You have ) punctuation({) key(count) punctuation(,) plain( ) modifier(plural) punctuation(,) plain( ) option(one) plain( ) punctuation({) key(#) plain( message) punctuation(}) plain( ) option(other) plain( ) punctuation({) key(#) plain( messages) punctuation(}}) plain(.)'],
    ['{count, plural, offset:1 one {# other} other {# others}}',
      'punctuation({) key(count) punctuation(,) plain( ) modifier(plural) punctuation(,) plain( ) option(offset) punctuation(:) option(1) plain( ) option(one) plain( ) punctuation({) key(#) plain( other) punctuation(}) plain( ) option(other) plain( ) punctuation({) key(#) plain( others) punctuation(}})'],
    // An explicit `=0` selector, a different branch from a keyword one.
    ['{n, plural, =0 {none} other {#}}',
      'punctuation({) key(n) punctuation(,) plain( ) modifier(plural) punctuation(,) plain( ) punctuation(=) option(0) plain( ) punctuation({) plain(none) punctuation(}) plain( ) option(other) plain( ) punctuation({) key(#) punctuation(}})'],
    ['{when, date, ::yyyyMMdd}',
      'punctuation({) key(when) punctuation(,) plain( ) modifier(date) punctuation(,) plain( ) punctuation(::) option(yyyyMMdd) punctuation(})'],
    ['{when, date, short}',
      'punctuation({) key(when) punctuation(,) plain( ) modifier(date) punctuation(,) plain( ) option(short) punctuation(})'],
    // A lone apostrophe quotes nothing, a quote before syntax opens a run, a
    // doubled one is the apostrophe itself.
    ["It's a '{brace}' and '' too", "plain(It's a ) string('{brace}') plain( and ) escape('') plain( too)"],
    // A quote quotes `#` only where `#` means something.
    ["{n, plural, one {'#'} other {#}}",
      "punctuation({) key(n) punctuation(,) plain( ) modifier(plural) punctuation(,) plain( ) option(one) plain( ) punctuation({) string('#') punctuation(}) plain( ) option(other) plain( ) punctuation({) key(#) punctuation(}})"],
    // ...and outside a plural `#` is text.
    ['{a, select, x {#}}',
      'punctuation({) key(a) punctuation(,) plain( ) modifier(select) punctuation(,) plain( ) option(x) plain( ) punctuation({) plain(#) punctuation(}})'],
    // A brace inside a quoted style does not close the argument.
    ["{a, date, 'x}' y}", "punctuation({) key(a) punctuation(,) plain( ) modifier(date) punctuation(,) plain( ) option('x}' y) punctuation(})"],
    // A tag that closes itself is not a tag to the engine, only text.
    ['Click <a>here</a> and <a/> now',
      'plain(Click ) punctuation(<) modifier(a) punctuation(>) plain(here) punctuation(</) modifier(a) punctuation(>) plain( and <a/> now)'],
    ['x </b> y', 'plain(x ) punctuation(</) modifier(b) punctuation(>) plain( y)'],
    // `select` takes no offset, and the reading degrades where the engine's does.
    ['{a, select, offset:1 x {A} other {B}}',
      'punctuation({) key(a) punctuation(,) plain( ) modifier(select) punctuation(,) plain( ) option(offset) plain(:1 x ) punctuation({) key(A) punctuation(}) plain( other ) punctuation({) key(B) punctuation(}) plain(})'],
    ['{{{{{{x}}', 'punctuation({{{{{{) key(x) punctuation(}) plain(})'],
  ],
  mf2: [
    ['.input {$count :number}\n.match $count\none {{You have {$count} message.}}\n* {{You have {$count} messages.}}',
      'punctuation(.input) plain( ) punctuation({) key($count) plain( ) modifier(:number) punctuation(}) <NL> punctuation(.match) plain( ) key($count) <NL> option(one) plain( ) punctuation({{) plain(You have ) punctuation({) key($count) punctuation(}) plain( message.) punctuation(}}) <NL> option(*) plain( ) punctuation({{) plain(You have ) punctuation({) key($count) punctuation(}) plain( messages.) punctuation(}})'],
    // `.local` declares a target, which `.input` does not.
    ['.local $n = {$count :number}\n{{Hello {$n}}}',
      'punctuation(.local) plain( ) key($n) plain( ) punctuation(=) plain( ) punctuation({) key($count) plain( ) modifier(:number) punctuation(}) <NL> punctuation({{) plain(Hello ) punctuation({) key($n) punctuation(}}})'],
    // A quoted literal operand is a quoted run; a bare one stands in for the value.
    ['{$d :datetime style=long} {|a b|} {bare} {$x @attr=1}',
      'punctuation({) key($d) plain( ) modifier(:datetime ) option(style) punctuation(=) option(long) punctuation(}) plain( ) punctuation({) string(|a b|) punctuation(}) plain( ) punctuation({) key(bare) punctuation(}) plain( ) punctuation({) key($x) plain( ) option(@attr) punctuation(=) option(1) punctuation(})'],
    ['{#bold}x{/bold}', 'punctuation({) modifier(#bold) punctuation(}) plain(x) punctuation({) modifier(/bold) punctuation(})'],
    // Escapes have no node in the tree, and only these four characters escape.
    ['a \\{ b \\\\ c \\| d \\z e', 'plain(a ) escape(\\{) plain( b ) escape(\\\\) plain( c ) escape(\\|) plain( d \\z e)'],
    ['{|a\\|b|}', 'punctuation({) string(|a) escape(\\|) string(b|) punctuation(})'],
    // All three variant-key shapes at once.
    ['.match $n\n|a b| {{x}}\nbare {{y}}\n* {{z}}',
      'punctuation(.match) plain( ) key($n) <NL> string(|a b|) plain( ) punctuation({{) plain(x) punctuation(}}) <NL> option(bare) plain( ) punctuation({{) plain(y) punctuation(}}) <NL> option(*) plain( ) punctuation({{) plain(z) punctuation(}})'],
  ],
  i18next: [
    ['You have {{count, number}} messages.',
      'plain(You have ) punctuation({{) key(count) punctuation(,) plain( ) modifier(number) punctuation(}}) plain( messages.)'],
    // The `-` belongs to the sigil, and the two passes do not claim one twice.
    ['Hi {{- name}} and {{name}}!',
      'plain(Hi ) punctuation({{-) plain( ) key(name) punctuation(}}) plain( and ) punctuation({{) key(name) punctuation(}}) plain(!)'],
    ['{{price, currency(USD)}}',
      'punctuation({{) key(price) punctuation(,) plain( ) modifier(currency) punctuation(() option(USD) punctuation()}})'],
    // Options split on `;`, and the space i18next trims stays message text.
    ['{{v, number(minimumFractionDigits: 2; style: currency)}}',
      'punctuation({{) key(v) punctuation(,) plain( ) modifier(number) punctuation(() option(minimumFractionDigits) punctuation(:) plain( ) option(2) punctuation(;) plain( ) option(style) punctuation(:) plain( ) option(currency) punctuation()}})'],
    // A comma belongs to the value: an unclosed `(` swallows the next piece.
    ['{{v, number(x: 1, y: 2)}}',
      'punctuation({{) key(v) punctuation(,) plain( ) modifier(number) punctuation(() option(x) punctuation(:) plain( ) option(1, y: 2) punctuation()}})'],
    // The first colon splits, and the rest of the piece is the value.
    ['{{v, t(ns:key)}}',
      'punctuation({{) key(v) punctuation(,) plain( ) modifier(t) punctuation(() option(ns) punctuation(:) option(key) punctuation()}})'],
    // U+2028 is one of the four characters `.` does not match, so no placeholder.
    ['{{a\u2028b}}', 'plain({{a\u2028b}})'],
    ['{{a\nb}}', 'plain({{a) <NL> plain(b}})'],
    // `(.+?)` needs a character: a space is one, nothing is not.
    ['{{ }}', 'punctuation({{) plain( ) punctuation(}})'],
    ['{{}}', 'plain({{}})'],
    // Leftmost, then shortest, and never overlapping one already taken.
    ['{{{{{{x}}', 'punctuation({{) key({{{{x) punctuation(}})'],
    ['{{a}}{{b}}', 'punctuation({{) key(a) punctuation(}}{{) key(b) punctuation(}})'],
  ],
  json: [
    ['{\n  "count": 1234\n}', 'plain({) <NL> plain(  ) key("count") plain(: ) key(1234) <NL> plain(})'],
    ['{ "a": "b", "c": [1, true, null, -2.5e-3] }',
      'plain({ ) key("a") plain(: ) string("b") plain(, ) key("c") plain(: [) key(1) plain(, ) key(true) plain(, ) key(null) plain(, ) key(-2.5e-3) plain(] })'],
    ['[false]', 'plain([) key(false) plain(])'],
    // Mid-keystroke: a quoted run with no `:` after it is a value, not a name.
    ['{"a"', 'plain({) string("a")'],
    ['["<", "&"]', 'plain([) string("<") plain(, ) string("&") plain(])'],
    // A quote a JSON string escaped does not end the run — `JSON.stringify`
    // writes these, and the preprocess panel draws what it wrote.
    ['{"a": "say \\"hi\\"", "b": 1}',
      'plain({) key("a") plain(: ) string("say \\"hi\\"") plain(, ) key("b") plain(: ) key(1) plain(})'],
  ],
  // What the parser panel falls back to until a flavour's module has arrived.
  plain: [
    ['a & b < c > d', 'plain(a & b < c > d)'],
  ],
};

Object.entries(CASES).forEach(([flavour, cases]) => {
  describe(flavour, () => {
    cases.forEach(([input, expected]) => {
      it(`draws ${JSON.stringify(input.length > 48 ? `${input.slice(0, 45)}...` : input)}`, () => {
        expect(mapOf(DRAWINGS[flavour](input))).toBe(expected);
      });
    });
  });
});

describe('the palette', () => {
  const over = (drawn) => new Set(drawn.flatMap((markup) => linesOf(markup).flat()).map(({ light }) => KIND[light]));

  const swept = (name) => over(DRAWN.filter((one) => one.name === name && one.markup !== undefined).map(({ markup }) => markup));

  const cased = (flavour) => over(CASES[flavour].map(([input]) => DRAWINGS[flavour](input)));

  // `string` means a run the format quotes. i18next quotes nothing, and a Curly
  // option's value is message text — painting either in the string blue would
  // tell a visitor the format does something it does not. ICU and MF2 do quote,
  // and their tables above pin where.
  it('keeps `string` for the formats that quote', () => {
    expect([...swept('i18next')]).not.toContain('string');
    expect([...swept('curly')]).not.toContain('string');
    expect([...cased('icu')]).toContain('string');
    expect([...cased('mf2')]).toContain('string');
  });

  it('draws JSON as literals and text alone', () => {
    expect([...swept('json')].sort()).toEqual(['key', 'plain', 'string']);
    expect([...swept('plain')]).toEqual(['plain']);
  });

  // A colour no table reaches is a colour nothing would notice the loss of.
  it('is reached whole by the tables above', () => {
    const painted = Object.keys(CASES).flatMap((flavour) => [...cased(flavour)]);

    expect([...new Set(painted)].sort()).toEqual(Object.keys(PALETTE).sort());
  });
});
