// Convert Aozora-style ruby markup to HTML <ruby> elements.
//
//   ｜弥助《Yasuke》  →  <ruby>弥助<rt>Yasuke</rt></ruby>
//   |健《すく》やかに →  <ruby>健<rt>すく</rt></ruby>やかに
//
// Both the full-width vertical bar ｜ (U+FF5C) and the ASCII pipe | are
// accepted as base-text markers, matching the behaviour of the Obsidian
// Markdown Furigana plugin used to author the source files.
//
// An explicit pipe is REQUIRED. The "bare run-of-kanji" Aozora shorthand
// (e.g. 漢字《かんじ》 with no pipe) is intentionally NOT recognised, because
// this site uses 《…》 as Japanese guillemets for quotation in linguistics
// notes (see src/pages/覚書/文法.md, 漢字表記.md). Auto-attaching those to a
// preceding kanji would corrupt that content.

const RUBY = /[｜|]([^｜|《》\n]+)《([^《》\n]+)》/g;

export function remarkRuby() {
  return (tree) => walk(tree);
}

function walk(node) {
  if (!node || !Array.isArray(node.children)) return;
  const next = [];
  for (const child of node.children) {
    if (child.type === 'text' && hasMarker(child.value)) {
      for (const part of splitRuby(child.value)) next.push(part);
    } else {
      next.push(child);
      walk(child);
    }
  }
  node.children = next;
}

function hasMarker(s) {
  return s.includes('｜') || s.includes('|');
}

function splitRuby(text) {
  const out = [];
  let lastIndex = 0;
  let match;
  RUBY.lastIndex = 0;
  while ((match = RUBY.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push({ type: 'text', value: text.slice(lastIndex, match.index) });
    }
    const base = escapeHtml(match[1]);
    const reading = escapeHtml(match[2]);
    out.push({ type: 'html', value: `<ruby>${base}<rt>${reading}</rt></ruby>` });
    lastIndex = match.index + match[0].length;
  }
  if (out.length === 0) return [{ type: 'text', value: text }];
  if (lastIndex < text.length) {
    out.push({ type: 'text', value: text.slice(lastIndex) });
  }
  return out;
}

function escapeHtml(s) {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}
