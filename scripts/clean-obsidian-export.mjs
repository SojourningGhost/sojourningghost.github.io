import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const RETURN_LINK = `<a href="/" data-sg-return-link style="position:fixed;top:14px;left:14px;z-index:9999;padding:8px 14px;background:rgba(20,20,20,0.78);color:#f5f1ea;text-decoration:none;font:14px/1 system-ui,-apple-system,'Hiragino Mincho ProN','Yu Mincho',serif;border-radius:2px;backdrop-filter:blur(6px);">← 目次</a>`;

export function clean(html) {
  let out = html;

  out = out.replace(/<base\b[^>]*>/gi, '');

  out = out.replace(/<link\b[^>]*site-lib\/[^>]*>/gi, '');

  out = out.replace(
    /<div\b[^>]*class="[^"]*\bgraph-view-wrapper\b[^"]*"[^>]*>[\s\S]*?<\/div>/i,
    ''
  );

  if (!out.includes('data-sg-return-link')) {
    out = out.replace(/(<body\b[^>]*>)/i, `$1\n${RETURN_LINK}`);
  }

  return out;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const target = process.argv[2];
  if (!target) {
    console.error('usage: clean-obsidian-export.mjs <html-file>');
    process.exit(1);
  }
  const before = readFileSync(target, 'utf8');
  const after = clean(before);
  if (before === after) {
    console.log(`clean-obsidian-export: ${target} already clean`);
  } else {
    writeFileSync(target, after, 'utf8');
    console.log(`clean-obsidian-export: cleaned ${target}`);
  }
}
