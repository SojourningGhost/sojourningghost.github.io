import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { remarkSoftBreaks } from '../scripts/remark-soft-breaks.mjs';

function render(md) {
  return unified()
    .use(remarkParse)
    .use(remarkSoftBreaks)
    .use(remarkStringify)
    .processSync(md)
    .toString()
    .trimEnd();
}

test('single newline inside a paragraph becomes a hard break', () => {
  const input = 'first line\nsecond line';
  // remark-stringify renders a `break` node as a backslash + newline.
  assert.equal(render(input), 'first line\\\nsecond line');
});

test('multiple soft-broken lines all become hard breaks', () => {
  const input = 'a\nb\nc\nd';
  assert.equal(render(input), 'a\\\nb\\\nc\\\nd');
});

test('paragraph break (blank line) is preserved as a paragraph break', () => {
  const input = 'first paragraph\n\nsecond paragraph';
  assert.equal(render(input), 'first paragraph\n\nsecond paragraph');
});

test('blockquote with soft breaks gets hard breaks', () => {
  const input = '> line one\n> line two';
  assert.equal(render(input), '> line one\\\n> line two');
});

test('plain single-line text passes through unchanged', () => {
  assert.equal(render('one line only'), 'one line only');
});

test('fenced code block contents are not touched', () => {
  const input = '```\nlet a = 1\nlet b = 2\n```';
  assert.equal(render(input), '```\nlet a = 1\nlet b = 2\n```');
});
