import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import { remarkMermaid } from './remark-mermaid.mjs';

export default defineConfig({
  site: 'https://toly1994328.github.io',
  integrations: [mdx()],
  markdown: {
    remarkPlugins: [remarkMermaid],
    shikiConfig: {
      theme: 'one-dark-pro',
    },
  },
});
