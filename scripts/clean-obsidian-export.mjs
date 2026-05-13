import { readFileSync, writeFileSync, readdirSync, statSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { join } from 'node:path';

function makeReturnLink(href) {
  return `<a href="${href}" data-sg-return-link style="position:fixed;top:16px;left:16px;z-index:9999;padding:8px 14px;background:#f5f1e8;color:#1a1814;text-decoration:none;font:15px/1.2 'Iowan Old Style','Palatino Linotype','Book Antiqua',Palatino,Georgia,serif;border:1px solid #d8d0c0;border-radius:2px;box-shadow:0 1px 3px rgba(26,24,20,0.08);">← 目次</a>`;
}

export function clean(html, returnHref = '/') {
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
    const link = makeReturnLink(returnHref);
    out = out.replace(/(<body\b[^>]*>)/i, `$1\n${link}`);
  }

  return out;
}

// Derive the return href from a file path under public/.
// public/<section>/.../<file>.html  →  /<section>/
// public/<file>.html                →  /
function hrefFromPath(filePath) {
  // Normalise separators to forward slash then strip leading public/
  const normalised = filePath.replace(/\\/g, '/').replace(/^.*?public\//, '');
  const segments = normalised.split('/');
  // segments[0] is either a top-level section folder or the html filename itself
  if (segments.length >= 2) {
    return `/${segments[0]}/`;
  }
  return '/';
}

// Recursively collect every *.html file under dir.
function findHtml(dir) {
  const results = [];
  for (const entry of readdirSync(dir)) {
    const full = join(dir, entry);
    if (statSync(full).isDirectory()) {
      results.push(...findHtml(full));
    } else if (entry.toLowerCase().endsWith('.html')) {
      results.push(full);
    }
  }
  return results;
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const arg1 = process.argv[2];

  if (arg1 === '--scan') {
    const scanDir = process.argv[3];
    if (!scanDir) {
      console.error('usage: clean-obsidian-export.mjs --scan <dir>');
      process.exit(1);
    }
    const files = findHtml(scanDir);
    for (const file of files) {
      const href = hrefFromPath(file);
      const before = readFileSync(file, 'utf8');
      const after = clean(before, href);
      if (before === after) {
        console.log(`clean-obsidian-export: ${file} already clean`);
      } else {
        writeFileSync(file, after, 'utf8');
        console.log(`clean-obsidian-export: cleaned ${file}`);
      }
    }
  } else {
    const target = arg1;
    if (!target) {
      console.error('usage: clean-obsidian-export.mjs <html-file>');
      process.exit(1);
    }
    const href = hrefFromPath(target);
    const before = readFileSync(target, 'utf8');
    const after = clean(before, href);
    if (before === after) {
      console.log(`clean-obsidian-export: ${target} already clean`);
    } else {
      writeFileSync(target, after, 'utf8');
      console.log(`clean-obsidian-export: cleaned ${target}`);
    }
  }
}
