// @ts-check
import { defineConfig, fontProviders } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import { appendFile } from 'node:fs/promises';
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
        await appendFile(new URL('_headers', dir), '\n# Staging (agregado en el build): que Google no indexe la demo\n/*\n  X-Robots-Tag: noindex, nofollow\n');
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
  fonts: [
    {
      provider: fontProviders.npm(),
      name: 'Instrument Serif',
      cssVariable: '--fuente-titulos',
      weights: [400],
      styles: ['normal', 'italic'],
      subsets: ['latin'],
      fallbacks: ['Georgia', 'serif'],
      options: { package: '@fontsource/instrument-serif' },
    },
    {
      provider: fontProviders.npm(),
      name: 'Manrope',
      cssVariable: '--fuente-texto',
      weights: ['200 800'],
      styles: ['normal'],
      subsets: ['latin'],
      fallbacks: ['system-ui', 'sans-serif'],
      options: { package: '@fontsource-variable/manrope' },
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
