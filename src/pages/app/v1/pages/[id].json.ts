import type { APIRoute, GetStaticPaths } from 'astro';
import { getCollection, type CollectionEntry } from 'astro:content';
import { json } from '../../../../lib/app-feed';

// About, Contact, Privacy… for the app's menu.
export const getStaticPaths = (async () =>
  (await getCollection('pages')).map((entry) => ({ params: { id: entry.id }, props: { entry } }))) satisfies GetStaticPaths;

export const GET: APIRoute = ({ props }) => {
  const entry = props.entry as CollectionEntry<'pages'>;
  return json({ id: entry.id, title: entry.data.title, description: entry.data.description, html: entry.rendered?.html ?? '' });
};
