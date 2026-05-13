const VIDEO_ID = /(?:youtube\.com\/(?:watch\?v=|shorts\/|embed\/)|youtu\.be\/)([\w-]{11})/;
const TIMESTAMP = /[?&](?:t|start)=(\d+h)?(\d+m)?(\d+s?)?/;

export function remarkYoutubeEmbed() {
  return (tree) => {
    if (!Array.isArray(tree.children)) return;
    for (let i = 0; i < tree.children.length; i++) {
      const node = tree.children[i];
      if (node.type !== 'paragraph' || !node.children || node.children.length !== 1) continue;

      const child = node.children[0];
      let url = null;
      if (child.type === 'link') url = child.url;
      else if (child.type === 'text') url = child.value.trim();
      if (!url) continue;

      const idMatch = url.match(VIDEO_ID);
      if (!idMatch) continue;

      const start = parseTimestamp(url);
      const src = `https://www.youtube-nocookie.com/embed/${idMatch[1]}?rel=0${start ? `&start=${start}` : ''}`;
      const html = `<div class="youtube-embed"><iframe src="${src}" title="YouTube video" loading="lazy" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerpolicy="strict-origin-when-cross-origin" allowfullscreen></iframe></div>`;
      tree.children[i] = { type: 'html', value: html };
    }
  };
}

function parseTimestamp(url) {
  const m = url.match(TIMESTAMP);
  if (!m) return null;
  const h = m[1] ? parseInt(m[1], 10) : 0;
  const mm = m[2] ? parseInt(m[2], 10) : 0;
  const s = m[3] ? parseInt(m[3], 10) : 0;
  const total = h * 3600 + mm * 60 + s;
  return total > 0 ? total : null;
}
