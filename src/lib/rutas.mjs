// Pares de URLs español ↔ inglés. Lo usan las páginas (hreflang y selector de idioma)
// y astro.config.mjs (alternativas en el sitemap). Mantener en .mjs para que la config lo importe.
import { readdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const PARES_FIJOS = {
  '/': '/en/',
  '/nuestras-creaciones/': '/en/projects/',
  '/reformas-integrales-madrid/': '/en/full-renovations-madrid/',
  '/estudio-interiorismo-madrid/': '/en/interior-design-madrid/',
  '/proyectos-obra-nueva-madrid/': '/en/new-build-madrid/',
  '/estudio-arquitectura-madrid/': '/en/studio/',
  '/contacto/': '/en/contact/',
  '/gracias/': '/en/thank-you/',
};

let cacheProyectos;
function slugsProyectosEn() {
  if (!cacheProyectos) {
    try {
      const dir = fileURLToPath(new URL('../content/proyectos/en/', import.meta.url));
      cacheProyectos = readdirSync(dir).filter((f) => f.endsWith('.md')).map((f) => f.replace(/\.md$/, ''));
    } catch {
      cacheProyectos = [];
    }
  }
  return cacheProyectos;
}

/** Devuelve { es, en } para una ruta (en cualquiera de los dos idiomas) o null si no tiene par. */
export function parDe(ruta) {
  for (const [es, en] of Object.entries(PARES_FIJOS)) {
    if (ruta === es || ruta === en) return { es, en };
  }
  const proyecto = ruta.match(/^\/(?:nuestras-creaciones|en\/projects)\/([^/]+)\/$/);
  if (proyecto && slugsProyectosEn().includes(proyecto[1])) {
    return { es: `/nuestras-creaciones/${proyecto[1]}/`, en: `/en/projects/${proyecto[1]}/` };
  }
  return null;
}
