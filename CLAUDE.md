# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working in this repository.

## What this repo is

A personal portfolio at <https://sojourningghost.github.io/>. The owner ("SojourningGhost") is a translator and editor; the site holds Japanese↔English translations, essays on Japanese language, English editing samples of game reviews, a Final Fantasy XI mod, language notes, and one large interactive HTML chart of Japanese imperial titles.

## How the site is built and deployed

- **Astro** at the repo root (currently 6.x). Markdown content lives in `src/pages/**/*.md`; filenames map directly to URLs.
- **GitHub Actions** builds and deploys on every push to `main` (`.github/workflows/deploy.yml`). The Pages "Source" setting must be "GitHub Actions", not a branch.
- **No local build, lint, or test gates beyond what's checked into `package.json`.** `npm run dev` for preview; `npm run build` to compile; `npm run preview` to serve the compiled output.
- **Node 22** is required (engines pin). Both the workflow and the engines field assume it.

## Repo layout

```
.github/workflows/deploy.yml   # build + deploy to Pages
astro.config.mjs               # wires remark plugins + sitemap
package.json
plans/                         # design rationale + the executed plan
public/                        # static pass-through
  改造/FFXI/conversion.lua     # mod download
  図/皇室称号図/                # the 3 MB Obsidian chart + its images
scripts/
  clean-obsidian-export.mjs    # prebuild step that strips chart rot
  remark-auto-layout.mjs       # assigns layouts by file path
  remark-wikilink-strip.mjs    # turns [[wikilinks]] into plain text
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

No `layout:` frontmatter is required — drop a `.md` in the right folder and it routes and styles correctly. Frontmatter `title:` is optional; the file's H1 or filename works as a fallback.

The auto-listing in `Section.astro` and `Home.astro` uses `import.meta.glob` and sorts with `localeCompare(..., 'ja')`. Folder names and titles in CJK sort correctly without extra configuration.

## The imperial chart

`public/図/皇室称号図/皇室称号図.html` is a ~3 MB single-file Obsidian export. It is pass-through — Astro does not process it.

- **Do not `Read` the file whole** — it exceeds the tool's token budget. Use Grep on it or read by byte offset.
- The `.canvas` JSON next to it is the editable source in Obsidian; the `.html` is a re-export.
- A `prebuild` step (`scripts/clean-obsidian-export.mjs`) runs automatically before every build and re-runs idempotently. It strips a Liquid `<base>` tag left over from the Jekyll era, a `<link itemprop="include" href="site-lib/...">` that 404s on Pages, and a `.graph-view-wrapper` element whose mount triggers a wasm fetch. It then injects a fixed-position 「← 目次」 return link tagged with `data-sg-return-link` (used as the idempotency marker).
- Re-exporting the chart from Obsidian: overwrite the `.html` and re-build. The cleanup runs automatically.
- Pre-existing "Failed to find all required elements for canvas node" console noise in the chart is harmless and shows up locally too.

## Wikilinks

Obsidian wikilink syntax — `[[Note]]`, `[[Note|alias]]`, `[[Note#anchor]]`, `![[image.jpg]]` — is handled by `scripts/remark-wikilink-strip.mjs`. All forms are reduced to plain text (the alias if present, otherwise the bare target). None of the wikilinks present in the migrated content actually point to pages or assets on this site, so resolving them as links would produce dead navigation.

To author proper site-internal navigation, write standard markdown links (`[text](/section/page/)`).

## Image references in markdown

Markdown image syntax with spaces in the URL must use CommonMark angle-bracket form: `![alt](</編輯/Foo Bar/Attachments/baz.png>)`. Without the angle brackets, the markdown parser truncates at the first space and emits the literal `![alt](...)` text. This affects all the game-review pages whose attachments live in folders with spaces.

## Conventions

- **Commit style is terse, lowercase, imperative.** Match the existing log: `migrate translations section`, `wire chart cleanup as prebuild`, etc. One to five words is typical for the subject.
- **No co-author lines, no Claude attribution** on commits.
- **All `npm install` / `npm add` use `--ignore-scripts` and `--save-exact`.** No semver ranges.
- **Filenames and folders are Japanese.** Most paths contain CJK characters. Shells, Node, and Astro handle them fine; expect URL-encoded forms in build logs and browser address bars.
- **For non-ASCII paths on Windows,** if `Write` fails with EEXIST or path-encoding errors (a known Claude Code regression), fall back to writing via Bash heredoc or Python.

## Verifying a fix

Because there's no test suite for layout/content correctness, "tests pass" doesn't mean "feature works." Run `npm run dev` and load the affected URL in a browser. After pushing to `main`, watch the Actions tab for the deploy run, then load the live URL.

## Where the design rationale lives

`plans/2026-05-12-site-revamp-design.md` is the design doc; `plans/2026-05-12-site-revamp.md` is the executable plan that drove the migration from Jekyll. They document why the architecture is what it is.
