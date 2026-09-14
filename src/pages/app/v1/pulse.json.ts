import type { APIRoute } from 'astro';
import { getArticles } from '../../../lib/content';
import { json } from '../../../lib/app-feed';
import { url } from '../../../lib/url';

// A tiny file the app checks in the background (about every 30 minutes) to show breaking-news alerts.
// Mark a story as "Breaking news" in the admin panel and phones with the app get a notification.
export const GET: APIRoute = async () => {
  const all = await getArticles();
  const brief = (a: (typeof all)[number]) => ({ id: a.id, title: a.data.title, date: a.data.date.toISOString(), path: url(`news/${a.id}/`) });
  return json({
    latest: all[0] ? brief(all[0]) : null,
    breaking: all.filter((a) => a.data.breaking).slice(0, 5).map(brief),
  });
};
