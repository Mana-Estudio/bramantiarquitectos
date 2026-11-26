import { defineCollection } from 'astro:content';
import { glob, file } from 'astro/loaders';
import { z } from 'astro/zod';

const TIPOS = ['reforma-integral', 'interiorismo', 'obra-nueva'] as const;

/** Proyectos (portfolio). Español en src/content/proyectos/*.md. */
const proyectos = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/proyectos' }),
  schema: ({ image }) =>
    z.object({
      nombre: z.string(),
      subtitulo: z.string().optional(),
      descripcion: z.string().max(160),
      resumen: z.string(),
      zona: z.string(),
      tipos: z.array(z.enum(TIPOS)).min(1),
      tipoTexto: z.string(),
      anio: z.number().int().optional(),
      superficie: z.string().optional(),
      duracion: z.string().optional(),
      fotografo: z.string().optional(),
      alcance: z.string().optional(),
      estado: z.enum(['obra terminada', 'render']).default('obra terminada'),
      enVenta: z.boolean().optional(),
      destacado: z.boolean().default(false),
      orden: z.number(),
      portada: image(),
      portadaAlt: z.string(),
      galeria: z.array(z.object({ src: image(), alt: z.string(), estancia: z.string().default('detalle') })).default([]),
      antes: z.array(z.object({ src: image(), alt: z.string(), estancia: z.string().default('detalle') })).default([]),
      comparaciones: z
        .array(
          z.object({
            antes: image(),
            antesAlt: z.string(),
            despues: image(),
            despuesAlt: z.string(),
            estancia: z.string().default('detalle'),
          }),
        )
        .default([]),
      wpId: z.number().optional(),
    }),
});

/** Traducción al inglés de cada proyecto (mismo slug). Solo textos: las fotos y datos salen del español. */
const proyectosEn = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/proyectos/en' }),
  schema: z.object({
    subtitulo: z.string().optional(),
    descripcion: z.string().max(160),
    resumen: z.string(),
    zona: z.string().optional(),
    tipoTexto: z.string(),
    portadaAlt: z.string(),
  }),
});

/** Promociones en venta (separadas del portfolio). Cada una conserva su URL actual. */
const promociones = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/promociones' }),
  schema: ({ image }) =>
    z.object({
      nombre: z.string(),
      url: z.string().regex(/^\/.*\/$/),
      subtitulo: z.string().optional(),
      descripcion: z.string().max(160),
      resumen: z.string(),
      zona: z.string(),
      tipo: z.string(),
      operacion: z.string(),
      estado: z.enum(['obra terminada', 'render']),
      precio: z.string().optional(),
      datos: z
        .object({
          parcela: z.string().optional(),
          superficieUtil: z.string().optional(),
          superficieConstruida: z.string().optional(),
          terraza: z.string().optional(),
          habitaciones: z.number().optional(),
          banos: z.number().optional(),
        })
        .default({}),
      orden: z.number(),
      portada: image(),
      portadaAlt: z.string(),
      galeria: z.array(z.object({ src: image(), alt: z.string(), estancia: z.string().default('detalle') })).default([]),
      wpId: z.number().optional(),
    }),
});

/** Servicios (texto propio, ES y EN): src/content/servicios/{es,en}/<servicio>.md */
const servicios = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/servicios' }),
  schema: ({ image }) =>
    z.object({
      servicio: z.enum(TIPOS),
      idioma: z.enum(['es', 'en']),
      orden: z.number(),
      nombre: z.string(),
      titulo: z.string(),
      seoTitle: z.string().max(60),
      descripcion: z.string().max(155),
      intro: z.string(),
      resumen: z.string(),
      imagen: image(),
      imagenAlt: z.string(),
      incluye: z.array(z.object({ titulo: z.string(), texto: z.string() })),
      proceso: z.array(z.object({ titulo: z.string(), texto: z.string() })),
      faqAmbito: z.string().optional(),
    }),
});

/** Journal (blog migrado). Los posts viven en la raíz: /<slug>/ */
const journal = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/journal' }),
  schema: ({ image }) =>
    z.object({
      title: z.string(),
      seoTitle: z.string().max(60).optional(),
      description: z.string().max(160),
      date: z.coerce.date(),
      updated: z.coerce.date().optional(),
      categoria: z.enum(['arquitectura', 'construccion', 'interiorismo']),
      categorias: z.array(z.string()).default([]),
      cover: image().optional(),
      coverAlt: z.string().optional(),
      wpId: z.number().optional(),
    }),
});

const faqs = defineCollection({
  loader: file('./src/content/faqs.json'),
  schema: z.object({
    pregunta: z.string(),
    respuestaHtml: z.string(),
    respuesta: z.string(),
    ambitos: z.array(z.string()),
    orden: z.number(),
  }),
});

const resenas = defineCollection({
  loader: file('./src/content/resenas.json'),
  schema: z.object({
    nombre: z.string(),
    texto: z.string(),
    fecha: z.string().optional(),
    fuente: z.string(),
    estrellas: z.number().min(1).max(5),
    url: z.url().nullable(),
  }),
});

const legales = defineCollection({
  loader: glob({ pattern: '*.md', base: './src/content/legales' }),
  schema: z.object({
    title: z.string(),
    description: z.string().optional(),
    updated: z.coerce.date().optional(),
    wpId: z.number().optional(),
  }),
});

/**
 * Videos. Los de YouTube se muestran con una portada propia y solo cargan el reproductor
 * (youtube-nocookie) al pulsar. Los archivos propios van en public/videos/.
 * Cada video se relaciona con un proyecto, una promoción, un artículo, servicios o páginas.
 */
const videos = defineCollection({
  loader: file('./src/content/videos.json'),
  schema: ({ image }) =>
    z
      .object({
        youtube: z.string().regex(/^[\w-]{11}$/).optional(),
        archivo: z.string().regex(/^\/videos\/.+\.mp4$/).optional(),
        titulo: z.string(),
        tituloEn: z.string(),
        descripcion: z.string().optional(),
        descripcionEn: z.string().optional(),
        autor: z.string().optional(),
        poster: image(),
        posterAlt: z.string(),
        posterAltEn: z.string(),
        formato: z.enum(['horizontal', 'vertical']),
        duracion: z.string().optional(),
        proyecto: z.string().optional(),
        promocion: z.string().optional(),
        articulo: z.string().optional(),
        servicios: z.array(z.enum(TIPOS)).default([]),
        paginas: z.array(z.string()).default([]),
        testimonio: z.boolean().default(false),
        /** Clip propio sin sonido: se reproduce solo, en bucle, mientras está a la vista. */
        previa: z.boolean().default(false),
        render: z.boolean().default(false),
        destacado: z.boolean().default(false),
        orden: z.number(),
      })
      .refine((v) => Boolean(v.youtube) !== Boolean(v.archivo), { message: 'Cada video lleva youtube o archivo (uno solo)' }),
});

export const collections = { proyectos, proyectosEn, promociones, servicios, journal, faqs, resenas, legales, videos };
