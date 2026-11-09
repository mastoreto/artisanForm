import type { APIRoute } from 'astro';

// Everything is public, AI crawlers included; the sitemap and llms.txt are advertised.
export const GET: APIRoute = ({ site }) => {
  const origin = (site?.href ?? '').replace(/\/$/, '');
  return new Response(
    [
      'User-agent: *',
      'Allow: /',
      '',
      `Sitemap: ${origin}/sitemap-index.xml`,
      `# LLMs: ${origin}/llms.txt (full text: ${origin}/llms-full.txt)`,
      '',
    ].join('\n'),
    { headers: { 'Content-Type': 'text/plain; charset=utf-8' } },
  );
};
