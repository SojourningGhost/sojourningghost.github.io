# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## What this repo is

A personal portfolio at <https://sojourningghost.github.io/>. The owner ("SojourningGhost") is a translator and editor; the site holds Japanese↔English translations, essays on Japanese language, English editing samples of game reviews, a Final Fantasy XI mod, language notes, and one large interactive HTML chart of Japanese imperial titles.

## How the site is built and deployed

- **Astro** at the repo root (currently 6.x). Markdown content lives in `src/pages/**/*.md`; filenames map directly to URLs.
- **GitHub Actions** builds and deploys on every push to `main` (`.github/workflows/deploy.yml`). The Pages "Source" setting must be "GitHub Actions", not a branch. CI runs `npm test` between `npm ci` and `npm run build`.
- **No local build, lint, or test gates beyond what's checked into `package.json`.** `npm run dev` for preview; `npm run build` to compile; `npm run preview` to serve the compiled output.
- **Node 22** is required (engines pin). Both the workflow and the engines field assume it.

## Repo layout

```
.github/workflows/deploy.yml   # build + deploy to Pages
.nvmrc                         # pins Node 22 for nvm/fnm/Volta
astro.config.mjs               # wires remark plugins + sitemap
package.json
public/                        # static pass-through
  改造/FFXI/conversion.lua     # mod download
  図/皇室称号図/                # the 3 MB Obsidian chart + its images
scripts/
  clean-obsidian-export.mjs    # prebuild/predev step that strips chart rot
  remark-auto-layout.mjs       # assigns layouts by file path
  remark-h1-title.mjs          # extracts H1 text into frontmatter.title
  remark-wikilink-strip.mjs    # turns [[wikilinks]] into plain text
source/
  図/皇室称号図/                # editable .canvas source + readme.txt (not served)
src/
  components/                  # Header, Footer, PageList
  layouts/                     # Default, Section, Home
  pages/                       # all content lives here
    index.md                   # → /
    <section>/index.md         # → /<section>/
    <section>/<page>.md        # → /<section>/<page>/
  styles/global.css            # site-wide styles
test/
  *.test.mjs                   # node:test suites
  fixtures/                    # test inputs
```

## Layout assignment (the no-frontmatter authoring path)

`scripts/remark-auto-layout.mjs` runs in the markdown pipeline and assigns a layout based on where the file lives:

- `src/pages/index.md` → `Home.astro` (auto-lists top-level sections)
- `src/pages/<section>/index.md` → `Section.astro` (auto-lists siblings)
- everything else → `Default.astro`

No `layout:` frontmatter is required — drop a `.md` in the right folder and it routes and styles correctly. Frontmatter `title:` is optional; the file's H1 or filename works as a fallback. The H1 fallback is implemented by `scripts/remark-h1-title.mjs`: it walks the AST, finds the first `heading` node at depth 1, and writes its plain text (emphasis and inline code stripped to their text content) into `frontmatter.title`. It runs before `remarkAutoLayout` in the plugin order.

The auto-listing in `Section.astro` and `Home.astro` uses `import.meta.glob` and sorts with `localeCompare(..., 'ja')`. Folder names and titles in CJK sort correctly without extra configuration.

## The imperial chart

`public/図/皇室称号図/皇室称号図.html` is a ~3 MB single-file Obsidian export. It is pass-through — Astro does not process it.

- **Do not `Read` the file whole** — it exceeds the tool's token budget. Use Grep on it or read by byte offset.
- The editable source (`.canvas` JSON + `readme.txt`) lives at `source/図/皇室称号図/` — tracked in git but not served publicly. The `画像/` images folder stays in `public/` because the chart HTML references them by relative URL.
- A `predev`/`prebuild` step (`scripts/clean-obsidian-export.mjs --scan public`) runs automatically before every `npm run dev` and `npm run build`. It glob-scans `public/` for every `*.html` file and runs `clean()` on each, re-running idempotently. Per file it: strips a Liquid `<base>` tag left over from the Jekyll era; strips the `<link itemprop="include" href="site-lib/...">` that 404s on Pages; strips the `.graph-view-wrapper` element whose mount triggers a wasm fetch; rewrites every `"file:" === location.protocol` check (and the `!==` variant) in the inline JS so the chart always takes its self-contained inline-data branch — without that rewrite, http-served versions fetch `site-lib/metadata.json` + `graph-wasm.wasm` (neither ships with the export), and pan/zoom never wires up; and injects a fixed-position 「← 目次」 return link tagged with `data-sg-return-link` (idempotency marker). The return-link href is derived automatically from the file path: a chart at `public/<section>/.../*.html` links back to `/<section>/`.
- Adding a new chart: export it anywhere under `public/`, link to it from the appropriate `src/pages/` index. No edits to `package.json` or any script needed — the glob-scan picks it up automatically.
- Re-exporting the imperial chart: overwrite `public/図/皇室称号図/皇室称号図.html` and run `npm run dev` or `npm run build`. The cleanup runs automatically.
- Pre-existing "Failed to find all required elements for canvas node" console noise in the chart is harmless and shows up locally too.

## Wikilinks

Obsidian wikilink syntax — `[[Note]]`, `[[Note|alias]]`, `[[Note#anchor]]`, `![[image.jpg]]` — is handled by `scripts/remark-wikilink-strip.mjs`. All forms are reduced to plain text (the alias if present, otherwise the bare target). None of the wikilinks present in the migrated content actually point to pages or assets on this site, so resolving them as links would produce dead navigation.

To author proper site-internal navigation, write standard markdown links (`[text](/section/page/)`).

## Image references in markdown

Markdown image syntax with spaces in the URL must use CommonMark angle-bracket form: `![alt](</編輯/Foo Bar/Attachments/baz.png>)`. Without the angle brackets, the markdown parser truncates at the first space and emits the literal `![alt](...)` text. This affects all the game-review pages whose attachments live in folders with spaces.

## Conventions

- **Commit style is terse, lowercase, imperative.** Match the existing log: `migrate translations section`, `wire chart cleanup as prebuild`, etc. One to five words is typical for the subject.
- **No co-author lines, no Claude attribution** on commits.
- **Work directly on `main` for this repo.** Don't create feature branches — commit straight to `main`. This overrides the global "feature branches only" default. (A global push-guard hook may still block pushing `main`; if it does, surface that to the user rather than silently branching around it.)
- **All `npm install` / `npm add` use `--ignore-scripts` and `--save-exact`.** No semver ranges.
- **Filenames and folders are Japanese.** Most paths contain CJK characters. Shells, Node, and Astro handle them fine; expect URL-encoded forms in build logs and browser address bars.
- **For non-ASCII paths on Windows,** if `Write` fails with EEXIST or path-encoding errors (a known Claude Code regression), fall back to writing via Bash heredoc or Python.

## Verifying a fix

Because there's no test suite for layout/content correctness, "tests pass" doesn't mean "feature works." Run `npm run dev` and load the affected URL in a browser. After pushing to `main`, watch the Actions tab for the deploy run, then load the live URL.

## Where the design rationale lives

The design doc and executed migration plan are preserved on the `archive/jekyll-docs` branch at `docs/plans/2026-05-12-site-revamp-design.md` and `docs/plans/2026-05-12-site-revamp.md`. They document why the architecture is what it is. The files were removed from `main` when the pre-Astro `docs/` tree was dropped; the archive branch is the canonical reference.
