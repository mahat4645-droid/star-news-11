// Data for the Android app (app/). The site publishes its stories as small static JSON files under
// /app/v1/, and the app reads them — so the app needs no server, and new stories reach it without an app update.
// Every path in these files is root-relative (it already includes the base); the app resolves it against the site address.
import { getImage } from 'astro:assets';
import {
  articleUrl,
  brandColor,
  coverOf,
  excerptOf,
  getArticles,
  getAuthor,
  getCategories,
  getWebStories,
  readingTime,
  resolveImage,
  settings,
  webStoryCover,
  youtubeId,
  type Article,
  type ResolvedImage,
  type WebStory,
} from './content';
import { url } from './url';

export const PAGE_SIZE = 20;
/** Number of stories in home.json — enough for the home feed and every section block on it. */
export const HOME_SIZE = 60;

type Img = { src: string; w: number; h: number };

/** One optimised WebP at (up to) the given width. Remote images are passed through. */
export async function image(r: ResolvedImage | undefined, width: number, quality = 78): Promise<Img | undefined> {
  if (!r) return;
  if (r.kind === 'url') return { src: r.src, w: 0, h: 0 };
  const w = Math.min(width, r.src.width);
  const out = await getImage({ src: r.src, width: w, quality });
  return { src: out.src, w: Number(out.attributes.width) || w, h: Number(out.attributes.height) || 0 };
}

export interface Card {
  id: string;
  title: string;
  excerpt: string;
  category: string;
  author?: string;
  date: string;
  /** ~400px wide: list thumbnails. */
  thumb?: string;
  /** ~800px wide: big cards. */
  image?: string;
  /** Width / height of the cover, so cards can reserve space. */
  ratio?: number;
  video?: string;
  breaking?: true;
  featured?: true;
  minutes: number;
  /** Page on the website, for sharing. */
  url: string;
}

const cards = new Map<string, Promise<Card>>();

export function card(a: Article): Promise<Card> {
  let hit = cards.get(a.id);
  if (!hit) {
    hit = (async () => {
      const cover = coverOf(a);
      const video = youtubeId(a.data.youtube);
      const [thumb, big, author] = await Promise.all([image(cover, 360), image(cover, 800), getAuthor(a.data.author)]);
      return {
        id: a.id,
        title: a.data.title,
        excerpt: excerptOf(a, 160),
        category: a.data.category,
        author: author?.name,
        date: a.data.date.toISOString(),
        thumb: thumb?.src ?? (video ? `https://i.ytimg.com/vi/${video}/mqdefault.jpg` : undefined),
        image: big?.src ?? (video ? `https://i.ytimg.com/vi/${video}/hqdefault.jpg` : undefined),
        ratio: big?.h ? Math.round((big.w / big.h) * 1000) / 1000 : undefined,
        video,
        breaking: a.data.breaking || undefined,
        featured: a.data.featured || undefined,
        minutes: readingTime(a.body),
        url: new URL(articleUrl(a), settings.site_url).href,
      } satisfies Card;
    })();
    cards.set(a.id, hit);
  }
  return hit;
}

export const cardsOf = (list: Article[]) => Promise.all(list.map(card));

/** Site details the app needs: name, colours, links and widgets from Site settings. */
export function siteInfo() {
  const s = settings as typeof settings & {
    social?: Record<string, string>;
    app?: Record<string, string>;
    donate?: { upi_id?: string; payee_name?: string; note?: string };
  };
  const upi = s.donate?.upi_id && !s.donate.upi_id.includes('your-upi-id') ? s.donate : undefined;
  return {
    title: s.site_title,
    tagline: s.tagline,
    description: s.description,
    language: s.language,
    locale: s.locale,
    timezone: s.timezone,
    url: new URL(url(), s.site_url).href,
    logo: s.logo ? url(s.logo) : undefined,
    brand: brandColor,
    ticker: s.show_ticker ? s.ticker_label : undefined,
    whatsapp: s.whatsapp_channel || undefined,
    telegram: s.telegram_channel || undefined,
    social: Object.fromEntries(Object.entries(s.social ?? {}).filter(([, v]) => v)),
    donate: upi && { upi: upi.upi_id, name: upi.payee_name || s.site_title, note: upi.note },
    quotes: s.quotes ?? [],
  };
}

export async function categoriesInfo() {
  const [cats, all] = await Promise.all([getCategories(), getArticles()]);
  return cats.map((c) => ({
    id: c.id,
    name: c.name,
    color: c.color,
    parent: c.parent,
    count: all.filter((a) => a.data.category === c.id).length,
  }));
}

export async function webStoryInfo(s: WebStory) {
  const [cover, slides] = await Promise.all([
    image(webStoryCover(s), 480, 72),
    Promise.all(
      s.data.slides.map(async (slide) => ({
        image: (await image(resolveImage(slide.image, s.filePath), 720, 72))?.src,
        heading: slide.heading,
        text: slide.text,
        credit: slide.credit,
      })),
    ),
  ]);
  const link = s.data.link;
  return {
    id: s.id,
    title: s.data.title,
    date: s.data.date.toISOString(),
    category: s.data.category,
    cover: cover?.src,
    slides,
    // Stories on this site open inside the app; other links open in the browser.
    link: link ? (link.startsWith('/') ? url(link) : link) : undefined,
  };
}

export const webStoriesInfo = async () => Promise.all((await getWebStories()).map(webStoryInfo));

export const json = (data: unknown) =>
  new Response(JSON.stringify(data), { headers: { 'Content-Type': 'application/json; charset=utf-8' } });

/** Splits a list into pages of PAGE_SIZE (always at least one page). */
export function pages<T>(list: T[]): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < list.length; i += PAGE_SIZE) out.push(list.slice(i, i + PAGE_SIZE));
  return out.length ? out : [[]];
}
