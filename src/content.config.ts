import { defineCollection } from 'astro:content';
import { glob } from 'astro/loaders';
import { z } from 'astro/zod';

// The admin panel (Sveltia CMS) can write `null` or omit optional fields,
// so optional values accept both and are normalised here.
const optionalText = z.string().nullish().transform((v) => v?.trim() || undefined);
const flag = z.boolean().nullish().transform((v) => !!v);

// Each story is a folder: src/content/articles/<slug>/index.md (+ its images).
const articles = defineCollection({
  loader: glob({
    pattern: '**/index.md',
    base: './src/content/articles',
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    excerpt: optionalText,
    category: z.string(),
    author: optionalText,
    date: z.coerce.date(),
    updated: z.coerce.date().nullish(),
    cover: optionalText,
    cover_alt: optionalText,
    cover_caption: optionalText,
    youtube: optionalText,
    tags: z
      .array(z.string())
      .nullish()
      .transform((v) => (v ?? []).map((t) => t.trim()).filter(Boolean)),
    featured: flag,
    breaking: flag,
    draft: flag,
  }),
});

const categories = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/categories' }),
  schema: z.object({
    name: z.string(),
    description: optionalText,
    color: optionalText,
    order: z.coerce.number().nullish(),
    // Optional parent section, e.g. "Uttar Pradesh" inside "States".
    parent: optionalText,
  }),
});

// Tap-through visual stories (AMP Web Stories), one folder per story with its images.
const webstories = defineCollection({
  loader: glob({
    pattern: '**/index.md',
    base: './src/content/webstories',
    generateId: ({ entry }) => entry.replace(/\/index\.md$/, ''),
  }),
  schema: z.object({
    title: z.string(),
    category: optionalText,
    date: z.coerce.date(),
    cover: optionalText,
    link: optionalText,
    slides: z
      .array(
        z.object({
          image: z.string(),
          heading: optionalText,
          text: optionalText,
          credit: optionalText,
        }),
      )
      .min(1),
    draft: flag,
  }),
});

const authors = defineCollection({
  loader: glob({ pattern: '*.json', base: './src/content/authors' }),
  schema: z.object({
    name: z.string(),
    role: optionalText,
    bio: optionalText,
    avatar: optionalText,
    x: optionalText,
  }),
});

const pages = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/pages' }),
  schema: z.object({
    title: z.string(),
    description: optionalText,
  }),
});

export const collections = { articles, categories, authors, pages, webstories };
