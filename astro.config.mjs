// @ts-check
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

// The public site URL and the theme are editable from the admin panel (Settings → Site settings).
const settings = JSON.parse(readFileSync(new URL('./src/data/settings.json', import.meta.url), 'utf8'));

// Each client site picks its design with `theme`. Preview another one with: THEME=classic npm run dev
const theme = process.env.THEME || settings.theme || 'classic';
const themeEntry = fileURLToPath(new URL(`./src/themes/${theme}/index.ts`, import.meta.url));
if (!existsSync(themeEntry)) throw new Error(`Unknown theme "${theme}". Available themes are the folders in src/themes/.`);

// Optional overrides used to build the theme demos for the Ananta Newz website (see showcase/build.mjs):
//   THEME=pravah BASE=/demo/pravah OUT_DIR=showcase/dist/demo/pravah SITE=https://anantanewz.pages.dev astro build
// https://astro.build/config
export default defineConfig({
  site: process.env.SITE || settings.site_url || 'https://example.com',
  base: process.env.BASE || '/',
  outDir: process.env.OUT_DIR || './dist',
  // Keep classic whitespace handling so inline elements never collapse together.
  compressHTML: true,
  // Pages start loading the moment a reader hovers a link — navigation feels instant.
  prefetch: { prefetchAll: true, defaultStrategy: 'hover' },
  build: { inlineStylesheets: 'always' },
  integrations: [sitemap({ filter: (page) => !page.includes('/admin/') && !page.includes('/offline/') && !page.includes('/app/v1/') })],
  // Pages import their design from '@theme', which points at the selected theme folder.
  vite: {
    resolve: {
      alias: {
        '@theme-config': fileURLToPath(new URL(`./src/themes/${theme}/config.ts`, import.meta.url)),
        '@theme': themeEntry,
      },
    },
  },
});
