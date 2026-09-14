import { getCollection, type CollectionEntry } from 'astro:content';
import type { ImageMetadata } from 'astro';
import settings from '../data/settings.json';
import { url } from './url';

export { settings };

export type Article = CollectionEntry<'articles'>;
export type WebStory = CollectionEntry<'webstories'>;
export type Category = { id: string; name: string; description: string; color: string; order: number; parent?: string };
export type Author = { id: string; name: string; role: string; bio: string; avatar?: ResolvedImage; x?: string };
export type ResolvedImage = { kind: 'local'; src: ImageMetadata } | { kind: 'url'; src: string };

const FALLBACK_COLORS = ['#c8102e', '#1d4ed8', '#047857', '#b45309', '#7c3aed', '#0e7490', '#be185d'];

// Memoise collection work in production builds only — in dev, content edits must show up immediately.
function memo<T>(load: () => Promise<T>): () => Promise<T> {
  let cached: Promise<T> | undefined;
  return () => (import.meta.env.DEV ? load() : (cached ??= load()));
}

/* ---------------------------------------------------------------- stories */

/** Published stories, newest first. Drafts are visible only in `npm run dev`. */
export const getArticles = memo(async () => {
  const list = await getCollection('articles', ({ data }) => import.meta.env.DEV || !data.draft);
  return list.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
});

export const articleUrl = (a: Article) => url(`news/${a.id}/`);

export function excerptOf(a: Article, max = 180): string {
  if (a.data.excerpt) return a.data.excerpt;
  const text = (a.body ?? '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, ' ')
    .replace(/\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/[#>*_`~-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return text.length > max ? text.slice(0, max).replace(/\s+\S*$/, '') + '…' : text;
}

export function readingTime(body = ''): number {
  const words = body.replace(/<[^>]+>/g, ' ').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(words / 230));
}

/** Accepts any YouTube link (watch, youtu.be, shorts, embed, live) or a bare 11-character id. */
export function youtubeId(input?: string | null): string | undefined {
  if (!input) return;
  const s = input.trim();
  if (/^[\w-]{11}$/.test(s)) return s;
  try {
    const u = new URL(s);
    if (u.hostname.endsWith('youtu.be')) return u.pathname.slice(1, 12) || undefined;
    const v = u.searchParams.get('v');
    if (v) return v.slice(0, 11);
    return u.pathname.match(/\/(?:embed|shorts|live|v)\/([\w-]{11})/)?.[1];
  } catch {
    return;
  }
}

/* ------------------------------------------------------------- taxonomies */

// Keeps letters from every script (e.g. Hindi tags get Devanagari URLs) and drops Latin accents.
export const slugify = (s: string) =>
  s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\p{L}\p{M}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');

const titleCase = (s: string) => s.replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export const getCategories = memo(async (): Promise<Category[]> => {
  const entries = await getCollection('categories');
  return entries
    .map((e, i) => ({
      id: e.id,
      name: e.data.name,
      description: e.data.description ?? '',
      color: e.data.color || FALLBACK_COLORS[i % FALLBACK_COLORS.length],
      order: e.data.order ?? 99,
      parent: e.data.parent,
    }))
    .sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));
});

/** Sections shown in the main menu (those without a parent). */
export const getTopCategories = memo(async () => (await getCategories()).filter((c) => !c.parent));

export async function getChildCategories(id: string): Promise<Category[]> {
  return (await getCategories()).filter((c) => c.parent === id);
}

/** Matches stories in a section, including its sub-sections (e.g. States → Uttar Pradesh). */
export async function inCategory(id: string): Promise<(a: Article) => boolean> {
  const ids = new Set([id, ...(await getChildCategories(id)).map((c) => c.id)]);
  return (a) => ids.has(a.data.category);
}

/** Most-used tags across recent stories. */
export async function getTrendingTags(limit = 8): Promise<string[]> {
  const counts = new Map<string, number>();
  for (const a of (await getArticles()).slice(0, 60)) {
    for (const tag of a.data.tags) counts.set(tag, (counts.get(tag) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([tag]) => tag);
}

/* ------------------------------------------------------------ web stories */

export const getWebStories = memo(async () => {
  const list = await getCollection('webstories', ({ data }) => import.meta.env.DEV || !data.draft);
  return list.sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());
});

export const webStoryUrl = (s: WebStory) => url(`web-stories/${s.id}/`);

export async function getCategory(id: string): Promise<Category> {
  const found = (await getCategories()).find((c) => c.id === id);
  return found ?? { id, name: titleCase(id), description: '', color: 'var(--accent)', order: 999 };
}

export const categoryUrl = (id: string) => url(`category/${id}/`);

export const getAuthors = memo(async (): Promise<Author[]> => {
  const entries = await getCollection('authors');
  return entries.map((e) => ({
    id: e.id,
    name: e.data.name,
    role: e.data.role ?? '',
    bio: e.data.bio ?? '',
    avatar: resolveImage(e.data.avatar, e.filePath),
    x: e.data.x,
  }));
});

export async function getAuthor(id?: string): Promise<Author | undefined> {
  if (!id) return;
  const found = (await getAuthors()).find((a) => a.id === id);
  return found ?? { id, name: titleCase(id), role: '', bio: '' };
}

export const authorUrl = (id: string) => url(`author/${id}/`);
export const tagUrl = (tag: string) => url(`tag/${slugify(tag)}/`);
export const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();

/* ----------------------------------------------------------------- images */

// Every image stored next to content is known at build time, so Astro can optimise it.
const localImages = import.meta.glob<{ default: ImageMetadata }>(
  '/src/{content,assets}/**/*.{jpg,jpeg,png,webp,avif,gif,JPG,JPEG,PNG,WEBP}',
  { eager: true },
);

function normalisePath(p: string): string {
  const out: string[] = [];
  for (const part of p.split('/')) {
    if (part === '..') out.pop();
    else if (part && part !== '.') out.push(part);
  }
  return '/' + out.join('/');
}

/**
 * Resolves an image value written by the admin panel:
 *  - `cover.webp` / `./cover.webp` → file next to the entry (optimised by Astro)
 *  - `/uploads/x.webp`             → file in /public (served as-is)
 *  - `https://…`                   → remote image
 */
export function resolveImage(value?: string | null, entryFilePath?: string): ResolvedImage | undefined {
  if (!value) return;
  if (/^(https?:)?\/\//.test(value) || value.startsWith('data:')) return { kind: 'url', src: value };
  if (value.startsWith('/src/')) {
    const hit = localImages[normalisePath(value)];
    if (hit) return { kind: 'local', src: hit.default };
  }
  if (value.startsWith('/')) return { kind: 'url', src: url(value) };
  if (entryFilePath) {
    const dir = entryFilePath.replace(/\\/g, '/').replace(/\/[^/]*$/, '');
    const hit = localImages[normalisePath(`${dir}/${value}`)];
    if (hit) return { kind: 'local', src: hit.default };
  }
  return { kind: 'url', src: value };
}

export const coverOf = (a: Article) => resolveImage(a.data.cover, a.filePath);
export const webStoryCover = (s: WebStory) => resolveImage(s.data.cover ?? s.data.slides[0]?.image, s.filePath);

/** Brand colour from Site settings, if it is a valid hex colour. */
export const brandColor = /^#[0-9a-f]{3,8}$/i.test((settings as { brand_color?: string }).brand_color ?? '')
  ? (settings as { brand_color?: string }).brand_color
  : undefined;

/* ------------------------------------------------------------------ dates */

const fmt = (opts: Intl.DateTimeFormatOptions) =>
  new Intl.DateTimeFormat(settings.locale || 'en-US', { timeZone: settings.timezone || 'UTC', ...opts });

export const formatDate = (d: Date) => fmt({ day: 'numeric', month: 'long', year: 'numeric' }).format(d);
export const formatShortDate = (d: Date) => fmt({ day: 'numeric', month: 'short' }).format(d);
export const formatTime = (d: Date) => fmt({ hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).format(d);
export const formatDateTime = (d: Date) =>
  fmt({ day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }).format(d);
