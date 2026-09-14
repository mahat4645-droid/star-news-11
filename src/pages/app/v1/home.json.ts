import type { APIRoute } from 'astro';
import { getCollection } from 'astro:content';
import { getArticles } from '../../../lib/content';
import { HOME_SIZE, cardsOf, categoriesInfo, json, siteInfo, webStoriesInfo } from '../../../lib/app-feed';

// Everything the app's home screen needs in one request: site details, sections, the latest stories and web stories.
export const GET: APIRoute = async () => {
  const all = await getArticles();
  // The newest stories, plus a few from every section so each section block on the home screen has stories.
  const picked = new Set(all.slice(0, HOME_SIZE));
  const perSection = new Map<string, number>();
  for (const a of all) {
    const n = perSection.get(a.data.category) ?? 0;
    if (n < 4) picked.add(a);
    perSection.set(a.data.category, n + 1);
  }
  const stories = await cardsOf(all.filter((a) => picked.has(a)));
  const pages = (await getCollection('pages')).map((p) => ({ id: p.id, title: p.data.title }));

  return json({
    v: 1,
    generated: new Date().toISOString(),
    site: siteInfo(),
    categories: await categoriesInfo(),
    stories,
    total: all.length,
    webstories: await webStoriesInfo(),
    pages,
  });
};
