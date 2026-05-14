// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import { remarkAutoLayout } from './scripts/remark-auto-layout.mjs';
import { remarkWikilinkStrip } from './scripts/remark-wikilink-strip.mjs';
import { remarkH1Title } from './scripts/remark-h1-title.mjs';
import { remarkYoutubeEmbed } from './scripts/remark-youtube-embed.mjs';
import { remarkSoftBreaks } from './scripts/remark-soft-breaks.mjs';
import { remarkRuby } from './scripts/remark-ruby.mjs';

// https://astro.build/config
export default defineConfig({
  site: 'https://sojourningghost.github.io',
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [remarkYoutubeEmbed, remarkWikilinkStrip, remarkH1Title, remarkSoftBreaks, remarkRuby, remarkAutoLayout],
  },
});
