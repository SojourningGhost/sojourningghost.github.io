export function remarkH1Title() {
  return (tree, file) => {
    const fm = (file.data.astro ??= {}).frontmatter ??= {};
    if ('title' in fm) return;

    for (const child of tree.children ?? []) {
      if (child.type === 'heading' && child.depth === 1) {
        const text = extractText(child).trim();
        if (text) fm.title = text;
        return;
      }
    }
  };
}

function extractText(node) {
  let text = '';
  visit(node, null, (n) => {
    if (n.type === 'text' || n.type === 'inlineCode') text += n.value;
  });
  return text;
}

function visit(node, type, fn) {
  if (type === null || node.type === type) fn(node);
  if (node.children) for (const child of node.children) visit(child, type, fn);
}
