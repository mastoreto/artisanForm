import type { APIRoute } from 'astro';
import { englishDocs, summary, urlOf } from '../lib/llms';

export const GET: APIRoute = async ({ site }) => {
  const docs = await englishDocs();
  const parts = docs.map(
    (d) =>
      `# ${d.data.title}\n\nSource: ${urlOf(site, d.id)}\n\n${d.body ?? ''}`,
  );
  return new Response(
    `# ArtisanForm\n\n> ${summary}\n\n${parts.join('\n\n---\n\n')}\n`,
    {
      headers: { 'Content-Type': 'text/plain; charset=utf-8' },
    },
  );
};
