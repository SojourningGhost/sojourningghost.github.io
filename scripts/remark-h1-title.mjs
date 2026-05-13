export function remarkH1Title() {
  return (tree, file) => {
    const fm = (file.data.astro ??= {}).frontmatter ??= {};
    if (fm.title) return;

    let found = false;
    visit(tree, 'heading', (node) => {
      if (found || node.depth !== 1) return;
      found = true;
      const text = extractText(node).trim();
      if (text) fm.title = text;
    });
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
