# Site revamp — design

Date: 2026-05-12
Author: SojourningGhost (with Claude)
Status: approved, ready for implementation plan

## Problem statement

The current site (Jekyll + `jekyll-theme-minimal`, served from `/docs` on `main`) has four problems:

1. **Slow iteration.** Every change requires a push and a wait for GitHub Pages to rebuild. There is no local preview.
2. **The Obsidian-exported imperial-titles chart breaks on Pages.** Click-to-drag panning is dead. Console shows wasm and `site-lib/` 404s.
3. **The site is visually weak.** `jekyll-theme-minimal` is a placeholder, not a designed portfolio.
4. **Authoring friction.** The owner wants to drop `.md` files into the repo and have them publish, without touching layouts or doing per-file configuration.

## Diagnosis of the chart bug

Two compounding causes:

- The HTML head contains `<base href="{{ '/' | relative_url }}">`. The file has no Jekyll front-matter, so Liquid is not processed and the literal Liquid string ships to the browser. The browser uses that string as the page's base URL, so every relative URL on the page resolves against a garbage prefix (`%7B%7B%20'/...` in the console).
- The Obsidian "Webpage HTML Export" plugin references `graph-wasm.wasm` and `site-lib/html/custom-head-content-content.html` as siblings of the HTML. Neither file was ever committed. The wasm fetch failure throws an uncaught `RuntimeError` that kills the same async init chain canvas panning depends on.

Verified: the chart's full visual (titles, lines, flags) is rendered by data-URI–embedded images + 7 inline `<style>` blocks, with zero external stylesheets. Graph-view init is gated on `.graph-view-wrapper` existing in the DOM. The "Failed to find all required elements for canvas node" console errors are pre-existing benign noise from group-color nodes and appear in the local copy too.

## Architecture

### Tech stack

| Concern | Choice |
|---|---|
| Static site generator | **Astro** |
| Markdown handling | `src/pages/*.md` (auto-routed), not Content Collections |
| Optional richer pages | `@astrojs/mdx` (available, default stays `.md`) |
| SEO | `@astrojs/sitemap` |
| Raw HTML pass-through | `public/` |
| Hosting | **GitHub Pages**, deployed via GitHub Actions (not from a branch) |
| Node version | 22 (LTS), pinned in CI |
| Package manager | npm, with `--ignore-scripts` and `--save-exact` (per user's global supply-chain rules) |

### Why Astro, not the alternatives

Considered and rejected:
- **Hugo** — single-binary, faster builds, same content/static model. Lost on design-tool ergonomics: `/frontend-design` produces `.astro` components natively; Go templates fight against AI-generated design code.
- **Eleventy** — flexible, minimal. Layout work is more manual than Astro and the AI-generated-design fit is weaker.
- **Quartz** — purpose-built for Obsidian-vault publishing, but opinionated about layout (digital-garden / linked-notes look) and harder to customize for a curated portfolio. Source consensus: "doesn't have a modern UI."
- **SvelteKit / Next.js** — full app frameworks. Overkill for a static portfolio. More boilerplate and a heavier toolchain for no win.
- **Cloudflare Pages instead of GitHub Pages** — would unlock PR-preview deploys but requires a custom domain (the repo is `sojourningghost.github.io`, bound to GH Pages). Local preview closes the iteration gap. CF Pages noted as a future option.

### Repo layout (final)

```
sojourningghost.github.io/
├── .github/workflows/deploy.yml         # build → Pages
├── .gitignore                            # node_modules/, dist/, .astro/, .obsidian/
├── astro.config.mjs                      # mdx, sitemap, remark auto-layout plugin
├── package.json
├── scripts/
│   └── clean-obsidian-export.mjs         # idempotent cleanup; runs at prebuild
├── public/
│   └── 図/皇室称号図/                     # the chart, pass-through, untouched
│       ├── 皇室称号図.html
│       ├── 皇室称号図.canvas              # editable source kept alongside
│       └── 画像/
├── src/
│   ├── layouts/
│   │   ├── Default.astro                 # individual content pages
│   │   ├── Section.astro                 # section landings, auto-lists siblings
│   │   └── Home.astro                    # landing page
│   ├── pages/                            # filesystem == URL path
│   │   ├── index.md                      # was docs/readme.md  → /
│   │   ├── 拙訳/index.md                 # was docs/拙訳/readme.md
│   │   ├── 拙訳/<title>.md               # individual translations
│   │   ├── 拙論/index.md                 # new (none today); auto-lists 4 essays
│   │   ├── 拙論/<title>.md
│   │   ├── 改造/index.md                 # was 改造/readme.txt, .txt→.md
│   │   ├── 編輯/index.md
│   │   ├── 編輯/<game>/<file>.md
│   │   ├── 覚書/index.md                 # was 覚書/readme.txt, .txt→.md
│   │   ├── 覚書/<note>.md
│   │   └── 図/index.md                   # short landing; links to the chart
│   ├── components/                       # /frontend-design output lands here
│   └── styles/global.css
├── README.md
├── WORKFLOW.md                            # author-facing workflow doc
└── CLAUDE.md                              # rewritten for new architecture
```

### Content migration rules

1. **`.txt` readmes become `.md` files**, formatted nicely (paragraph structure preserved, headings added where natural). Source: `docs/改造/readme.txt`, `docs/覚書/readme.txt`, `docs/図/皇室称号図/readme.txt`, `docs/編輯/Review Style Guide.txt`.
2. **The FFXI Lua mod is a download, not a page.** `docs/改造/FFXI/conversion.lua` moves to `public/改造/FFXI/conversion.lua`. The `改造/index.md` links it.
3. **Game-review Attachments folders co-locate with their `.md` files** under `src/pages/編輯/<game>/Attachments/`. Astro resolves relative image paths from the page's own location.
4. **URL redirects are skipped.** `/拙訳/readme.html` → `/拙訳/` is a behavior change. The chart URL is preserved exactly because it's a `public/` pass-through.
5. **The old `/docs` tree is preserved on a backup branch** before deletion.

### Auto-layout assignment (the "no frontmatter" refinement)

A small remark plugin in `astro.config.mjs` assigns layouts by file location:

- `src/pages/<section>/index.md` → `Section.astro`
- `src/pages/index.md` → `Home.astro`
- everything else under `src/pages/**/*.md` → `Default.astro`

Result: `.md` files need no `layout:` frontmatter. A `title:` line is optional (fallback: derive from the first H1 in the body). User drops a file, it shows up styled, in the right section, on the next save.

### Repo as Obsidian vault

The user opens the repo folder directly in Obsidian. `src/pages/` becomes the vault's publishable area. Edit there → save → dev server refreshes → commit → push. `.obsidian/` goes in `.gitignore`. No symlinks, no sync script, no third-party CMS.

## The chart fix

A single Node script — `scripts/clean-obsidian-export.mjs` — performs four idempotent edits per run:

1. Delete `<base href="{{ '/' | relative_url }}">`.
2. Delete `<link itemprop="include" href="site-lib/html/custom-head-content-content.html">`.
3. Delete the `<div class="graph-view-wrapper">…</div>` element. Confirmed: graph-view is opt-in (gated on this element existing), unused on the user's local copy, and not load-bearing for the canvas. Removes the failing wasm fetch and the uncaught `RuntimeError` that was killing click-to-drag.
4. Inject a `← 目次` return link, fixed-position, top-left, self-contained inline styling matched to site palette. Tagged `data-sg-return-link` so the script can detect prior runs and skip re-injection.

The script is wired as `"prebuild"` in `package.json`, so it runs before every `npm run dev` and `npm run build`. Re-exports from Obsidian self-heal on the next build. **No ongoing maintenance.**

Pre-existing benign console noise ("Failed to find all required elements for canvas node") will continue to appear locally and on Pages. It does not affect functionality.

## Build, deploy, local preview

### `package.json` scripts

```json
{
  "scripts": {
    "dev": "astro dev",
    "build": "astro build",
    "preview": "astro preview",
    "prebuild": "node scripts/clean-obsidian-export.mjs public/図/皇室称号図/皇室称号図.html"
  }
}
```

### Local workflow

- `npm install --ignore-scripts` (one-time).
- `npm run dev` → `http://localhost:4321`, sub-second HMR on file save.
- `npm run preview` → serve a production build locally, for final sanity check before pushing.

### Deploy workflow (`.github/workflows/deploy.yml`)

Standard Astro + Pages pattern:

```yaml
name: Deploy to Pages
on:
  push: { branches: [main] }
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: false
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: actions/setup-node@v4
        with: { node-version: '22', cache: 'npm' }
      - uses: actions/configure-pages@v5
      - run: npm ci --ignore-scripts
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with: { path: ./dist }
  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

Push-to-live time: ~1–2 minutes.

### Pages settings flip

Manual one-time step in the GitHub UI:
Settings → Pages → **Source: GitHub Actions** (currently "Deploy from a branch / main / /docs").

### Cutover order

1. Create backup branch `archive/jekyll-docs` from current `main` and push.
2. Build the Astro project at the repo root on `main` while `/docs/` and Pages-from-branch remain in place. Site stays live.
3. Land the deploy workflow on `main`.
4. Flip Pages source to "GitHub Actions" in the UI. Live site goes blank for ~1 minute while the next Action publishes.
5. After confirming the new site is live, delete `/docs/` in a follow-up commit.

A ~1-minute blank on a low-traffic personal portfolio is acceptable. The backup branch is the rollback if the Action fails.

### Supply-chain discipline

Per the user's global `CLAUDE.md`:
- All `npm install` / `npm add` use `--ignore-scripts` and `--save-exact`. No `^` or `~` ranges.
- Verify package names before adding (typosquatting defense).
- Review `package-lock.json` diffs before committing.

## Documentation

Three docs at the repo root, each with a distinct audience:

### `README.md` (rewrite, ~30 lines)

Public-facing. What the site is, the live URL, pointers to `WORKFLOW.md` and `CLAUDE.md`. Visitors will not read more.

### `WORKFLOW.md` (new, ~150 lines)

Author-facing. The single source of truth for "how do I do anything with this repo." Sections:

1. Prerequisites (Node 22, Git, editor of choice / Obsidian-as-vault).
2. First-time setup (clone, `npm install --ignore-scripts`, folder map).
3. Daily workflow — writing a page. Drop `.md` under `src/pages/<section>/`; frontmatter optional; auto-layout assigns wrapper; save → dev server refreshes; commit → push → Action deploys.
4. Adding a new section.
5. Re-exporting the chart from Obsidian (drop file → `prebuild` cleans it).
6. Local preview commands.
7. How deploy works (Action + Pages settings).
8. Troubleshooting (build failures local and CI, missing pages, stuck dev server, chart breaks, Pages 404).

### `CLAUDE.md` (full rewrite, ~120 lines)

AI-assistant-facing. The current file describes the old Jekyll architecture and is wrong after migration.

- What the repo is.
- Architecture (Astro, where things live, the auto-layout plugin).
- The chart and cleanup script.
- Conventions (commit style: terse lowercase, no co-author lines, no Claude attribution).
- Gotchas (non-ASCII paths on Windows; benign canvas-node console errors).
- Pointer to `WORKFLOW.md` for human-side details.

### Writing order during implementation

`CLAUDE.md` → `WORKFLOW.md` → `README.md`. `CLAUDE.md` first so subsequent AI sessions get the new context; `README.md` last so it can link the other two.

## Aesthetic and the `/frontend-design` brief

### Direction: bookish / typographic minimalism

Cream paper, ink-black text, generous margins, strong Japanese serif (明朝) paired with a complementary Western serif. No decorative chrome, no animated flourishes. Reads like a well-set book of essays.

Tonal fit: the formal-humble Japanese folder register (`拙訳`, `拙論`, `編輯`) lives naturally in a quietly-serious typographic frame, and the same frame still graciously houses the casual game-review editing samples.

### Typography

- **Japanese serif (primary):** system stack — `"Hiragino Mincho ProN", "Yu Mincho", "Noto Serif JP", serif`. No web-font load; native OS fonts already render Japanese well. Swap to Fontsource Noto Serif JP if guaranteed-identical cross-platform rendering becomes a priority.
- **Western serif (complementary):** `/frontend-design` picks; expected candidates Source Serif 4 / EB Garamond.
- **Mono:** system stack, rare use.

### Deliverables `/frontend-design` produces

- `src/layouts/Default.astro`, `Section.astro`, `Home.astro`
- `src/styles/global.css` (typography, color tokens, spacing, responsive rules)
- `src/components/` (header with section nav, footer, page-list item)
- Inline styling snippet for the chart return link (matched to site palette; embedded in `clean-obsidian-export.mjs`)

### Constraints

- **Zero JavaScript** unless absolutely required.
- **Robust to arbitrary new `.md` files** — no per-page styling assumptions.
- **WCAG AA contrast**, proper heading hierarchy, skip-link, visible focus rings.
- **Lighthouse 95+** across all metrics, no layout shift, no font flash.
- **Mobile-respectful, desktop-first.**
- **No emoji or decorative icons** without explicit reason.

### Timing in the implementation plan

`/frontend-design` runs after the migration scaffolding is in place and content is rendering with placeholder layouts. Design quality needs working pages to design against.

## Out of scope (for now)

- RSS / Atom feed — no time-based content.
- Pagefind / on-site search — ~25 pages, not worth it.
- Analytics — not requested.
- i18n routing — content is in whatever language it's in; no bilingual mirrors.
- Image optimization for game-review screenshots — possible later; first iteration serves them raw.
- PR preview deploys via Cloudflare Pages — possible later; requires custom domain.
- Vault CMS / Astro Modular Obsidian integration — possible later; current "repo as vault" is sufficient.

## Risks and mitigations

| Risk | Mitigation |
|---|---|
| Non-ASCII paths break Node tooling on Windows (esp. `fs.mkdir` regressions in Claude Code itself) | Use Bash for non-ASCII file operations when needed. Astro's build pipeline handles these paths correctly. |
| ~1-minute blank during Pages source flip | Accepted; portfolio is low-traffic. Backup branch is rollback. |
| Future Obsidian re-export ships new junk references | `clean-obsidian-export.mjs` is idempotent; new junk patterns require a one-line script extension. |
| User loses old `/<folder>/readme.html` URL via external links | Skipped redirects per user decision. Reversible later via Astro redirects config. |
| Build fails in CI for non-content reasons (dep update, etc.) | Pinned exact versions (`--save-exact`), pinned Node version in workflow. |

## Open follow-ups

- The user's font question is provisionally answered with the system-first stack. Revisit if cross-platform rendering inconsistency becomes a complaint.
- `/frontend-design` may surface aesthetic refinements (specific Western serif pairing, color palette tokens, hero treatment for the home page). Those decisions land during implementation, not now.

## Implementation handoff

Next step: invoke the `writing-plans` skill to convert this design into an executable plan with bite-sized tasks. The plan will sequence:

1. Backup branch, scaffold Astro at root, configure integrations.
2. Write the three layouts as placeholders + the remark auto-layout plugin.
3. Migrate content (`.md` files, `.txt` → `.md`, chart to `public/`).
4. Write `scripts/clean-obsidian-export.mjs` and wire it as `prebuild`.
5. Land the GitHub Actions workflow.
6. Cut over: flip Pages source, verify, delete `/docs/`.
7. Invoke `/frontend-design` with this design's brief; replace placeholder layouts and styles.
8. Write `CLAUDE.md`, `WORKFLOW.md`, `README.md`.
9. Final verification on the live site.
