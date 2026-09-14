// Data contracts between the shared routes (src/pages) and each theme's page components.
import type { Page } from 'astro';
import type { AstroComponentFactory } from 'astro/runtime/server/index.js';
import type { Article, Author, Category, ResolvedImage } from './content';

export interface StoryPageProps {
  article: Article;
  /** The rendered story body. */
  Content: AstroComponentFactory;
  category: Category;
  /** Parent section, when the story's section is a sub-section (e.g. States → Uttar Pradesh). */
  parentCategory?: Category;
  author?: Author;
  cover?: ResolvedImage;
  videoId?: string;
  pageUrl: string;
  /** CSS aspect-ratio for the cover photo. */
  ratio: string;
  related: Article[];
  shareImage?: string;
  minutes: number;
}

export interface ListPageProps {
  mode: 'category' | 'latest' | 'tag' | 'author';
  title: string;
  eyebrow?: string;
  description?: string;
  color?: string;
  stories: Article[];
  page?: Page<Article>;
  author?: Author;
  subcategories?: Category[];
}
