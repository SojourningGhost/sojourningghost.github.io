const WIKILINK = /!?\[\[([^\]]+)\]\]/g;

export function remarkWikilinkStrip() {
  return (tree) => {
    visit(tree, 'text', (node) => {
      if (!WIKILINK.test(node.value)) return;
      WIKILINK.lastIndex = 0;
      node.value = node.value.replace(WIKILINK, (_, inner) => {
        const pipe = inner.indexOf('|');
        return pipe >= 0 ? inner.slice(pipe + 1) : inner;
      });
    });
  };
}

function visit(node, type, fn) {
  if (node.type === type) fn(node);
  if (node.children) for (const child of node.children) visit(child, type, fn);
}
