import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clean } from '../scripts/clean-obsidian-export.mjs';

const fixture = readFileSync(new URL('./fixtures/chart-snippet.html', import.meta.url), 'utf8');

test('strips the Liquid <base> tag', () => {
  const out = clean(fixture);
  assert.ok(!out.includes("{{ '/' | relative_url }}"));
  assert.ok(!/<base\b[^>]*>/i.test(out));
});

test('strips the site-lib include link', () => {
  const out = clean(fixture);
  assert.ok(!out.includes('site-lib/html/custom-head-content-content.html'));
});

test('strips the graph-view-wrapper element and its contents', () => {
  const out = clean(fixture);
  assert.ok(!out.includes('graph-view-wrapper'));
  assert.ok(!out.includes('graph-canvas'));
});

test('injects a return link tagged with data-sg-return-link', () => {
  const out = clean(fixture);
  assert.match(out, /data-sg-return-link/);
  assert.match(out, /← 目次/);
  assert.match(out, /href="\/"/);
});

test('rewrites "file:" === location.protocol checks to true', () => {
  const out = clean(fixture);
  assert.ok(!/"file:"\s*===?\s*(?:window\.)?location\.protocol/.test(out));
  assert.ok(out.includes('if (true) { useInlineData(); }'));
  assert.ok(out.includes('if (true) { localBranch(); } else { httpBranch(); }'));
});

test('rewrites "file:" !== location.protocol checks to false', () => {
  const out = clean(fixture);
  assert.ok(!/"file:"\s*!==?\s*(?:window\.)?location\.protocol/.test(out));
  assert.ok(out.includes('this.isHttp = false;'));
  assert.ok(out.includes('if (false) await loadIncludes();'));
});

test('is idempotent (running on cleaned output makes no further change)', () => {
  const once = clean(fixture);
  const twice = clean(once);
  assert.equal(twice, once);
});
