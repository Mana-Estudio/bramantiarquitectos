import { getCollection, type CollectionEntry } from 'astro:content';

export type Proyecto = CollectionEntry<'proyectos'>;
export type Articulo = CollectionEntry<'journal'>;

export const CATEGORIAS = {
  arquitectura: 'Arquitectura',
  construccion: 'Construcción',
  interiorismo: 'Interiorismo',
} as const;
export type Categoria = keyof typeof CATEGORIAS;

export async function proyectos(): Promise<Proyecto[]> {
  return (await getCollection('proyectos')).sort((a, b) => a.data.orden - b.data.orden);
}

export async function promociones() {
  return (await getCollection('promociones')).sort((a, b) => a.data.orden - b.data.orden);
}

export async function articulos(): Promise<Articulo[]> {
  return (await getCollection('journal')).sort((a, b) => b.data.date.getTime() - a.data.date.getTime());
}

export type VideoDatos = CollectionEntry<'videos'>['data'];

/** Videos filtrados por relación (proyecto, promoción, artículo, servicio, página o destacado). */
export async function videos(filtro: (v: VideoDatos) => boolean = () => true) {
  return (await getCollection('videos')).filter((v) => filtro(v.data)).sort((a, b) => a.data.orden - b.data.orden);
}

export async function faqs(ambito: string) {
  return (await getCollection('faqs')).filter((f) => f.data.ambitos.includes(ambito)).sort((a, b) => a.data.orden - b.data.orden);
}

/** Proyectos relacionados: misma zona pesa más que mismo tipo. */
export function relacionados(actual: Proyecto, todos: Proyecto[], cantidad = 3): Proyecto[] {
  return todos
    .filter((p) => p.id !== actual.id)
    .map((p) => ({
      p,
      puntos: (p.data.zona === actual.data.zona ? 3 : 0) + p.data.tipos.filter((t) => actual.data.tipos.includes(t)).length,
    }))
    .sort((a, b) => b.puntos - a.puntos || a.p.data.orden - b.p.data.orden)
    .slice(0, cantidad)
    .map(({ p }) => p);
}

export function articulosRelacionados(actual: Articulo, todos: Articulo[], cantidad = 3): Articulo[] {
  return todos
    .filter((a) => a.id !== actual.id)
    .map((a) => ({ a, puntos: a.data.categoria === actual.data.categoria ? 1 : 0 }))
    .sort((x, y) => y.puntos - x.puntos || y.a.data.date.getTime() - x.a.data.date.getTime())
    .slice(0, cantidad)
    .map(({ a }) => a);
}

/** Minutos de lectura (200 palabras por minuto). */
export function minutosLectura(texto = ''): number {
  const palabras = texto.replace(/!\[[^\]]*\]\([^)]*\)/g, '').split(/\s+/).filter(Boolean).length;
  return Math.max(1, Math.round(palabras / 200));
}

/** Para listados: quita el sufijo de marca de los títulos largos. */
export function tituloCorto(t: string): string {
  return t.replace(/\s*[-–|]\s*Bramanti Arquitectos$/i, '');
}
