import { readFileSync, writeFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';

const RETURN_LINK = `<a href="/" data-sg-return-link style="position:fixed;top:16px;left:16px;z-index:9999;padding:8px 14px;background:#f5f1e8;color:#1a1814;text-decoration:none;font:15px/1.2 'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;border:1px solid #d8d0c0;border-radius:2px;box-shadow:0 1px 3px rgba(26,24,20,0.08);">← 目次</a>`;

export function clean(html) {
  let out = html;

  out = out.replace(/<base\b[^>]*>/gi, '');

  out = out.replace(/<link\b[^>]*site-lib\/[^>]*>/gi, '');

  out = out.replace(
    /<div\b[^>]*class="[^"]*\bgraph-view-wrapper\b[^"]*"[^>]*>[\s\S]*?<\/div>/i,
    ''
  );

  // The obsidian export's inline JS branches on location.protocol === "file:" to
  // choose between an inline-data path (self-contained, no network) and an http
  // path that fetches site-lib/* files we don't have. Force every check to the
  // inline-data branch so the chart works under any origin.
  out = out.replace(/"file:"\s*===?\s*(?:window\.)?location\.protocol/g, 'true');
  out = out.replace(/"file:"\s*!==?\s*(?:window\.)?location\.protocol/g, 'false');

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
