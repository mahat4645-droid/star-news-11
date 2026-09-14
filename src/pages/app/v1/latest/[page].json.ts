import type { APIRoute, GetStaticPaths } from 'astro';
import { getArticles, type Article } from '../../../../lib/content';
import { cardsOf, json, pages } from '../../../../lib/app-feed';

// Every story, newest first, 20 per file: /app/v1/latest/1.json, 2.json…
export const getStaticPaths = (async () => {
  const chunks = pages(await getArticles());
  return chunks.map((items, i) => ({ params: { page: String(i + 1) }, props: { items, page: i + 1, last: chunks.length } }));
}) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) =>
  json({ page: props.page, pages: props.last, items: await cardsOf(props.items as Article[]) });
