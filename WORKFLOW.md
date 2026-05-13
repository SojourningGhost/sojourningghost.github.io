# WORKFLOW.md

How to write content, preview it locally, publish to the live site, and recover when things break.

## Prerequisites

- **Node 22 or later.** Check with `node --version`. The `engines` field in `package.json` enforces this.
- **Git.** Pushes to `main` trigger the deploy workflow.
- **An editor.** Anything that handles UTF-8 and CJK filenames. Obsidian works well as the vault for the chart; VS Code or a plain editor for the markdown.

## First-time setup

```bash
git clone https://github.com/SojourningGhost/sojourningghost.github.io.git
cd sojourningghost.github.io
npm install --ignore-scripts
```

`--ignore-scripts` is standard supply-chain hygiene (no postinstall scripts run automatically). The dependency list is small (`astro`, `@astrojs/mdx`, `@astrojs/sitemap`) and pinned to exact versions.

Folder map:

- `src/pages/` — all content. Drop a `.md` file in here and it appears on the site.
- `public/` — static pass-through (the chart, the FFXI lua download).
- `src/layouts/`, `src/components/`, `src/styles/global.css` — visual design.
- `scripts/` — build-time helpers (chart cleanup, layout assignment, wikilink stripping).

## Daily workflow — writing a page

1. **Add a markdown file** under `src/pages/<section>/`. Filename becomes the URL slug; CJK names are fine.

   ```
   src/pages/拙論/my-essay.md  →  /拙論/my-essay/
   ```

2. **Frontmatter is optional.** A `title:` field improves the `<title>` tag and section-list display name. Without it the filename is used. No `layout:` — the layout is assigned by file location:
   - `src/pages/index.md` → home (auto-lists sections)
   - `src/pages/<section>/index.md` → section landing (auto-lists siblings)
   - anywhere else → default content layout

3. **Preview locally.**

   ```bash
   npm run dev
   ```

   Opens at `http://localhost:4321/`. Hot-reloads on save. CJK paths show up URL-encoded in the address bar — that's normal.

4. **Commit and push.**

   ```bash
   git add src/pages/拙論/my-essay.md
   git commit -m "add essay on <topic>"
   git push
   ```

   The deploy workflow runs on every push to `main`; the live site updates in 1–2 minutes.

## Adding a new section

```bash
mkdir src/pages/新セクション
cat > src/pages/新セクション/index.md <<'EOF'
---
title: 新セクション
---

Section description.
EOF
```

That's it — the section appears in the home page's auto-list, and child `.md` files under `src/pages/新セクション/` are listed automatically on the section landing.

## Re-exporting the chart from Obsidian

The imperial-titles chart at `public/図/皇室称号図/皇室称号図.html` is a single-file export from Obsidian Canvas. To update it:

1. Open the canvas in Obsidian: `public/図/皇室称号図/皇室称号図.canvas`.
2. Edit visually.
3. Use Obsidian's Webpage HTML Export to re-export.
4. **Overwrite** the existing `皇室称号図.html` at the same path.
5. Run `npm run build` locally to confirm the cleanup script handled the new export (the prebuild step strips the broken `<base>` tag, the `site-lib` link, and any `.graph-view-wrapper` element; it also injects the 「← 目次」 return link).
6. Commit and push the updated `.html`.

If the cleanup script ever doesn't catch a new pattern, edit `scripts/clean-obsidian-export.mjs` and update its test (`test/clean-obsidian-export.test.mjs` + `test/fixtures/chart-snippet.html`). `node --test test/clean-obsidian-export.test.mjs` runs the suite.

## Local preview

- `npm run dev` — dev server with hot reload at `http://localhost:4321/`.
- `npm run build` — production build into `dist/`.
- `npm run preview` — serve `dist/` as it would be served on Pages. Useful for catching things hot-reload masks (relative URL resolution, the chart).

To kill a stuck dev server: `Ctrl-C` once; if that doesn't work, kill the node process (`pkill node` on Unix; Task Manager on Windows). Restart with `npm run dev`.

## How deploy works

- **Trigger:** push to `main`.
- **Pipeline:** `.github/workflows/deploy.yml` →
  - check out the repo
  - install Node 22
  - `npm ci --ignore-scripts`
  - `npm run build` (which also runs the chart `prebuild`)
  - upload `dist/` as a Pages artifact
  - `actions/deploy-pages` publishes
- **Pages settings:** repository **Settings → Pages → Source** must be **"GitHub Actions"** (not "Deploy from a branch"). Check the [Actions tab](https://github.com/SojourningGhost/sojourningghost.github.io/actions) to watch a run.

To manually trigger a deploy without a commit: the workflow accepts `workflow_dispatch`. From the Actions tab, pick "Deploy to Pages", click "Run workflow".

## Troubleshooting

**`npm run dev` fails locally.**
- Check Node version: `node --version` must report 22.x or higher.
- Delete `node_modules` and re-install: `rm -rf node_modules && npm install --ignore-scripts`.

**Build fails in CI.**
- Open the failed Actions run. The build log shows the same output as `npm run build` locally; reproduce locally first, fix, push.
- A failure mentioning the chart usually means a new Obsidian export added a pattern the cleanup script doesn't handle. Add a test case, fix the regex, push.

**A page is missing on the live site.**
- Confirm the `.md` file is committed: `git log -- src/pages/<path>`.
- Confirm the deploy workflow succeeded. If the build passed but the page is still 404, hard-refresh the browser; GitHub Pages occasionally serves a cached copy.

**The chart shows console errors about `wasm` or `site-lib`.**
- The chart's cleanup needs re-running. `npm run prebuild` against the current file; commit the result.
- If it still 404s, the source HTML has a new pattern the cleanup script doesn't strip. Inspect `public/図/皇室称号図/皇室称号図.html` for the offending tag and extend `scripts/clean-obsidian-export.mjs`.

**A markdown image renders as literal `![alt](...)` text.**
- The path contains spaces and needs CommonMark angle-bracket form: `![alt](</path with spaces/file.png>)`. Edit the source.

**Pages settings got reset to "Deploy from a branch".**
- Go to **Settings → Pages**, set Source back to "GitHub Actions", and re-run the latest workflow. The repo has no `docs/` folder anymore, so Pages will 404 entirely until this is fixed.

**Restoring from the backup branch.**
- The pre-migration state lives on `archive/jekyll-docs`. To roll back: `git switch archive/jekyll-docs`, change Pages source to "Deploy from a branch", point at `main` `/docs`. The pre-migration `docs/` tree was preserved verbatim on that branch.
