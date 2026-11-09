import type { APIRoute } from 'astro';
import { englishDocs, summary, urlOf } from '../lib/llms';

export const GET: APIRoute = async ({ site }) => {
  const docs = await englishDocs();
  const lines = docs.map(
    (d) =>
      `- [${d.data.title}](${urlOf(site, d.id)})${d.data.description ? `: ${d.data.description}` : ''}`,
  );
  const body = `# ArtisanForm\n\n> ${summary}\n\n## Docs\n\n${lines.join('\n')}\n\n## Optional\n\n- [Full documentation as one text file](${new URL('/llms-full.txt', site).href})\n- [Source code](https://github.com/mastoreto/artisanForm)\n`;
  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8' },
  });
};
