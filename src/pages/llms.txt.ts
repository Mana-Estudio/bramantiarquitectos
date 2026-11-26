// llms.txt: resumen del estudio y enlaces clave para asistentes de IA (https://llmstxt.org).
import type { APIContext } from 'astro';
import { proyectos, articulos, tituloCorto } from '../lib/contenido';
import { SITIO } from '../lib/sitio';

export async function GET(context: APIContext) {
  const site = context.site ?? new URL(SITIO.url);
  const url = (ruta: string) => new URL(ruta, site).href;
  const lista = await proyectos();
  const posts = (await articulos()).slice(0, 12);
  const md = `# ${SITIO.nombre}

> Estudio de arquitectura, interiorismo y construcción en Madrid (${SITIO.direccion.calle}, ${SITIO.direccion.cp}). Reformas integrales de viviendas, interiorismo y obra nueva unifamiliar (Passivhaus, domótica), con un único equipo de la idea a la entrega. ${SITIO.trayectoria} de trayectoria. Titular: ${SITIO.razonSocial}.

- Contacto: ${SITIO.email} · ${SITIO.telefono} · WhatsApp https://wa.me/${SITIO.whatsapp}
- Zona de trabajo: Madrid (interior de la M-30 y barrios como Salamanca, Retiro, Madrid Río), Pozuelo y Majadahonda.
- Proceso: Inmersión → Abstracción → Materialización → Obra y entrega.

## Servicios
- [Reformas integrales en Madrid](${url('/reformas-integrales-madrid/')}): distribución, instalaciones, materiales e interiorismo en un mismo proyecto.
- [Interiorismo](${url('/estudio-interiorismo-madrid/')}): luz, materia y mobiliario integrados en la arquitectura.
- [Obra nueva](${url('/proyectos-obra-nueva-madrid/')}): viviendas unifamiliares proyectadas y construidas por el mismo equipo.
- [Promociones en venta](${url('/promociones/')}): obra nueva en Los Satélites (Majadahonda).

## Proyectos
${lista.map((p) => `- [${p.data.nombre}](${url(`/nuestras-creaciones/${p.id}/`)}): ${p.data.tipoTexto}, ${p.data.zona}.`).join('\n')}

## Estudio y contacto
- [El estudio](${url('/estudio-arquitectura-madrid/')})
- [Contacto y presupuesto](${url('/contacto/')})
- [English version](${url('/en/')})

## Journal (selección)
${posts.map((a) => `- [${tituloCorto(a.data.title)}](${url(`/${a.id}/`)})`).join('\n')}
`;
  return new Response(md, { headers: { 'Content-Type': 'text/plain; charset=utf-8' } });
}
