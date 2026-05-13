export function remarkAutoLayout() {
  return (_tree, file) => {
    const fm = (file.data.astro ??= {}).frontmatter ??= {};
    if (fm.layout) return;

    const norm = file.path.replace(/\\/g, '/');
    const m = norm.match(/\/src\/pages\/(.+)$/);
    if (!m) return;
    const rel = m[1];

    if (rel === 'index.md') {
      fm.layout = '/src/layouts/Home.astro';
    } else if (/^[^/]+\/index\.md$/.test(rel)) {
      fm.layout = '/src/layouts/Section.astro';
    } else {
      fm.layout = '/src/layouts/Default.astro';
    }
  };
}
