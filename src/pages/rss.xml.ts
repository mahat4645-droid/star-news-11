import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { articleUrl, excerptOf, getArticles, getCategory, settings } from '../lib/content';

export async function GET(context: APIContext) {
  const articles = (await getArticles()).filter((a) => !a.data.draft).slice(0, 50);
  return rss({
    title: settings.site_title,
    description: settings.description,
    site: context.site ?? settings.site_url,
    customData: `<language>${settings.locale}</language>`,
    items: await Promise.all(
      articles.map(async (a) => ({
        title: a.data.title,
        link: articleUrl(a),
        pubDate: a.data.date,
        description: excerptOf(a),
        categories: [(await getCategory(a.data.category)).name, ...a.data.tags],
      })),
    ),
  });
}
