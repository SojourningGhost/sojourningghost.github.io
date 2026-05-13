import { test } from 'node:test';
import assert from 'node:assert/strict';
import { unified } from 'unified';
import remarkParse from 'remark-parse';
import { remarkH1Title } from '../scripts/remark-h1-title.mjs';

function fakeFile(fm = {}) {
  return { data: { astro: { frontmatter: fm } } };
}

function parseTree(md) {
  return unified().use(remarkParse).parse(md);
}

function run(md, fm = {}) {
  const file = fakeFile(fm);
  const tree = parseTree(md);
  remarkH1Title()(tree, file);
  return file.data.astro.frontmatter;
}

test('bare H1 becomes the title', () => {
  const fm = run('# My Article\n\nBody text.');
  assert.equal(fm.title, 'My Article');
});

test('H1 with inline emphasis yields plain text only', () => {
  const fm = run('# **Bold** title\n\nBody.');
  assert.equal(fm.title, 'Bold title');
});

test('H1 with inline code yields plain text only', () => {
  const fm = run('# Using `foo()` here\n\nBody.');
  assert.equal(fm.title, 'Using foo() here');
});

test('existing frontmatter title is not overwritten', () => {
  const fm = run('# H1 Title\n\nBody.', { title: 'Existing Title' });
  assert.equal(fm.title, 'Existing Title');
});

test('no H1 in document leaves frontmatter.title unset', () => {
  const fm = run('## Section Header\n\nBody with no H1.');
  assert.equal(fm.title, undefined);
});

test('only the first H1 wins when multiple H1s are present', () => {
  const fm = run('# Real Title\n\nSome content.\n\n# Other H1\n\nMore.');
  assert.equal(fm.title, 'Real Title');
});

test('top-level H1 wins over a blockquote-nested H1 that appears first', () => {
  const fm = run('> # Inside quote\n\n# Real Title');
  assert.equal(fm.title, 'Real Title');
});

test('empty-string title in frontmatter is not overwritten', () => {
  const fm = run('# Some Heading', { title: '' });
  assert.equal(fm.title, '');
});

test('follows same file.data.astro.frontmatter shape as remark-auto-layout', () => {
  // Verify the plugin initialises file.data.astro.frontmatter if missing
  const file = { data: {} };
  const tree = parseTree('# Created on the fly');
  remarkH1Title()(tree, file);
  assert.equal(file.data.astro.frontmatter.title, 'Created on the fly');
});
