import type { APIRoute } from 'astro';
import { brandColor, settings } from '../lib/content';
import { url } from '../lib/url';

// Web app manifest — lets phones install the site, and is what PWABuilder uses to make the Android app.
export const GET: APIRoute = () =>
  new Response(
    JSON.stringify({
      name: settings.site_title,
      short_name: settings.site_title,
      description: settings.description,
      id: url(),
      start_url: url('?source=app'),
      scope: url(),
      display: 'standalone',
      background_color: '#faf8f4',
      theme_color: brandColor ?? '#141414',
      categories: ['news'],
      icons: [
        { src: url('icons/icon-192.png'), sizes: '192x192', type: 'image/png', purpose: 'any' },
        { src: url('icons/icon-512.png'), sizes: '512x512', type: 'image/png', purpose: 'any' },
        { src: url('icons/icon-maskable-512.png'), sizes: '512x512', type: 'image/png', purpose: 'maskable' },
      ],
      shortcuts: [
        { name: 'Latest news', url: url('latest/'), icons: [{ src: url('icons/icon-192.png'), sizes: '192x192' }] },
        { name: 'Videos', url: url('videos/'), icons: [{ src: url('icons/icon-192.png'), sizes: '192x192' }] },
      ],
    }),
    { headers: { 'Content-Type': 'application/manifest+json' } },
  );
