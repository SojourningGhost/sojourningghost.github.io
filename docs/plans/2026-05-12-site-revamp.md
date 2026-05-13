# Site Revamp Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use `@superpowers:executing-plans` to implement this plan task-by-task.

**Goal:** Migrate the portfolio from Jekyll (`/docs` on `main`) to Astro deployed via GitHub Actions, fix the broken Obsidian-exported imperial-titles chart, give the site a designed look via `/frontend-design`, and document the workflow.

**Architecture:** Astro at repo root, content in `src/pages/**/*.md` (auto-routed) with a remark plugin assigning layouts by file location, raw HTML in `public/` (the chart), `npm run dev` for local preview, GitHub Actions deploying to Pages. See `docs/plans/2026-05-12-site-revamp-design.md` for the full design rationale.

**Tech Stack:** Astro 5+, `@astrojs/mdx`, `@astrojs/sitemap`, Node 22, GitHub Actions, GitHub Pages. Node's built-in `node:test` for unit tests on the cleanup script and the remark plugin.

---

## Conventions used throughout this plan

- **Commits are surgical:** stage only the specific files for each task.
- **Commit messages match the project register:** terse, lowercase, imperative, no co-author lines, no Claude attribution.
- **All `npm install` / `npm add` commands use `--ignore-scripts` and `--save-exact`.** No semver ranges. (Per the user's global `CLAUDE.md`.)
- **Verification means looking at the site, not just "tests pass."** After each phase that changes user-visible behavior, load the relevant URL in `npm run dev` or on the live site.
- **`docs/` stays alive until Phase 7.** It's still the Pages source until the cutover, so the live site remains functional during the migration.
- **Non-ASCII paths on Windows:** if the `Write` tool errors on Japanese folder names, fall back to the `Bash` tool to write the file (known regression: `anthropics/claude-code#30903`).

---

## Phase 1 — Safety net

### Task 1.1: Create and push backup branch

**Files:** none (branch operation)

**Step 1:** Verify clean working tree.

Run: `git status`
Expected: working tree clean, on `main`.

**Step 2:** Create and push backup branch.

Run:
```bash
git switch -c archive/jekyll-docs
git push -u origin archive/jekyll-docs
git switch main
```

Expected: branch created, pushed, switched back to `main`.

**Step 3:** Verify the backup exists on the remote.

Run: `git ls-remote --heads origin archive/jekyll-docs`
Expected: one ref line is printed.

No commit needed in this task — the backup is the commit-equivalent.

---

## Phase 2 — Astro scaffold

### Task 2.1: Initialize Astro at repo root

**Files:**
- Create: `package.json`
- Create: `astro.config.mjs` (initial, no integrations yet)
- Create: `tsconfig.json`
- Create: `src/env.d.ts`

**Step 1:** Use `npm create astro` to scaffold a minimal project at the repo root, declining the git-init and dependency-install steps so we keep our existing git and control installation manually.

Run:
```bash
npm create astro@latest -- . --template minimal --typescript strict --no-install --no-git --skip-houston --yes
```

Expected: files created at the repo root. `docs/` is untouched.

**Step 2:** Verify the scaffold landed.

Run: `ls package.json astro.config.mjs tsconfig.json`
Expected: all three exist.

**Step 3:** Open `package.json` and replace the `scripts` block with our target scripts. The `prebuild` will fail until Phase 5's script exists, but that's fine — we only run `dev`/`build` after Phase 5.

Replace the entire `"scripts"` object with:
```json
"scripts": {
  "dev": "astro dev",
  "build": "astro build",
  "preview": "astro preview",
  "astro": "astro"
}
```

(We add `prebuild` later in Task 5.10.)

**Step 4:** Commit the scaffold.

Run:
```bash
git add package.json astro.config.mjs tsconfig.json src/env.d.ts
git commit -m "scaffold astro" -m "minimal template, scripts adjusted; integrations land next"
```

### Task 2.2: Install dependencies with supply-chain discipline

**Files:**
- Modify: `package.json`
- Create: `package-lock.json`

**Step 1:** Install the dependencies the scaffold declared, with scripts disabled.

Run: `npm install --ignore-scripts`
Expected: `node_modules/` created, `package-lock.json` created, no install scripts ran.

**Step 2:** Add MDX and sitemap integrations with exact versions.

Run:
```bash
npm install --ignore-scripts --save-exact @astrojs/mdx @astrojs/sitemap
```
Expected: both packages added to `dependencies` in `package.json` with exact versions (no `^` or `~`).

**Step 3:** Skim `package-lock.json` for unexpected transitive packages. Specifically look for typosquatted look-alikes (`@astro/`, `astrojs-*`, etc.) or anything that looks unrelated to Astro/MDX/sitemap.

Run: `git diff package-lock.json | head -200`
Expected: only Astro/MDX/sitemap-family packages and their normal dependencies.

**Step 4:** Commit deps.

Run:
```bash
git add package.json package-lock.json
git commit -m "add mdx and sitemap integrations" -m "exact-pinned per supply-chain rules"
```

### Task 2.3: Write `.gitignore`

**Files:**
- Create: `.gitignore`

**Step 1:** Write the `.gitignore`:

```gitignore
node_modules/
dist/
.astro/
.obsidian/
.DS_Store
*.log
.env
.env.*
```

**Step 2:** Confirm none of these paths are currently tracked.

Run: `git ls-files | grep -E "^(node_modules|dist|\.astro|\.obsidian)/"`
Expected: empty output.

**Step 3:** Commit.

Run:
```bash
git add .gitignore
git commit -m "add .gitignore"
```

### Task 2.4: Configure `astro.config.mjs` (without auto-layout plugin yet)

**Files:**
- Modify: `astro.config.mjs`

**Step 1:** Replace the file contents with:

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

export default defineConfig({
  site: 'https://sojourningghost.github.io',
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [],
    // Auto-layout plugin appended in Task 3.4.
  },
});
```

**Step 2:** Verify Astro accepts the config.

Run: `npx astro check --help`
Expected: command runs without "invalid config" errors.

**Step 3:** Commit.

Run:
```bash
git add astro.config.mjs
git commit -m "configure astro with mdx and sitemap"
```

---

## Phase 3 — Placeholder layouts and auto-layout plugin

These are intentionally minimal — `/frontend-design` will replace them in Phase 8. The goal here is just "pages render with the right wrapper picked automatically."

### Task 3.1: Write `Default.astro` placeholder

**Files:**
- Create: `src/layouts/Default.astro`

**Step 1:** Write the file:

```astro
---
const { frontmatter } = Astro.props;
const title = frontmatter?.title ?? 'SojourningGhost';
---
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <main>
      <slot />
    </main>
    <footer><a href="/">← 目次</a></footer>
  </body>
</html>
```

**Step 2:** Commit.

Run:
```bash
git add src/layouts/Default.astro
git commit -m "add Default layout placeholder"
```

### Task 3.2: Write `Section.astro` placeholder with auto-listing

**Files:**
- Create: `src/layouts/Section.astro`

**Step 1:** Write the file. The layout uses `import.meta.glob` to find sibling pages and list them. It infers the section directory from the current page's URL.

```astro
---
const { frontmatter, url } = Astro.props;
const title = frontmatter?.title ?? 'SojourningGhost';

// url looks like "/拙訳/" — strip slashes to get the section directory name.
const sectionDir = url.replace(/^\/|\/$/g, '');

// Eagerly glob every markdown page so we can filter by section.
const allPages = import.meta.glob('/src/pages/**/*.md', { eager: true });
const siblings = Object.entries(allPages)
  .filter(([path]) => {
    const m = path.match(/^\/src\/pages\/([^/]+)\/([^/]+)\.md$/);
    return m && m[1] === sectionDir && m[2] !== 'index';
  })
  .map(([path, mod]) => ({
    href: '/' + sectionDir + '/' + path.match(/\/([^/]+)\.md$/)[1] + '/',
    title: (mod && mod.frontmatter && mod.frontmatter.title)
      || path.match(/\/([^/]+)\.md$/)[1],
  }))
  .sort((a, b) => a.title.localeCompare(b.title, 'ja'));
---
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <main>
      <h1>{title}</h1>
      <slot />
      {siblings.length > 0 && (
        <ul>
          {siblings.map((s) => <li><a href={s.href}>{s.title}</a></li>)}
        </ul>
      )}
    </main>
    <footer><a href="/">← 目次</a></footer>
  </body>
</html>
```

**Step 2:** Commit.

Run:
```bash
git add src/layouts/Section.astro
git commit -m "add Section layout with auto-listing"
```

### Task 3.3: Write `Home.astro` placeholder

**Files:**
- Create: `src/layouts/Home.astro`

**Step 1:** Write the file. Lists the top-level sections by inspecting `src/pages/*/index.md`.

```astro
---
const { frontmatter } = Astro.props;
const title = frontmatter?.title ?? 'SojourningGhost';

const indexes = import.meta.glob('/src/pages/*/index.md', { eager: true });
const sections = Object.entries(indexes)
  .map(([path, mod]) => {
    const dir = path.match(/^\/src\/pages\/([^/]+)\/index\.md$/)[1];
    return {
      href: '/' + dir + '/',
      title: (mod && mod.frontmatter && mod.frontmatter.title) || dir,
    };
  })
  .sort((a, b) => a.title.localeCompare(b.title, 'ja'));
---
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>{title}</title>
  </head>
  <body>
    <main>
      <slot />
      <ul>
        {sections.map((s) => <li><a href={s.href}>{s.title}</a></li>)}
      </ul>
    </main>
  </body>
</html>
```

**Step 2:** Commit.

Run:
```bash
git add src/layouts/Home.astro
git commit -m "add Home layout"
```

### Task 3.4: Write the remark auto-layout plugin (TDD)

**Files:**
- Create: `scripts/remark-auto-layout.mjs`
- Create: `test/remark-auto-layout.test.mjs`

**Step 1:** Write the failing test first.

```js
// test/remark-auto-layout.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { remarkAutoLayout } from '../scripts/remark-auto-layout.mjs';

function fakeFile(path) {
  return { path, data: { astro: { frontmatter: {} } } };
}

test('assigns Home layout to src/pages/index.md', () => {
  const file = fakeFile('/abs/src/pages/index.md');
  remarkAutoLayout()(null, file);
  assert.equal(file.data.astro.frontmatter.layout, '/src/layouts/Home.astro');
});

test('assigns Section layout to src/pages/<section>/index.md', () => {
  const file = fakeFile('/abs/src/pages/拙訳/index.md');
  remarkAutoLayout()(null, file);
  assert.equal(file.data.astro.frontmatter.layout, '/src/layouts/Section.astro');
});

test('assigns Default layout to a deep content page', () => {
  const file = fakeFile('/abs/src/pages/拙訳/Close to you英訳.md');
  remarkAutoLayout()(null, file);
  assert.equal(file.data.astro.frontmatter.layout, '/src/layouts/Default.astro');
});

test('does not overwrite an explicit layout in frontmatter', () => {
  const file = fakeFile('/abs/src/pages/拙訳/foo.md');
  file.data.astro.frontmatter.layout = '/src/layouts/Custom.astro';
  remarkAutoLayout()(null, file);
  assert.equal(file.data.astro.frontmatter.layout, '/src/layouts/Custom.astro');
});
```

**Step 2:** Run the test, confirm it fails.

Run: `node --test test/remark-auto-layout.test.mjs`
Expected: fails with "Cannot find module '../scripts/remark-auto-layout.mjs'".

**Step 3:** Write the minimal plugin.

```js
// scripts/remark-auto-layout.mjs
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
```

**Step 4:** Re-run the test.

Run: `node --test test/remark-auto-layout.test.mjs`
Expected: all four tests pass.

**Step 5:** Commit.

Run:
```bash
git add scripts/remark-auto-layout.mjs test/remark-auto-layout.test.mjs
git commit -m "add remark plugin that assigns layouts by file location"
```

### Task 3.5: Wire the plugin into `astro.config.mjs`

**Files:**
- Modify: `astro.config.mjs`

**Step 1:** Update `astro.config.mjs`:

```js
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { remarkAutoLayout } from './scripts/remark-auto-layout.mjs';

export default defineConfig({
  site: 'https://sojourningghost.github.io',
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkAutoLayout],
  },
});
```

**Step 2:** Smoke-test by creating a temporary content file and running dev.

Run:
```bash
mkdir -p src/pages
printf -- '---\ntitle: smoke\n---\n\n# smoke test\n' > src/pages/__smoke.md
npm run dev -- --port 4321 &
sleep 4
curl -s http://localhost:4321/__smoke/ | head -5
kill %1
rm src/pages/__smoke.md
```

Expected: the curl output contains `<!doctype html>` and the body text "smoke test". Confirms the auto-layout plugin assigned `Default.astro` and rendered.

**Step 3:** Commit.

Run:
```bash
git add astro.config.mjs
git commit -m "wire auto-layout plugin into markdown pipeline"
```

---

## Phase 4 — Content migration

Each section is its own task. Pattern: copy files from `docs/<section>/` into `src/pages/<section>/`, rename `readme.md`/`readme.txt` → `index.md`, rewrite `.txt` content into clean markdown (paragraph structure preserved, headings added where natural), set `title:` frontmatter when the filename isn't a good display title.

For every task in this phase: after copying, **leave `docs/` intact** — it stays the Pages source until Phase 7.

### Task 4.1: Migrate the landing page

**Files:**
- Create: `src/pages/index.md` (from `docs/readme.md`)

**Step 1:** Read `docs/readme.md` and write a tidied version to `src/pages/index.md`. The current readme.md is a one-liner; the new one is a brief introduction to the portfolio (a sentence or two) — the section list is rendered automatically by `Home.astro`.

Suggested content:

```markdown
---
title: SojourningGhost
---

# SojourningGhost

A portfolio of translations, language essays, English editing samples, a Final
Fantasy XI mod, and one large interactive diagram of the Japanese imperial
household.
```

**Step 2:** Verify in dev.

Run: `npm run dev` (background) → load `http://localhost:4321/`
Expected: the page renders with the intro paragraph and an auto-generated list of sections (the list will only show sections after they exist; for now it's empty).

**Step 3:** Commit.

Run:
```bash
git add src/pages/index.md
git commit -m "migrate landing page"
```

### Task 4.2: Migrate `拙訳/` (translations)

**Files:**
- Create: `src/pages/拙訳/index.md` (rewrite of `docs/拙訳/readme.md`)
- Create: `src/pages/拙訳/Close to you英訳.md` (from `docs/拙訳/Close to you英訳.md`)
- Create: `src/pages/拙訳/connexio英訳.md`
- Create: `src/pages/拙訳/中二病文翻訳.md`
- Create: `src/pages/拙訳/今昔未見生物猛虎之眞圖・転写と翻訳.md`
- Create: `src/pages/拙訳/弥助に就いての記録の英訳.md`

**Step 1:** Read `docs/拙訳/readme.md` and write a tidied `src/pages/拙訳/index.md`. Preserve the existing prose; add `title: 拙訳` frontmatter.

Template:
```markdown
---
title: 拙訳
---

(existing readme.md prose, cleaned up)
```

**Step 2:** Copy each translation file from `docs/拙訳/*.md` to `src/pages/拙訳/`. Read each one to determine whether a `title:` frontmatter line is needed (if the H1 inside is a good display title, no frontmatter needed).

For each file: if no clear H1, add minimal frontmatter:
```markdown
---
title: <display title in Japanese>
---
```

**Step 3:** Verify in dev.

Run: load `http://localhost:4321/拙訳/`
Expected: the section landing renders the intro prose and a list of all five translations.

Click each translation: page renders with its title.

**Step 4:** Commit.

Run:
```bash
git add 'src/pages/拙訳/'
git commit -m "migrate translations section"
```

### Task 4.3: Migrate `拙論/` (essays)

**Files:**
- Create: `src/pages/拙論/index.md` (no source — write a new one)
- Create: `src/pages/拙論/makeやcauseとpersuadeやcoaxとの違いに就いて.md`
- Create: `src/pages/拙論/「タイミング」に就いて.md`
- Create: `src/pages/拙論/三人称と遠称との漢字表記に依る区別の案.md`
- Create: `src/pages/拙論/友人へのキリスト教説明の抜萃.md`

**Step 1:** Write a new section landing at `src/pages/拙論/index.md`. The current `docs/拙論/` folder has no readme. Suggested content:

```markdown
---
title: 拙論
---

# 拙論

日本語の語法・表記・文法に関する個人的な小論をここに収めている。
```

(Or whatever phrasing the user prefers — the executor should check with the user if uncertain about prose.)

**Step 2:** Copy each essay file from `docs/拙論/*.md` to `src/pages/拙論/`, adding minimal frontmatter as needed (same rule as 4.2).

**Step 3:** Verify in dev: load `http://localhost:4321/拙論/`. Expected: intro + auto-listed essays.

**Step 4:** Commit.

Run:
```bash
git add 'src/pages/拙論/'
git commit -m "migrate essays section"
```

### Task 4.4: Migrate `改造/` (mods)

**Files:**
- Create: `src/pages/改造/index.md` (rewrite of `docs/改造/readme.txt`, .txt → formatted .md)
- Create: `public/改造/FFXI/conversion.lua` (copy of `docs/改造/FFXI/conversion.lua`)

**Step 1:** Read `docs/改造/readme.txt`. Rewrite as `src/pages/改造/index.md` with:
- `title: 改造` frontmatter
- Prose preserved, formatted with paragraph breaks and any natural headings
- A link to the FFXI lua download: `[conversion.lua](/改造/FFXI/conversion.lua)`

**Step 2:** Copy `docs/改造/FFXI/conversion.lua` → `public/改造/FFXI/conversion.lua` (verbatim, no edits).

**Step 3:** Verify in dev: load `http://localhost:4321/改造/`. The download link should resolve to the lua file (right-click → save, or just open in browser).

**Step 4:** Commit.

Run:
```bash
git add 'src/pages/改造/' 'public/改造/'
git commit -m "migrate mods section; lua served from public/"
```

### Task 4.5: Migrate `編輯/` (editing samples)

**Files:**
- Create: `src/pages/編輯/index.md` (rewrite of `docs/編輯/readme.md` + folded-in content from `docs/編輯/Review Style Guide.txt`, .txt → .md)
- Create: `src/pages/編輯/Terminus Zombie Survivors/Terminus BBcode.md`
- Create: `src/pages/編輯/Terminus Zombie Survivors/Terminus Zombie Survivors Final and Editing.md`
- Create: `src/pages/編輯/Terminus Zombie Survivors/Attachments/...` (copy all attached images)
- Create: `src/pages/編輯/Ultimate Zombie Defense 2/Ultimate Zombie Defense 2 Final and Editing.md`
- Create: `src/pages/編輯/Ultimate Zombie Defense 2/UZD2 BBcode.md`
- Create: `src/pages/編輯/Ultimate Zombie Defense 2/Attachments/...`
- Create: `src/pages/編輯/VLADiK Brutal/VLADiK BBcode.md`
- Create: `src/pages/編輯/VLADiK Brutal/VLADiK BRUTAL Final and Editing.md`
- Create: `src/pages/編輯/VLADiK Brutal/Attachments/...`

**Step 1:** Write `src/pages/編輯/index.md`. Combine the prose from the current `readme.md` with the Review Style Guide content (which is currently a `.txt` separate file). Add a second-level heading for the style guide so it's visually distinct. Frontmatter: `title: 編輯`.

**Step 2:** Copy each game-review folder verbatim from `docs/編輯/<game>/` to `src/pages/編輯/<game>/`, including the `Attachments/` subfolder. The relative image links inside the `.md` files should already point to `Attachments/...` and continue to resolve correctly under the new location.

**Step 3:** Add a section landing strategy for game review folders. Note that `Section.astro` (which we wrote in Task 3.2) globs at depth 1 only. The Terminus/UZD2/VLADiK subdirectories each have multiple `.md` files but no `index.md`. There are two options:

- (a) The deeper pages route as `/編輯/Terminus Zombie Survivors/Terminus BBcode/` etc., and `/編輯/Terminus Zombie Survivors/` returns 404 because no `index.md` exists at that depth. Acceptable for a first pass.
- (b) Add `index.md` files inside each game folder for tidiness.

**Pick (a)** for the first pass — minimal scope. The `編輯/index.md` page lists all `.md` files within `編輯/`, which under the depth-1 glob in `Section.astro` will show only top-level pages of `編輯/`. Adjust `Section.astro` if/when nested listing becomes desirable.

(Note: this is a small known limitation. Phase 8 / `/frontend-design` may revisit it.)

**Step 4:** Verify in dev: load `http://localhost:4321/編輯/`. Confirm the game-review pages render at their nested URLs.

**Step 5:** Commit.

Run:
```bash
git add 'src/pages/編輯/'
git commit -m "migrate editing samples with game-review folders intact"
```

### Task 4.6: Migrate `覚書/` (language notes)

**Files:**
- Create: `src/pages/覚書/index.md` (rewrite of `docs/覚書/readme.txt`, .txt → .md formatted)
- Create: `src/pages/覚書/使い分け.md`
- Create: `src/pages/覚書/副詞.md`
- Create: `src/pages/覚書/文法.md`
- Create: `src/pages/覚書/漢字表記.md`
- Create: `src/pages/覚書/語法.md`
- Create: `src/pages/覚書/語源.md`
- Create: `src/pages/覚書/誤謬.md`

**Step 1:** Convert `docs/覚書/readme.txt` to `src/pages/覚書/index.md` with `title: 覚書` frontmatter, prose preserved and lightly formatted.

**Step 2:** Copy each note `.md` from `docs/覚書/*.md` to `src/pages/覚書/`.

**Step 3:** Verify in dev: `/覚書/` lists all seven notes.

**Step 4:** Commit.

Run:
```bash
git add 'src/pages/覚書/'
git commit -m "migrate language notes section"
```

### Task 4.7: Migrate `図/` (the chart, into `public/`)

**Files:**
- Create: `src/pages/図/index.md`
- Create: `public/図/皇室称号図/皇室称号図.html` (from `docs/図/皇室称号図/皇室称号図.html`)
- Create: `public/図/皇室称号図/皇室称号図.canvas`
- Create: `public/図/皇室称号図/画像/...` (all flag/reference images)
- Create: `public/図/皇室称号図/readme.txt` (kept as a sibling; not a published page)

**Step 1:** Write `src/pages/図/index.md`:

```markdown
---
title: 図
---

# 図

[皇室称号図](/図/皇室称号図/皇室称号図.html) — 日本の皇室の称号と関係を一覧にした図。
```

**Step 2:** Copy the entire `docs/図/皇室称号図/` directory verbatim to `public/図/皇室称号図/`. The HTML still has the broken `<base>` tag and unused references at this point — that's fine; Phase 5 cleans them up.

**Step 3:** Verify in dev: load `http://localhost:4321/図/`. The link should resolve (the chart itself will still be broken until Phase 5).

**Step 4:** Commit.

Run:
```bash
git add 'src/pages/図/' 'public/図/'
git commit -m "migrate imperial chart to public/ as pass-through"
```

### Task 4.8: Smoke-test all migrated pages in dev

**Files:** none

**Step 1:** Start dev server.

Run: `npm run dev`

**Step 2:** Walk through every URL manually in the browser:

- `/`
- `/拙訳/` and each of its five children
- `/拙論/` and each of its four children
- `/改造/` (verify the lua link downloads)
- `/編輯/` and one of each game's pages
- `/覚書/` and each of its seven children
- `/図/` (the chart link)

Expected: every URL renders without 404 or build error. Console should be quiet (the chart's pre-existing canvas-node noise is OK).

**Step 3:** No commit — verification only.

---

## Phase 5 — Chart cleanup script (TDD)

### Task 5.1: Write a fixture and the first failing test

**Files:**
- Create: `test/fixtures/chart-snippet.html`
- Create: `test/clean-obsidian-export.test.mjs`

**Step 1:** Create a small HTML fixture that contains all three patterns we strip + room to inject the return link.

```html
<!-- test/fixtures/chart-snippet.html -->
<!doctype html>
<html><head>
<title>fixture</title>
<base href="{{ '/' | relative_url }}">
<link itemprop="include" href="site-lib/html/custom-head-content-content.html">
</head>
<body>
<div class="graph-view-wrapper">
  <div id="graph-canvas"></div>
</div>
<div id="main">main content</div>
</body></html>
```

**Step 2:** Write the failing test:

```js
// test/clean-obsidian-export.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { clean } from '../scripts/clean-obsidian-export.mjs';

const fixture = readFileSync(new URL('./fixtures/chart-snippet.html', import.meta.url), 'utf8');

test('strips the Liquid <base> tag', () => {
  const out = clean(fixture);
  assert.ok(!out.includes("{{ '/' | relative_url }}"));
  assert.ok(!/<base\b[^>]*>/i.test(out));
});

test('strips the site-lib include link', () => {
  const out = clean(fixture);
  assert.ok(!out.includes('site-lib/html/custom-head-content-content.html'));
});

test('strips the graph-view-wrapper element and its contents', () => {
  const out = clean(fixture);
  assert.ok(!out.includes('graph-view-wrapper'));
  assert.ok(!out.includes('graph-canvas'));
});

test('injects a return link tagged with data-sg-return-link', () => {
  const out = clean(fixture);
  assert.match(out, /data-sg-return-link/);
  assert.match(out, /← 目次/);
  assert.match(out, /href="\/"/);
});

test('is idempotent (running on cleaned output makes no further change)', () => {
  const once = clean(fixture);
  const twice = clean(once);
  assert.equal(twice, once);
});
```

**Step 3:** Run, confirm failure.

Run: `node --test test/clean-obsidian-export.test.mjs`
Expected: fails with "Cannot find module '../scripts/clean-obsidian-export.mjs'".

### Task 5.2: Implement `clean()` minimally

**Files:**
- Create: `scripts/clean-obsidian-export.mjs`

**Step 1:** Write the script:

```js
// scripts/clean-obsidian-export.mjs
import { readFileSync, writeFileSync } from 'node:fs';

const RETURN_LINK = `<a href="/" data-sg-return-link style="position:fixed;top:14px;left:14px;z-index:9999;padding:8px 14px;background:rgba(20,20,20,0.78);color:#f5f1ea;text-decoration:none;font:14px/1 system-ui,-apple-system,'Hiragino Mincho ProN','Yu Mincho',serif;border-radius:2px;backdrop-filter:blur(6px);">← 目次</a>`;

export function clean(html) {
  let out = html;

  // 1. Strip <base ...> tags (the Liquid one and any other).
  out = out.replace(/<base\b[^>]*>/gi, '');

  // 2. Strip the site-lib include link.
  out = out.replace(/<link\b[^>]*site-lib\/[^>]*>/gi, '');

  // 3. Strip the graph-view-wrapper element with its contents.
  //    The element is plain HTML (not nested in another with the same class),
  //    so a non-greedy match between the opening and closing tags is safe.
  out = out.replace(
    /<div\b[^>]*class="[^"]*\bgraph-view-wrapper\b[^"]*"[^>]*>[\s\S]*?<\/div>/i,
    ''
  );

  // 4. Inject the return link once. Idempotent via the data attribute.
  if (!out.includes('data-sg-return-link')) {
    out = out.replace(/(<body\b[^>]*>)/i, `$1\n${RETURN_LINK}`);
  }

  return out;
}

// CLI: clean a file in place.
if (import.meta.url === `file://${process.argv[1].replace(/\\/g, '/')}`) {
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
```

**Step 2:** Run tests.

Run: `node --test test/clean-obsidian-export.test.mjs`
Expected: all five tests pass.

**Step 3:** Commit.

Run:
```bash
git add scripts/clean-obsidian-export.mjs test/clean-obsidian-export.test.mjs test/fixtures/chart-snippet.html
git commit -m "add obsidian-export cleanup script with TDD"
```

### Task 5.3: Wire `prebuild` and run against the real chart

**Files:**
- Modify: `package.json`

**Step 1:** Add the `prebuild` script. Open `package.json` and edit the `scripts` block to include:

```json
"prebuild": "node scripts/clean-obsidian-export.mjs public/図/皇室称号図/皇室称号図.html"
```

**Step 2:** Run prebuild manually against the real chart.

Run: `npm run prebuild`
Expected: "cleaned …" message.

**Step 3:** Inspect the cleaned file.

```bash
python -c "
with open(r'public/図/皇室称号図/皇室称号図.html', encoding='utf-8') as f:
    text = f.read()
for needle in ['graph-wasm', 'site-lib', \"{{ '/'\", 'graph-view-wrapper']:
    print(needle, 'present:', needle in text)
print('return-link present:', 'data-sg-return-link' in text)
"
```

Expected output:
```
graph-wasm present: True
site-lib present: True
{{ '/' present: False
graph-view-wrapper present: False
return-link present: True
```

(`graph-wasm` and `site-lib` are still present inside large inline JS blobs that we don't touch — those are dead string references inside script bodies, not active resource fetches. The fetches were triggered by the `<base>` tag, the `<link itemprop="include">`, and the graph-view-wrapper element, all of which are now gone.)

**Step 4:** Run prebuild a second time, confirm idempotency.

Run: `npm run prebuild`
Expected: "already clean" message.

**Step 5:** Verify the chart works locally with the cleaned HTML.

Run: `npm run dev`
Load `http://localhost:4321/図/皇室称号図/皇室称号図.html` in the browser.
Verify: canvas renders, click-to-drag works, return link appears top-left, clicking it goes to `/`. Open DevTools — no wasm or site-lib 404s.

**Step 6:** Commit.

Run:
```bash
git add package.json 'public/図/皇室称号図/皇室称号図.html'
git commit -m "wire chart cleanup as prebuild; clean the chart"
```

---

## Phase 6 — Deploy workflow

### Task 6.1: Write `.github/workflows/deploy.yml`

**Files:**
- Create: `.github/workflows/deploy.yml`

**Step 1:** Write the workflow:

```yaml
name: Deploy to Pages

on:
  push:
    branches: [main]
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
        with:
          node-version: '22'
          cache: 'npm'
      - uses: actions/configure-pages@v5
      - run: npm ci --ignore-scripts
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: ./dist

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

**Step 2:** Commit.

Run:
```bash
git add .github/workflows/deploy.yml
git commit -m "add github actions deploy workflow"
```

### Task 6.2: Push and observe the first Action run

**Files:** none

**Step 1:** Push everything so far.

Run: `git push origin main`

**Step 2:** Open the Actions tab in the GitHub UI and watch the run.

Expected: build job succeeds (artifact uploaded). Deploy job **may fail with a Pages-not-configured error** — that's OK, because Pages source is still `/docs`. We flip it in Phase 7.

**Step 3:** If the build job itself fails, fix and re-push. Do not proceed to Phase 7 until at least the build job is green.

No commit in this task — verification only.

---

## Phase 7 — Cutover

### Task 7.1: Flip Pages source to GitHub Actions

**Files:** none (GitHub UI operation)

**Step 1:** In the browser, go to `https://github.com/SojourningGhost/sojourningghost.github.io/settings/pages` and change **Source** from "Deploy from a branch" to **"GitHub Actions"**. Save.

**Step 2:** Trigger a deploy (either push a trivial commit or use the Actions "Run workflow" button on the deploy workflow).

**Step 3:** Watch the deploy job; wait for green.

### Task 7.2: Verify the live site

**Files:** none

**Step 1:** Load `https://sojourningghost.github.io/` — verify the landing page renders with the placeholder Home layout and the section list.

**Step 2:** Spot-check three deep URLs:
- `https://sojourningghost.github.io/拙訳/` (or its URL-encoded equivalent)
- `https://sojourningghost.github.io/図/皇室称号図/皇室称号図.html` — verify canvas, panning, return link, and DevTools console has no wasm/site-lib 404s
- `https://sojourningghost.github.io/改造/FFXI/conversion.lua` — verify the file downloads

**Step 3:** If anything is broken, **do not proceed** to deleting `/docs/`. Investigate, fix, redeploy, re-verify. The backup branch and the still-present `/docs/` folder mean we are recoverable.

### Task 7.3: Delete `/docs/`

**Files:**
- Delete: entire `docs/` folder

**Step 1:** Confirm the live site is fully working (Task 7.2 was green).

**Step 2:** Remove the old tree.

Run: `git rm -r docs/`

But wait — `docs/plans/` lives under `docs/` and contains this plan and the design doc. We want to keep those. Move them first.

Better sequence:
```bash
mkdir -p plans
git mv docs/plans/2026-05-12-site-revamp-design.md plans/2026-05-12-site-revamp-design.md
git mv docs/plans/2026-05-12-site-revamp.md plans/2026-05-12-site-revamp.md
git rm -r docs/
```

**Step 3:** Commit.

Run:
```bash
git add plans/
git commit -m "remove old jekyll docs/ tree; relocate plans/ to repo root"
```

**Step 4:** Push and verify the next Action run still succeeds.

Run: `git push origin main`
Watch Actions tab — build + deploy should be green.

Load `https://sojourningghost.github.io/` and a deep URL again to confirm nothing regressed.

---

## Phase 8 — Frontend-design pass

### Task 8.1: Invoke `/frontend-design` with the brief

**Files:** the skill will read `docs/plans/2026-05-12-site-revamp-design.md` for context; output lands in `src/layouts/` and `src/styles/` and possibly `src/components/`.

**Step 1:** Invoke `@frontend-design:frontend-design`. Prompt for it should reference:

- The aesthetic direction in the design doc's "Aesthetic and the `/frontend-design` brief" section (bookish typographic minimalism, cream paper, ink black, mincho + Western serif, no JS, no decorative chrome).
- The deliverables list (Default/Section/Home layouts, global.css, optional components, an updated inline return-link snippet for the cleanup script).
- The constraints (zero JS, robust to arbitrary `.md`, WCAG AA, Lighthouse 95+, mobile-respectful desktop-first, no emoji, no decorative icons).
- The typography stack (system-first Japanese mincho).
- Examples of representative content for the designer to design against: `src/pages/index.md`, `src/pages/拙訳/index.md`, `src/pages/拙訳/Close to you英訳.md`, `src/pages/編輯/index.md`.

**Step 2:** Apply the design output. Replace the placeholder `Default.astro`, `Section.astro`, `Home.astro` with the designed versions. Add `src/styles/global.css` and any new components.

**Step 3:** Walk every page in dev (`npm run dev`) and confirm nothing renders worse than before. The auto-listing in `Section.astro` and `Home.astro` should still work.

**Step 4:** Update the chart return-link inline styles in `scripts/clean-obsidian-export.mjs` to match the new site palette and typography. Re-run `npm run prebuild` to apply.

**Step 5:** Commit.

Run:
```bash
git add src/ scripts/clean-obsidian-export.mjs 'public/図/皇室称号図/皇室称号図.html'
git commit -m "apply frontend-design pass; bookish typographic minimalism"
```

### Task 8.2: Push and verify the designed site live

**Files:** none

**Step 1:** Push.

Run: `git push origin main`

**Step 2:** After the Action deploys, walk through every page on the live site. Confirm typography, spacing, contrast, and overall look match the intent. Run a Lighthouse audit on the home page.

Expected: Lighthouse Performance / Accessibility / Best Practices / SEO all ≥ 95.

**Step 3:** If anything doesn't meet the bar, iterate — file a follow-up task, fix, commit, push, re-verify.

---

## Phase 9 — Documentation

### Task 9.1: Rewrite `CLAUDE.md` for the new architecture

**Files:**
- Modify: `CLAUDE.md` (full rewrite)

**Step 1:** Replace the file's contents. The current `CLAUDE.md` describes the old Jekyll layout and is now wrong. New contents (approximate, the executor fills in specifics):

```markdown
# CLAUDE.md

Guidance for Claude Code (claude.ai/code) when working in this repo.

## What this repo is

A personal portfolio at https://sojourningghost.github.io — Japanese↔English
translations, essays on Japanese language, English editing samples, an FFXI
mod, language notes, and an interactive imperial-titles chart.

## How the site is built and deployed

- Astro at the repo root; built and deployed by `.github/workflows/deploy.yml`
  on every push to `main`. Pages source is set to "GitHub Actions" (not a branch).
- Markdown content lives in `src/pages/**/*.md`. Filenames map directly to
  URLs. Layouts are assigned automatically by a remark plugin in
  `scripts/remark-auto-layout.mjs`:
  - `src/pages/index.md` → `Home.astro`
  - `src/pages/<section>/index.md` → `Section.astro` (auto-lists siblings)
  - everything else → `Default.astro`
- The imperial chart is a self-contained HTML file at
  `public/図/皇室称号図/皇室称号図.html`. It's served verbatim — Astro does
  not process it. A `prebuild` script (`scripts/clean-obsidian-export.mjs`)
  runs before every build to strip stale references and inject a return link.
  Re-exports from Obsidian are auto-cleaned on the next build.

## Repo layout

(short tree, mirroring the design doc)

## Conventions

- Commit style is terse, lowercase, imperative — match the existing log.
- **No co-author lines, no Claude attribution** on commits.
- All `npm install` / `npm add` use `--ignore-scripts` and `--save-exact`.
- For non-ASCII paths on Windows, prefer the `Bash` tool over `Write` if
  `Write` fails with EEXIST (known Claude Code regression).

## Adding content

- Drop a `.md` file into `src/pages/<section>/`. Frontmatter optional;
  `title:` if the filename or H1 isn't a good display title.
- Adding a new section: create `src/pages/<section>/index.md` with
  `title: <name>` frontmatter and intro prose. Children list automatically.

## The chart

- Edit the canvas in Obsidian.
- Re-export with Webpage HTML Export → drop the new HTML at
  `public/図/皇室称号図/皇室称号図.html` overwriting the old one.
- Next `npm run dev` or `npm run build` cleans it automatically.
- Pre-existing "Failed to find all required elements for canvas node" console
  noise is harmless and shows up locally too.

## Build / deploy

See `WORKFLOW.md` for the human-side workflow.

## Where the design rationale lives

`plans/2026-05-12-site-revamp-design.md` (or wherever plans/ ends up post-cutover).
```

**Step 2:** Commit.

Run:
```bash
git add CLAUDE.md
git commit -m "rewrite CLAUDE.md for the new astro architecture"
```

### Task 9.2: Write `WORKFLOW.md`

**Files:**
- Create: `WORKFLOW.md`

**Step 1:** Write the workflow doc. Sections from the design doc's documentation plan:

1. Prerequisites (Node 22, Git, editor — Obsidian-as-vault option).
2. First-time setup (clone, `npm install --ignore-scripts`, folder map).
3. Daily workflow — writing a page.
4. Adding a new section.
5. Re-exporting the chart from Obsidian.
6. Local preview (`npm run dev`, `npm run preview`).
7. How deploy works (Actions workflow + Pages settings).
8. Troubleshooting (build failures local/CI, missing pages, stuck dev server, chart breaks, Pages 404).

Each section short, with exact commands. ~150 lines target.

**Step 2:** Commit.

Run:
```bash
git add WORKFLOW.md
git commit -m "add WORKFLOW.md"
```

### Task 9.3: Rewrite `README.md`

**Files:**
- Modify: `README.md`

**Step 1:** Replace the contents with a short, public-facing intro. ~30 lines.

```markdown
# sojourningghost.github.io

Source for the portfolio at <https://sojourningghost.github.io/> — Japanese↔English
translations, essays on Japanese language, English editing samples, a Final
Fantasy XI mod, language notes, and an interactive chart of the Japanese
imperial household titles.

Built with [Astro](https://astro.build/). Deployed to GitHub Pages via
GitHub Actions on every push to `main`.

## For visitors

Browse the site directly: <https://sojourningghost.github.io/>.

## For me (and AI assistants)

- `WORKFLOW.md` — how to write content, preview locally, publish, and
  troubleshoot.
- `CLAUDE.md` — architecture and conventions for AI agents working on this repo.
- `plans/2026-05-12-site-revamp-design.md` — design rationale for the
  current architecture.
```

**Step 2:** Commit.

Run:
```bash
git add README.md
git commit -m "rewrite README for new architecture"
```

---

## Phase 10 — Final verification

### Task 10.1: Walk through `WORKFLOW.md` on a clean checkout

**Files:** none

**Step 1:** Clone the repo into a temp directory.

```bash
cd /tmp  # or %TEMP% on Windows
git clone https://github.com/SojourningGhost/sojourningghost.github.io.git verify
cd verify
```

**Step 2:** Follow `WORKFLOW.md` line by line — install, dev, build, preview. Note anywhere the doc is wrong or out of date.

**Step 3:** Fix anything broken in `WORKFLOW.md`, commit and push.

### Task 10.2: Walk the live site one last time

**Files:** none

**Step 1:** Load every section on `https://sojourningghost.github.io/`. Confirm:
- Landing page intro renders, section list shows all sections.
- Each section landing renders, auto-list shows children.
- Each child page renders.
- The chart loads, pans, return-link works.
- The lua download works.
- The Lighthouse home-page audit still passes (≥95 across all metrics).

**Step 2:** If anything regressed, file a follow-up.

Otherwise: migration complete.

---

## Reference: what's intentionally not in this plan

Per the design doc, these are deferred:
- RSS feed
- Pagefind / on-site search
- Analytics
- i18n routing
- Image optimization for inline review screenshots
- PR preview deploys via Cloudflare Pages
- Vault CMS / Astro Modular Obsidian integrations
- URL redirects from old `/<folder>/readme.html`

If any of these become priorities, open a new design pass — don't bolt them on during this migration.
