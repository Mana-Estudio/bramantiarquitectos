import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { articulos, CATEGORIAS, tituloCorto } from '../lib/contenido';

export async function GET(context: APIContext) {
  const lista = await articulos();
  return rss({
    title: 'Bramanti Arquitectos · Journal',
    description: 'Arquitectura, interiorismo y construcción en Madrid, contadas por el estudio.',
    site: context.site ?? 'https://bramantiarquitectos.com',
    trailingSlash: true,
    customData: '<language>es-ES</language>',
    items: lista.map((a) => ({
      title: tituloCorto(a.data.title),
      description: a.data.description,
      pubDate: a.data.date,
      link: `/${a.id}/`,
      categories: [CATEGORIAS[a.data.categoria]],
    })),
  });
}
