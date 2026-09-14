import type { APIRoute, GetStaticPaths } from 'astro';
import { getArticles, getCategories, inCategory, type Article } from '../../../../../lib/content';
import { cardsOf, json, pages } from '../../../../../lib/app-feed';

// Stories in one section (including its sub-sections), 20 per file: /app/v1/category/<id>/1.json…
export const getStaticPaths = (async () => {
  const [categories, all] = await Promise.all([getCategories(), getArticles()]);
  const paths = [];
  for (const c of categories) {
    const chunks = pages(all.filter(await inCategory(c.id)));
    chunks.forEach((items, i) =>
      paths.push({ params: { id: c.id, page: String(i + 1) }, props: { items, page: i + 1, last: chunks.length } }),
    );
  }
  return paths;
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  json({ page: props.page, pages: props.last, items: await cardsOf(props.items as Article[]) });
