# WORKFLOW.md

How to write content, preview it locally, publish to the live site, and recover when things break.

## Prerequisites

- **Node 22 or later.** Check with `node --version`. The `engines` field in `package.json` enforces this. If you use a node version manager (nvm, fnm, Volta), the `.nvmrc` at the repo root pins the correct version — `nvm use` or equivalent picks it up automatically.
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

2. **Frontmatter is optional.** A `title:` field improves the `<title>` tag and section-list display name. Without it the first H1 heading in the file is used; without that, the filename is used. No `layout:` — the layout is assigned by file location:
   - `src/pages/index.md` → home (auto-lists sections)
   - `src/pages/<section>/index.md` → section landing (auto-lists siblings)
   - anywhere else → default content layout

3. **Preview locally.**

   ```bash
   npm run dev
   ```

   Opens at `http://localhost:4321/`. Hot-reloads on save. CJK paths show up URL-encoded in the address bar — that's normal. The chart cleanup script runs automatically before the server starts (via `predev`), so the chart is functional locally without any extra steps.

4. **Commit and push.**

   ```bash
   git add src/pages/拙論/my-essay.md
   git commit -m "add essay on <topic>"
   git push
   ```

   The deploy workflow runs on every push to `main`; the live site updates in 1–2 minutes.

## Adding a new section

1. Create a new folder at `src/pages/<新セクション>/` (use any name; CJK is fine).
2. Inside it, create a file named `index.md` with this content (replace the title and description):

   ```markdown
   ---
   title: 新セクション
   ---

   A short description of what lives in this section.
   ```

3. Drop any number of `.md` files alongside `index.md` — they appear automatically on the section landing.

The section also appears automatically in the home page's section list and the header nav. No further wiring needed.

## Re-exporting the chart from Obsidian

The imperial-titles chart at `public/図/皇室称号図/皇室称号図.html` is a single-file export from Obsidian Canvas. The editable source (`.canvas` + `readme.txt`) lives at `source/図/皇室称号図/` — tracked in git but not served publicly. To update the chart:

1. Open the canvas in Obsidian: `source/図/皇室称号図/皇室称号図.canvas`.
2. Edit visually.
3. Use Obsidian's Webpage HTML Export to re-export.
4. **Overwrite** the existing `皇室称号図.html` at `public/図/皇室称号図/皇室称号図.html`.
5. Run `npm run dev` (or `npm run build`) locally to confirm the cleanup script handled the new export. The prebuild/predev step scans all `*.html` files under `public/` and for each one:
   - strips the broken Liquid `<base>` tag
   - strips the `site-lib` `<link>` include
   - strips any `.graph-view-wrapper` element
   - rewrites every `"file:" === location.protocol` (and variants) so the chart always takes its inline-data branch — without this the chart tries to fetch `site-lib/metadata.json` and `graph-wasm.wasm`, which aren't part of the export and 404 on any http origin
   - injects the fixed-position 「← 目次」 return link, pointing back to the chart's parent section (derived automatically from the file path)
6. Commit and push the updated `.html`.

If the cleanup script ever doesn't catch a new pattern, edit `scripts/clean-obsidian-export.mjs` and update its test (`test/clean-obsidian-export.test.mjs` + `test/fixtures/chart-snippet.html`). `node --test test/clean-obsidian-export.test.mjs` runs the suite.

## Adding a new chart

1. In Obsidian, finish the canvas. Save the source files to `source/図/<新しい図>/` (mirror the structure of the existing `皇室称号図` folder — `.canvas` file and a `readme.txt`).
2. Export the chart from Obsidian as a single-file HTML to `public/図/<新しい図>/<新しい図>.html`. If the canvas references images, place them in `public/図/<新しい図>/画像/`.
3. Add a link to the chart in `src/pages/図/index.md` — e.g.:

   ```markdown
   [新しい図](</図/<新しい図>/<新しい図>.html>)
   ```

   (Angle brackets are required because the URL contains non-ASCII characters.)

4. Run `npm run dev` and open `http://localhost:4321/図/`. The cleanup script runs automatically in dev now, so the chart should be fully functional locally before you push. The 「← 目次」 return link auto-points back to `/図/`.
5. Commit and push.

No editing of `package.json` or any script is needed — the cleanup glob-scans `public/` for `*.html` files automatically.

## Local preview

- `npm run dev` — dev server with hot reload at `http://localhost:4321/`. Runs the chart cleanup script first (via `predev`), so the chart is functional without a separate build step.
- `npm run build` — production build into `dist/`. Also runs the chart cleanup first (via `prebuild`).
- `npm run preview` — serve `dist/` as it would be served on Pages. Useful for catching things hot-reload masks (relative URL resolution, the chart).

To kill a stuck dev server: `Ctrl-C` once; if that doesn't work, kill the node process (`pkill node` on Unix; Task Manager on Windows). Restart with `npm run dev`.

## How deploy works

- **Trigger:** push to `main`.
- **Pipeline:** `.github/workflows/deploy.yml` →
  - check out the repo
  - install Node 22
  - `npm ci --ignore-scripts`
  - `npm test` (runs the remark plugin and chart-cleanup test suites)
  - `npm run build` (which also runs the chart `prebuild`)
  - upload `dist/` as a Pages artifact
  - `actions/deploy-pages` publishes
- **Pages settings:** repository **Settings → Pages → Source** must be **"GitHub Actions"** (not "Deploy from a branch"). Check the [Actions tab](https://github.com/SojourningGhost/sojourningghost.github.io/actions) to watch a run.

To manually trigger a deploy without a commit: the workflow accepts `workflow_dispatch`. From the Actions tab, pick "Deploy to Pages", click "Run workflow".

## Troubleshooting

**`npm run dev` fails locally.**
- Check Node version: `node --version` must report 22.x or higher.
- Delete `node_modules` and re-install: `rm -rf node_modules && npm install --ignore-scripts`.

**`npm test` fails locally.**
- Read the test output — it points to the failing assertion. Usually either a remark plugin change broke the H1-title or wikilink behaviour, or a chart-cleanup regex stopped matching. Fix the code or the fixture, re-run `npm test`, then push.

**Build fails in CI.**
- Open the failed Actions run. The build log shows the same output as `npm run build` locally; reproduce locally first, fix, push.
- A failure in the `npm test` step means a plugin or cleanup regression — same as above.
- A failure in `npm run build` mentioning the chart usually means a new Obsidian export added a pattern the cleanup script doesn't handle. Add a test case, fix the regex, push.

**A page is missing on the live site.**
- Confirm the `.md` file is committed: `git log -- src/pages/<path>`.
- Confirm the deploy workflow succeeded. If the build passed but the page is still 404, hard-refresh the browser; GitHub Pages occasionally serves a cached copy.

**The chart shows console errors about `wasm` or `site-lib`, or pan/zoom doesn't work.**
- The chart's cleanup needs re-running. `npm run dev` or `npm run build` does it automatically (the script glob-scans every `*.html` under `public/`); commit any resulting changes to the `.html`. The protocol-check rewrite is what keeps the inline-data branch alive — without it the chart tries to fetch files that aren't there and aborts before wiring up pan/zoom.
- If the 404s persist, the source HTML has a new pattern the cleanup script doesn't strip. Inspect the offending chart's `.html` file under `public/` for the new tag or comparison and extend `scripts/clean-obsidian-export.mjs` (with a matching test fixture case).

Pre-existing "Failed to find all required elements for canvas node" console noise is harmless and shows up locally too — that's the chart's own diagnostic about its layout pass, not an actual failure.

**A markdown image renders as literal `![alt](...)` text.**
- The path contains spaces and needs CommonMark angle-bracket form: `![alt](</path with spaces/file.png>)`. Edit the source.

**Pages settings got reset to "Deploy from a branch".**
- Go to **Settings → Pages**, set Source back to "GitHub Actions", and re-run the latest workflow. The repo has no `docs/` folder anymore, so Pages will 404 entirely until this is fixed.

**Restoring from the backup branch.**
- The pre-migration state lives on `archive/jekyll-docs`. That branch still has the original `docs/` tree. To roll back to it: go to **Settings → Pages**, switch Source to "Deploy from a branch", and point at `archive/jekyll-docs` `/docs`. Note: `main` no longer has a `docs/` folder, so "Deploy from a branch" pointed at `main` will 404.
