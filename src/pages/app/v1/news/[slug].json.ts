import type { APIRoute, GetStaticPaths } from 'astro';
import { coverOf, getArticles, getAuthor, getCategory, resolveImage, type Article } from '../../../../lib/content';
import { card, cardsOf, image, json } from '../../../../lib/app-feed';

// One story with its full text, for the app's reader screen.
export const getStaticPaths = (async () =>
  (await getArticles()).map((article) => ({ params: { slug: article.id }, props: { article } }))) satisfies GetStaticPaths;

export const GET: APIRoute = async ({ props }) => {
  const article = props.article as Article;
  const { data } = article;
  const [base, cover, author, category, all] = await Promise.all([
    card(article),
    image(coverOf(article), 1100),
    getAuthor(data.author),
    getCategory(data.category),
    getArticles(),
  ]);
  const avatar = author?.avatar ? await image(author.avatar, 96) : undefined;

  // Related: same section first, then its parent section, then the newest.
  const others = all.filter((a) => a.id !== article.id);
  const related = [
    ...others.filter((a) => a.data.category === data.category),
    ...others.filter((a) => !!category.parent && a.data.category === category.parent),
    ...others,
  ]
    .filter((a, i, list) => list.indexOf(a) === i)
    .slice(0, 6);

  return json({
    ...base,
    cover: cover && { src: cover.src, ratio: cover.h ? cover.w / cover.h : undefined },
    cover_alt: data.cover_alt,
    cover_caption: data.cover_caption,
    updated: data.updated?.toISOString(),
    tags: data.tags,
    author: author && { id: author.id, name: author.name, role: author.role, avatar: avatar?.src },
    html: await bodyHtml(article),
    related: await cardsOf(related),
  });
};

const unescape = (s: string) => s.replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&');
const attr = (s = '') => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;');

/** The story text as HTML, with every photo pointing at a real (optimised) file. */
async function bodyHtml(article: Article): Promise<string> {
  const html = article.rendered?.html ?? '';
  const tags = [...new Set(html.match(/<img\b[^>]*>/g) ?? [])];
  const swaps = await Promise.all(
    tags.map(async (tag) => {
      // Photos stored next to the story are left as placeholders by Astro until the page renders them.
      const placeholder = tag.match(/__ASTRO_IMAGE_="([^"]*)"/)?.[1];
      const meta = placeholder ? (JSON.parse(unescape(placeholder)) as { src: string; alt?: string }) : undefined;
      const src = meta?.src ?? unescape(tag.match(/\ssrc="([^"]*)"/)?.[1] ?? '');
      const alt = meta?.alt ?? unescape(tag.match(/\salt="([^"]*)"/)?.[1] ?? '');
      const found = await image(resolveImage(src && decodeURI(src), article.filePath), 1100);
      return found ? `<img src="${attr(found.src)}" alt="${attr(alt)}" loading="lazy">` : tag;
    }),
  );
  return tags.reduce((out, tag, i) => out.replaceAll(tag, swaps[i]), html);
}
