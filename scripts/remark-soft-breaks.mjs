export function remarkSoftBreaks() {
  return (tree) => walk(tree);
}

function walk(node) {
  if (!node || !Array.isArray(node.children)) return;
  const next = [];
  for (const child of node.children) {
    if (child.type === 'text' && child.value.includes('\n')) {
      const parts = child.value.split('\n');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i].length) next.push({ type: 'text', value: parts[i] });
        if (i < parts.length - 1) next.push({ type: 'break' });
      }
    } else {
      next.push(child);
      walk(child);
    }
  }
  node.children = next;
}
