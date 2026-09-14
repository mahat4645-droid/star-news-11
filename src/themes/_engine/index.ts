// The shared theme engine. Themes built on it re-export these pages and choose their look
// through config.ts (layout choices) and theme.css (colours and fonts).
export { default as Layout } from './Layout.astro';
export { default as HomePage } from './HomePage.astro';
export { default as StoryPage } from './StoryPage.astro';
export { default as ListPage } from './ListPage.astro';
export { default as VideosPage } from './VideosPage.astro';
