#!/usr/bin/env node
/**
 * Comprueba que ninguna URL de la web actual se pierde con la migración.
 * Lee https://bramantiarquitectos.com/sitemap_index.xml (y sus sitemaps) y, para cada URL,
 * exige que exista en dist/ o que tenga un 301 en public/_redirects.
 *
 *   npm run build && node scripts/verificar-urls.mjs
 *   node scripts/verificar-urls.mjs --sitemap=https://otro-dominio/sitemap_index.xml
 */
import { existsSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const DIST = path.join(RAIZ, 'dist');
const SITEMAP = process.argv.find((a) => a.startsWith('--sitemap='))?.split('=')[1] ?? 'https://bramantiarquitectos.com/sitemap_index.xml';
const UA = 'Mozilla/5.0 (compatible; verificador-urls/1.0)';

async function xml(url) {
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} al leer ${url}`);
  return res.text();
}

const locs = (texto) => [...texto.matchAll(/<loc>\s*([^<\s]+)\s*<\/loc>/g)].map((m) => m[1].replace(/&amp;/g, '&'));

function reglasRedirect() {
  const archivo = path.join(RAIZ, 'public', '_redirects');
  if (!existsSync(archivo)) return [];
  return readFileSync(archivo, 'utf8')
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'))
    .map((l) => {
      const [origen, destino, codigo] = l.split(/\s+/);
      return { origen, destino, codigo: Number(codigo ?? 302) };
    });
}

function coincide(origen, ruta) {
  if (origen.endsWith('*')) return ruta.startsWith(origen.slice(0, -1));
  return origen === ruta;
}

function existeEnDist(ruta) {
  const limpia = decodeURIComponent(ruta).replace(/^\/+/, '');
  if (limpia === '') return existsSync(path.join(DIST, 'index.html'));
  if (/\.\w+$/.test(limpia)) return existsSync(path.join(DIST, limpia));
  return existsSync(path.join(DIST, limpia, 'index.html')) || existsSync(path.join(DIST, `${limpia.replace(/\/$/, '')}.html`));
}

async function main() {
  if (!existsSync(DIST)) {
    console.error('No existe dist/. Corré primero: npm run build');
    process.exit(1);
  }
  console.log(`Leyendo ${SITEMAP}`);
  const indice = await xml(SITEMAP);
  let sitemaps = locs(indice).filter((u) => u.endsWith('.xml'));
  if (sitemaps.length === 0) sitemaps = [SITEMAP];
  const urls = new Set();
  for (const s of sitemaps) {
    const lista = s === SITEMAP ? locs(indice) : locs(await xml(s));
    for (const u of lista) if (!/\/wp-content\//.test(u) && !u.endsWith('.xml')) urls.add(u);
  }

  const reglas = reglasRedirect();
  const resultados = { ok: [], redirect: [], faltan: [] };
  for (const u of [...urls].sort()) {
    const ruta = new URL(u).pathname;
    if (existeEnDist(ruta)) {
      resultados.ok.push(ruta);
      continue;
    }
    const regla = reglas.find((r) => coincide(r.origen, ruta));
    if (regla && regla.codigo === 301) {
      const destinoOk = existeEnDist(new URL(regla.destino, 'https://x').pathname);
      resultados.redirect.push(`${ruta} → ${regla.destino}${destinoOk ? '' : '  ⚠ el destino no existe en dist/'}`);
      if (!destinoOk) resultados.faltan.push(`${ruta} (301 a un destino inexistente: ${regla.destino})`);
      continue;
    }
    resultados.faltan.push(ruta);
  }

  console.log(`\n${urls.size} URLs en el sitemap actual`);
  console.log(`  ✔ ${resultados.ok.length} existen en dist/`);
  console.log(`  ↪ ${resultados.redirect.length} con 301 en _redirects`);
  for (const r of resultados.redirect) console.log(`      ${r}`);
  if (resultados.faltan.length) {
    console.log(`  ✘ ${resultados.faltan.length} sin página ni 301:`);
    for (const f of resultados.faltan) console.log(`      ${f}`);
    process.exit(1);
  }
  console.log('\nTodo bien: ninguna URL se pierde.');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
