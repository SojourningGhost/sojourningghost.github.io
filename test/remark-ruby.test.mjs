import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { remarkRuby } from '../scripts/remark-ruby.mjs';

function render(md) {
  return unified()
    .use(remarkParse)
    .use(remarkRuby)
    .use(remarkStringify)
    .processSync(md)
    .toString()
    .trimEnd();
}

test('full-width pipe ruby converts to <ruby><rt>', () => {
  assert.equal(
    render('see ｜弥助《Yasuke》 here'),
    'see <ruby>弥助<rt>Yasuke</rt></ruby> here'
  );
});

test('half-width pipe ruby also converts', () => {
  assert.equal(
    render('|健《すく》やかに'),
    '<ruby>健<rt>すく</rt></ruby>やかに'
  );
});

test('multiple ruby spans in one paragraph all convert', () => {
  assert.equal(
    render('|入《い》らざれば虎兒を|得《う》る'),
    '<ruby>入<rt>い</rt></ruby>らざれば虎兒を<ruby>得<rt>う</rt></ruby>る'
  );
});

test('English base with spaces and punctuation in the reading converts', () => {
  assert.equal(
    render("｜the administration《this answers 'who'》"),
    "<ruby>the administration<rt>this answers 'who'</rt></ruby>"
  );
});

test('bare 《…》 without a leading pipe is left as-is (used as Japanese guillemets)', () => {
  // This is the load-bearing case — 文法.md and 漢字表記.md rely on it.
  assert.equal(
    render('専門委員会《で》解決策は決められなかった'),
    '専門委員会《で》解決策は決められなかった'
  );
});

test('surrounding inline content survives untouched', () => {
  assert.equal(
    render('before *em* ｜弥助《Yasuke》 after'),
    'before *em* <ruby>弥助<rt>Yasuke</rt></ruby> after'
  );
});

test('ruby inside a blockquote still converts', () => {
  assert.equal(
    render('> ｜弥助《Yasuke》'),
    '> <ruby>弥助<rt>Yasuke</rt></ruby>'
  );
});

test('paragraph with no markers passes through untouched', () => {
  assert.equal(render('plain text, no ruby'), 'plain text, no ruby');
});

test('ampersands in base or reading are HTML-escaped', () => {
  // remark-parse passes `&` through as a literal text char (no entity decoding),
  // so this is the realistic shape of "metacharacter in ruby content".
  assert.equal(
    render('｜Heart & Soul《心 & 魂》'),
    '<ruby>Heart &amp; Soul<rt>心 &amp; 魂</rt></ruby>'
  );
});
