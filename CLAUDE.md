# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this repo is

A personal portfolio site published at https://sojourningghost.github.io/. The owner ("SojourningGhost") is a translator and editor; the site holds Japanese↔English translations, essays on Japanese language, a Final Fantasy XI mod, English editing samples of game reviews, and one large interactive diagram of Japanese imperial titles.

## How the site is built and deployed

- GitHub Pages, **source = `/docs` on `main`**. There is no CI; every push to `main` triggers a Pages build. The repo root is *not* the site root — anything outside `docs/` is invisible to the live site.
- Jekyll with `jekyll-theme-minimal` (configured in `docs/_config.yml`). No `Gemfile`, no `.nojekyll`. Builds run with whatever versions GitHub Pages ships.
- No `index.html`. The site index is `docs/readme.md`, which Jekyll renders to `/` because GitHub Pages treats README/readme as a fallback index. Edits to that file *are* edits to the landing page.
- There is no local build, lint, or test tooling. To preview changes, push and check the live site, or run `bundle exec jekyll serve -s docs` after creating a Gemfile (not currently checked in).

## Repo layout

```
README.md                    # repo-level overview (not part of the site)
docs/                        # site source — everything below is published
  _config.yml                # Jekyll config (theme/title/tagline/description)
  readme.md                  # site landing page (rendered at /)
  図/                        # "diagrams" — currently the imperial-titles HTML
  拙訳/                       # translations (humble form: setsuyaku)
  拙論/                       # essays on language (setsuron)
  改造/                       # mods (kaizou) — currently one FFXI Lua mod
  編輯/                       # editing samples (henshuu) — game reviews + style guide
  覚書/                       # language notes/memoranda (oboegaki)
```

Each content subfolder usually has a `readme.md` or `readme.txt` describing what's inside; the markdown ones are reachable as `/<folder>/readme.html` on the live site.

## Jekyll/Liquid gotchas in this repo

These have caused real churn — recent commit history is mostly the owner wrestling with them.

- **Linking from `docs/readme.md` to other pages.** Use Liquid `relative_url` so the path resolves correctly under the project's GitHub Pages base:
  ```html
  <a href="{{ '/図/皇室称号図/皇室称号図.html' | relative_url }}">皇室称号図</a>
  ```
  The leading slash and the `.html` extension both matter — the Obsidian-exported page is a raw HTML asset, not a Markdown-derived one, so Jekyll won't strip the extension.

- **Liquid in a raw HTML file requires YAML front-matter.** Jekyll only evaluates `{{ … }}` and `{% … %}` in files that begin with a `---` front-matter block (even an empty `---\n---\n` is enough; `layout: null` works too). Without front-matter, the file is copied verbatim and any Liquid ships as literal text.

  `docs/図/皇室称号図/皇室称号図.html` currently has `<base href="{{ '/' | relative_url }}">` but no front-matter (it was added in commit `a398555` "jekyll'd" and removed in `4b1c154` "dejekylling Ihope"). Because every image inside that page is embedded as a `data:` URI, the broken base tag is cosmetic — nothing fails to load — but a literal `{{ '/' | relative_url }}` string ends up in the deployed HTML's `<head>`. Re-adding `---\n---\n` at the top fixes it; alternatively replace the value with a hard-coded path or remove the `<base>` tag.

## The big HTML file

`docs/図/皇室称号図/皇室称号図.html` is a ~3 MB single-file export from Obsidian Canvas (visualizes the Japanese imperial household titles). It contains the Obsidian runtime as inline minified JS plus all referenced images as base64 `data:` URIs.

- **Do not `Read` it whole** — it exceeds the tool's token limit. Use `head`/`tail`/`grep` to inspect specific sections, or read by byte offset.
- The `.canvas` JSON next to it (`皇室称号図.canvas`) is the editable source in Obsidian; the `.html` is a re-export. Hand-edits to the HTML survive only until the next re-export.
- The `画像/` subfolder holds the original SVG/JPG/PNG flag and reference images that are inlined into the HTML.

## Working with this repo

- **Filenames and folders are Japanese.** Most paths contain CJK characters. Shells and tools generally handle this, but expect URL-encoded forms (`%E5%9B%B3` for `図`, etc.) in logs and browser address bars.
- **Commit style is terse.** The owner's commit messages are typically one to three words (`link`, `fixing html`, `dejekylling Ihope`). Match register when committing on this repo — short, lowercase, no ceremony.
- **No co-author / Claude attribution lines on commits** (per the user's global guidance).
- **Verifying a fix means looking at the live site.** Because there's no local build, "tests pass" doesn't apply. After pushing, wait for the Pages build and load the affected URL in a browser before declaring a fix done.
