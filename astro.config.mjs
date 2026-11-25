// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { readFile, writeFile } from 'node:fs/promises';
import { parDe } from './src/lib/rutas.mjs';

const SITE = process.env.SITE_URL ?? 'https://bramantiarquitectos.com';
// Por defecto todo build es de staging (noindex). Solo ENTORNO=produccion lo quita.
const PRODUCCION = process.env.ENTORNO === 'produccion';

/** En staging suma X-Robots-Tag: noindex a todas las respuestas estáticas. */
function noindexEnStaging() {
  return {
    name: 'mana:noindex-staging',
    hooks: {
      /** @param {{ dir: URL, logger: import('astro').AstroIntegrationLogger }} opciones */
      'astro:build:done': async ({ dir, logger }) => {
        if (PRODUCCION) {
          logger.info('ENTORNO=produccion: sin noindex');
          return;
        }
        // Va dentro del bloque /* existente: si hubiera dos bloques /*, el segundo pisa al primero.
        const archivo = new URL('_headers', dir);
        const actual = await readFile(archivo, 'utf8').catch(() => '');
        const linea = '  X-Robots-Tag: noindex, nofollow';
        const nuevo = /^\/\*\s*$/m.test(actual)
          ? actual.replace(/^\/\*\s*$/m, `/*\n${linea}`)
          : `${actual}\n/*\n${linea}\n`;
        await writeFile(archivo, nuevo);
        logger.info('staging: X-Robots-Tag noindex agregado a _headers');
      },
    },
  };
}

export default defineConfig({
  site: SITE,
  output: 'static',
  trailingSlash: 'always',
  build: {
    format: 'directory',
    // Todo el CSS en archivos: cacheable y compatible con la CSP.
    inlineStylesheets: 'never',
  },
  compressHTML: true,
  prefetch: { prefetchAll: false, defaultStrategy: 'hover' },
  image: {
    // Sin dominios remotos: todas las imágenes son locales.
    responsiveStyles: false,
  },
  // Fuentes autoalojadas desde los paquetes de Fontsource (nada de Google Fonts remoto, por RGPD).
  // Solo el subconjunto latino: cubre español e inglés y permite precargar exactamente 3 archivos.
  fonts: [
    {
      provider: fontProviders.local(),
      name: 'Instrument Serif',
      cssVariable: '--fuente-titulos',
      fallbacks: ['Georgia', 'serif'],
      options: {
        variants: [
          { src: ['@fontsource/instrument-serif/files/instrument-serif-latin-400-normal.woff2'], weight: '400', style: 'normal' },
          { src: ['@fontsource/instrument-serif/files/instrument-serif-latin-400-italic.woff2'], weight: '400', style: 'italic' },
        ],
      },
    },
    {
      provider: fontProviders.local(),
      name: 'Manrope',
      cssVariable: '--fuente-texto',
      fallbacks: ['Arial', 'sans-serif'],
      options: {
        variants: [{ src: ['@fontsource-variable/manrope/files/manrope-latin-wght-normal.woff2'], weight: '200 800', style: 'normal' }],
      },
    },
  ],
  integrations: [
    sitemap({
      filter: (pagina) => !/\/(gracias|thank-you)\/$/.test(pagina),
      serialize(item) {
        const ruta = new URL(item.url).pathname;
        const par = parDe(ruta);
        if (par) {
          item.links = [
            { url: new URL(par.es, SITE).href, lang: 'es-ES' },
            { url: new URL(par.en, SITE).href, lang: 'en' },
            { url: new URL(par.es, SITE).href, lang: 'x-default' },
          ];
        }
        return item;
      },
    }),
    noindexEnStaging(),
  ],
  vite: {
    build: {
      // Nada de scripts inline: la CSP solo permite 'self'.
      assetsInlineLimit: 0,
    },
  },
});
