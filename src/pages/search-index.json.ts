import { getCollection } from 'astro:content';

export async function GET() {
  const posts = (await getCollection('blog'))
    .filter(p => !p.data.draft)
    .sort((a, b) => b.data.date.valueOf() - a.data.date.valueOf());

  const index = posts.map(p => ({
    title: p.data.title,
    description: p.data.description,
    slug: p.slug,
    tags: p.data.tags,
    category: p.data.category,
  }));

  return new Response(JSON.stringify(index), {
    headers: { 'Content-Type': 'application/json' },
  });
}
