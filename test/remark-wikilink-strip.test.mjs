import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import remarkStringify from 'remark-stringify';
import { remarkWikilinkStrip } from '../scripts/remark-wikilink-strip.mjs';

function strip(md) {
  return unified()
    .use(remarkParse)
    .use(remarkWikilinkStrip)
    .use(remarkStringify)
    .processSync(md)
    .toString()
    .trimEnd();
}

test('bare wikilink renders as its inner text', () => {
  assert.equal(strip('see [[Note Title]] here'), 'see Note Title here');
});

test('aliased wikilink renders as the alias', () => {
  assert.equal(strip('see [[Target|displayed alias]] here'), 'see displayed alias here');
});

test('wikilink with section anchor keeps the anchor in plain form', () => {
  assert.equal(strip('see [[VLADiK BBcode#1]] for context'), 'see VLADiK BBcode#1 for context');
});

test('image wikilink renders as its target text', () => {
  assert.equal(strip('![[diagram.jpg]]'), 'diagram.jpg');
});

test('image wikilink with alias renders the alias', () => {
  assert.equal(strip('![[long/path/to/file.avif|caption]]'), 'caption');
});

test('multiple wikilinks in one paragraph all transform', () => {
  assert.equal(
    strip('first [[a]] and second [[b|B]] and image ![[c.png]]'),
    'first a and second B and image c.png'
  );
});

test('paragraphs without wikilinks pass through untouched', () => {
  assert.equal(strip('plain text with no brackets'), 'plain text with no brackets');
});
