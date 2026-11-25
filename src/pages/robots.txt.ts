import type { APIContext } from 'astro';

export function GET(context: APIContext) {
  const site = context.site ?? new URL('https://bramantiarquitectos.com');
  // En staging no se indexa igual: el build agrega X-Robots-Tag: noindex a todas las respuestas.
  const cuerpo = ['User-agent: *', 'Allow: /', 'Disallow: /api/', 'Disallow: /gracias/', 'Disallow: /en/thank-you/', '', `Sitemap: ${new URL('sitemap-index.xml', site).href}`, ''].join('\n');
  return new Response(cuerpo, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
