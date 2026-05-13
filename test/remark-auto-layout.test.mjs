import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remarkAutoLayout } from '../scripts/remark-auto-layout.mjs';

function fakeFile(path) {
  return { path, data: { astro: { frontmatter: {} } } };
}

test('assigns Home layout to src/pages/index.md', () => {
  const file = fakeFile('/abs/src/pages/index.md');
  remarkAutoLayout()(null, file);
  assert.equal(file.data.astro.frontmatter.layout, '/src/layouts/Home.astro');
});

test('assigns Section layout to src/pages/<section>/index.md', () => {
  const file = fakeFile('/abs/src/pages/拙訳/index.md');
  remarkAutoLayout()(null, file);
  assert.equal(file.data.astro.frontmatter.layout, '/src/layouts/Section.astro');
});

test('assigns Default layout to a deep content page', () => {
  const file = fakeFile('/abs/src/pages/拙訳/Close to you英訳.md');
  remarkAutoLayout()(null, file);
  assert.equal(file.data.astro.frontmatter.layout, '/src/layouts/Default.astro');
});

test('does not overwrite an explicit layout in frontmatter', () => {
  const file = fakeFile('/abs/src/pages/拙訳/foo.md');
  file.data.astro.frontmatter.layout = '/src/layouts/Custom.astro';
  remarkAutoLayout()(null, file);
  assert.equal(file.data.astro.frontmatter.layout, '/src/layouts/Custom.astro');
});

test('normalizes Windows backslashes in the file path', () => {
  const file = fakeFile('C:\\repo\\src\\pages\\index.md');
  remarkAutoLayout()(null, file);
  assert.equal(file.data.astro.frontmatter.layout, '/src/layouts/Home.astro');
});
