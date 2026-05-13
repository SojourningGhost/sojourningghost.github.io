// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';

// https://astro.build/config
export default defineConfig({
  site: 'https://sojourningghost.github.io',
  integrations: [mdx(), sitemap()],
  markdown: {
    remarkPlugins: [],
    // Auto-layout plugin appended in Task 3.5.
  },
});
