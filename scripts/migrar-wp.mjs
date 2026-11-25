#!/usr/bin/env node
/**
 * Migra el contenido de la web actual (WordPress + Elementor) a colecciones de Astro.
 *
 *   node scripts/migrar-wp.mjs            → migra todo (no pisa archivos ya existentes)
 *   node scripts/migrar-wp.mjs --force    → vuelve a escribir los .md/.json (las fotos ya bajadas se reutilizan)
 *   node scripts/migrar-wp.mjs --solo=journal,proyectos,promociones,faqs,resenas,legales,paginas
 *   node scripts/migrar-wp.mjs --fresco   → ignora la caché local de la API
 *
 * Lee siempre el HTML (content.rendered): en el sitio viejo las animaciones de Elementor
 * dejan el innerText vacío. Las fotos se bajan con nombres descriptivos en kebab-case.
 * Las fotos son solo para la demo privada: se reemplazan por los originales del cliente.
 */
import fs from 'node:fs/promises';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import * as cheerio from 'cheerio';
import TurndownService from 'turndown';
import sharp from 'sharp';

const SITE = 'https://bramantiarquitectos.com';
const API = `${SITE}/wp-json/wp/v2`;
const RAIZ = fileURLToPath(new URL('..', import.meta.url));
const CONTENIDO = path.join(RAIZ, 'src', 'content');
const ASSETS = path.join(RAIZ, 'src', 'assets');
const CACHE = path.join(RAIZ, 'node_modules', '.cache', 'migrar-wp');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const FRESCO = args.includes('--fresco');
const SOLO = (args.find((a) => a.startsWith('--solo='))?.split('=')[1] ?? '').split(',').filter(Boolean);
const toca = (parte) => SOLO.length === 0 || SOLO.includes(parte);

const UA = 'Mozilla/5.0 (compatible; migracion-web/1.0)';
const ANCHO_OBJETIVO = 1536; // tamaño mínimo deseado del máster que bajamos

// ---------------------------------------------------------------------------
// Datos verificados (brief del cliente). Lo que no está acá se extrae de la página.
// ---------------------------------------------------------------------------
const PROYECTOS = [
  { slug: 'casa-elara-reforma-barrio-salamanca', nombre: 'Casa Elara', corto: 'casa-elara', portada: 'casa-elara-cocina-01', zona: 'Barrio de Salamanca', tipos: ['reforma-integral'], tipoTexto: 'Reforma integral', superficie: '138 m²', destacado: true },
  { slug: 'casa-felipe-ii-reforma-integral-retiro-madrid', nombre: 'Casa Felipe II', corto: 'casa-felipe-ii', portada: 'casa-felipe-ii-salon-01', zona: 'Retiro', tipos: ['reforma-integral', 'interiorismo'], tipoTexto: 'Reforma integral e interiorismo', superficie: '+140 m²', anio: 2022, destacado: true, emparejarEnOrden: true },
  { slug: 'casa-santos-dumont-reforma-integral-madrid', nombre: 'Casa Santos Dumont', corto: 'casa-santos-dumont', portada: 'casa-santos-dumont-salon-02', zona: 'Madrid Río', tipos: ['reforma-integral', 'interiorismo'], tipoTexto: 'Reforma integral e interiorismo', superficie: '87 m²', destacado: true },
  { slug: 'casa-werlyb-reforma-integral-madrid', nombre: 'Casa Werlyb', corto: 'casa-werlyb', portada: 'casa-werlyb-cocina-03', zona: 'Madrid', tipos: ['reforma-integral', 'interiorismo'], tipoTexto: 'Reforma integral e interiorismo', destacado: true },
  { slug: 'casa-odonnell-reforma-integral-madrid', nombre: 'Casa O’Donnell', corto: 'casa-odonnell', portada: 'casa-odonnell-salon-01', zona: 'Barrio de Salamanca', tipos: ['reforma-integral'], tipoTexto: 'Reforma integral', destacado: true },
  { slug: 'casa-goya-reforma-integral-salamanca-madrid', nombre: 'Casa Goya', corto: 'casa-goya', portada: 'casa-goya-cocina-01', zona: 'Barrio de Salamanca', tipos: ['reforma-integral'], tipoTexto: 'Reforma integral', destacado: true },
  { slug: 'casa-arteaga-reforma-integral-madrid', nombre: 'Casa Arteaga', corto: 'casa-arteaga', portada: 'casa-arteaga-detalle-02', zona: 'Esteban de Arteaga', tipos: ['reforma-integral'], tipoTexto: 'Reforma integral' },
  { slug: 'casa-alarcon-reforma-integral-pozuelo', nombre: 'Casa Alarcón', corto: 'casa-alarcon', portada: 'casa-alarcon-salon-01', zona: 'Pozuelo de Alarcón', tipos: ['reforma-integral', 'interiorismo'], tipoTexto: 'Reforma integral e interiorismo' },
  { slug: 'casa-panes-reforma-integral-madrid', nombre: 'Casa María Panés', corto: 'casa-maria-panes', portada: 'casa-maria-panes-salon-01', zona: 'Centro de Madrid', tipos: ['reforma-integral', 'interiorismo'], tipoTexto: 'Reforma integral e interiorismo' },
  { slug: 'casa-joaquin-lopez-reforma-integral-madrid', nombre: 'Casa Joaquín López', corto: 'casa-joaquin-lopez', portada: 'casa-joaquin-lopez-cocina-01', zona: 'Madrid', tipos: ['reforma-integral', 'interiorismo'], tipoTexto: 'Reforma integral e interiorismo' },
];

const PROMOCIONES = [
  { slug: 'casa-silva', wpSlug: 'casa-silva-reforma-integral-madrid', url: '/nuestras-creaciones/casa-silva-reforma-integral-madrid/', nombre: 'Casa Silva', corto: 'casa-silva', portada: 'casa-silva-cocina-01', zona: 'Barrio de Salamanca', tipo: 'Vivienda reformada en venta', operacion: 'Apartamento en venta', estado: 'obra terminada', datos: { superficieConstruida: '90 m²', terraza: '28 m²' } },
  { slug: 'los-satelites', wpSlug: 'ventapromocionlossatelites', url: '/ventapromocionlossatelites/', nombre: 'Los Satélites', corto: 'los-satelites', portada: 'los-satelites-salon-01', zona: 'Majadahonda', tipo: 'Obra nueva · vivienda unifamiliar', operacion: 'Promoción en venta', estado: 'render', datos: {} },
  { slug: 'proyecto-omega', wpSlug: 'venta-proyecto-omega', url: '/venta-proyecto-omega/', nombre: 'Proyecto Omega', corto: 'proyecto-omega', portada: 'proyecto-omega-terraza-01', zona: 'Majadahonda (Los Satélites)', tipo: 'Obra nueva · vivienda unifamiliar', operacion: 'Venta de proyecto', estado: 'render', datos: {} },
];

const LEGALES = ['aviso-legal', 'politica-de-privacidad', 'politica-de-cookies', 'terminos-y-condiciones'];

// Imágenes sueltas de páginas institucionales (home, estudio, servicios).
const IMAGENES_PAGINAS = [
  // Hero de la home: Casa Felipe II, salón (en el tamaño más grande disponible hasta ~2560 px).
  { pagina: 'casa-felipe-ii-reforma-integral-retiro-madrid', archivo: 'FELIPE-II-JAVIER-BRAVO-4.', nombre: 'hero-casa-felipe-ii-salon', ancho: 2048 },
  { pagina: 'estudio-de-arquitectura-en-madrid', archivo: 'f6240231ebbb6b4b9f8c4312aa81c545', nombre: 'estudio-vision-integral' },
  { pagina: 'estudio-arquitectura-madrid', archivo: 'eef8164981c4f53e7f485c00cc236354', nombre: 'proceso-inmersion' },
  { pagina: 'estudio-arquitectura-madrid', archivo: '0430eb84a42b7766894e5929b5d8bf7c', nombre: 'proceso-abstraccion' },
  { pagina: 'estudio-arquitectura-madrid', archivo: '7177c2c78fbdb1d67eb95ac41feb3096', nombre: 'proceso-materializacion' },
  { pagina: 'reformas-integrales-madrid', archivo: 'Monteprincipe_18', nombre: 'reformas-integrales-cocina' },
  { pagina: 'reformas-integrales-madrid', archivo: '20231106_103826664_iOS', nombre: 'reformas-integrales-obra' },
  { pagina: 'estudio-interiorismo-madrid', archivo: 'Imagen_Corporativa_Nosotros', nombre: 'interiorismo-estudio' },
  { pagina: 'estudio-interiorismo-madrid', archivo: 'arch-draft2', nombre: 'interiorismo-boceto' },
  { pagina: 'proyectos-obra-nueva-madrid', archivo: 'Monteprincipe_1-min', nombre: 'obra-nueva-vivienda' },
  { pagina: 'proyectos-obra-nueva-madrid', archivo: 'los-satelites-obranueva1', nombre: 'obra-nueva-los-satelites' },
];

const LOGOS = [
  { archivo: 'Group-11115.png', nombre: 'logo-blanco' },
  { archivo: 'Group-11116.png', nombre: 'logo-negro' },
];

// Estancias para nombrar fotos y generar alt en inglés.
const ESTANCIAS = [
  { id: 'plano', re: /plano|planimetr|planta (baja|primera|s[oó]tano)|cubierta/i, es: 'plano', en: 'floor plan' },
  { id: 'fachada', re: /fachada|edificio/i, es: 'fachada', en: 'façade' },
  { id: 'cocina', re: /cocina|kitchen/i, es: 'cocina', en: 'kitchen' },
  { id: 'bano', re: /ba[ñn]o|aseo|bano/i, es: 'baño', en: 'bathroom' },
  { id: 'dormitorio', re: /dormitorio|habitaci[oó]n|suite/i, es: 'dormitorio', en: 'bedroom' },
  { id: 'comedor', re: /comedor/i, es: 'comedor', en: 'dining room' },
  { id: 'salon', re: /sal[oó]n|estar|salon/i, es: 'salón', en: 'living room' },
  { id: 'almacenaje', re: /armario|vestidor|almacen/i, es: 'almacenaje', en: 'storage' },
  { id: 'pasillo', re: /pasillo|recibidor|entrada|distribuidor/i, es: 'pasillo', en: 'hallway' },
  { id: 'terraza', re: /terraza|exterior|jard[ií]n|patio|piscina/i, es: 'terraza', en: 'terrace' },
  { id: 'despacho', re: /despacho|setup|escritorio|grabaci/i, es: 'zona de trabajo', en: 'workspace' },
];

// ---------------------------------------------------------------------------
// Utilidades
// ---------------------------------------------------------------------------
const log = (...m) => console.log('·', ...m);
const avisos = [];
const aviso = (m) => { avisos.push(m); console.warn('⚠', m); };

function slugify(s) {
  return s.normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase()
    .replace(/[’']/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '');
}

function decode(s = '') {
  return cheerio.load(`<p>${s}</p>`)('p').text();
}

/** Saca toda mención a la marca anterior. */
function sinMarcaVieja(s) {
  return s
    .replace(/https?:\/\/(www\.)?atmospherearquitectos\.com\/?/gi, '/')
    .replace(/atmosphere\s+arquitectos/gi, 'Bramanti Arquitectos')
    .replace(/atmospherearquitectos/gi, 'bramantiarquitectos')
    .replace(/atmosphere/gi, 'Bramanti');
}

function limpiarTexto(s) {
  return sinMarcaVieja(s.replace(/ /g, ' ').replace(/[​-‍﻿]/g, '').replace(/[ \t]+/g, ' ').trim());
}

/** Recorta en límite de frase/palabra sin romper el sentido. */
function recortar(s, max) {
  s = s.replace(/\s+/g, ' ').trim();
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  const fin = Math.max(corte.lastIndexOf('. '), corte.lastIndexOf('? '), corte.lastIndexOf('! '));
  if (fin > max * 0.55) return corte.slice(0, fin + 1);
  return corte.slice(0, corte.lastIndexOf(' ', max - 1)).replace(/[,;:\s]+$/, '') + '…';
}

function tituloSeo(titulo) {
  const t = titulo.replace(/\s+[-–|·]\s+Bramanti Arquitectos$/i, '').trim();
  if (t.length <= 60) return t;
  const antesDosPuntos = t.split(/:\s/)[0];
  if (antesDosPuntos.length >= 20 && antesDosPuntos.length <= 60) return antesDosPuntos;
  return recortar(t, 59).replace(/…$/, '');
}

// YAML mínimo y predecible (las cadenas van entre comillas dobles, que YAML acepta igual que JSON).
function yaml(valor, sangria = 0) {
  const pad = ' '.repeat(sangria);
  if (Array.isArray(valor)) {
    if (valor.length === 0) return ' []';
    return '\n' + valor.map((v) => {
      if (v && typeof v === 'object' && !Array.isArray(v)) {
        const lineas = Object.entries(v).filter(([, x]) => x !== undefined && x !== null);
        return lineas.map(([k, x], i) => `${pad}${i === 0 ? '- ' : '  '}${k}:${yaml(x, sangria + 4)}`).join('\n');
      }
      return `${pad}-${yaml(v, sangria + 2)}`;
    }).join('\n');
  }
  if (valor && typeof valor === 'object' && !(valor instanceof Date)) {
    const lineas = Object.entries(valor).filter(([, x]) => x !== undefined && x !== null);
    if (lineas.length === 0) return ' {}';
    return '\n' + lineas.map(([k, x]) => `${pad}${k}:${yaml(x, sangria + 2)}`).join('\n');
  }
  if (typeof valor === 'string') return ' ' + JSON.stringify(valor);
  return ' ' + String(valor);
}

function frontmatter(datos) {
  const lineas = Object.entries(datos).filter(([, v]) => v !== undefined && v !== null)
    .map(([k, v]) => `${k}:${yaml(v, 2)}`);
  return `---\n${lineas.join('\n')}\n---\n`;
}

async function escribir(archivo, contenido) {
  if (existsSync(archivo) && !FORCE) { log('existe, no se pisa:', path.relative(RAIZ, archivo)); return false; }
  await fs.mkdir(path.dirname(archivo), { recursive: true });
  await fs.writeFile(archivo, contenido, 'utf8');
  log('escrito', path.relative(RAIZ, archivo));
  return true;
}

async function cacheado(url) {
  const clave = path.join(CACHE, slugify(url.replace(API, '')).slice(0, 180) + '.json');
  if (!FRESCO && existsSync(clave)) return JSON.parse(await fs.readFile(clave, 'utf8'));
  const res = await fetch(url, { headers: { 'User-Agent': UA } });
  if (!res.ok) throw new Error(`${res.status} en ${url}`);
  const datos = { cuerpo: await res.json(), paginas: Number(res.headers.get('x-wp-totalpages') || 1) };
  await fs.mkdir(CACHE, { recursive: true });
  await fs.writeFile(clave, JSON.stringify(datos));
  return datos;
}

async function todo(endpoint, query = '') {
  const items = [];
  for (let pagina = 1; ; pagina++) {
    const { cuerpo, paginas } = await cacheado(`${API}/${endpoint}?per_page=100&page=${pagina}${query}`);
    items.push(...cuerpo);
    if (pagina >= paginas) break;
  }
  return items;
}

// ---------------------------------------------------------------------------
// Medios
// ---------------------------------------------------------------------------
let medios = new Map(); // id → media
let porUrl = new Map(); // url (cualquier tamaño) → id

function indexarMedios(lista) {
  medios = new Map(lista.map((m) => [m.id, m]));
  porUrl = new Map();
  for (const m of lista) {
    const urls = [m.source_url, ...Object.values(m.media_details?.sizes ?? {}).map((s) => s.source_url)];
    for (const u of urls) if (u) porUrl.set(normalizarUrl(u), m.id);
  }
}

function normalizarUrl(u) {
  try { const x = new URL(u, SITE); return (x.origin + x.pathname).replace(/^http:/, 'https:'); } catch { return u; }
}

function idDeImagen($, img) {
  const clase = $(img).attr('class') ?? '';
  const m = clase.match(/wp-image-(\d+)/);
  if (m && medios.has(Number(m[1]))) return Number(m[1]);
  const candidatas = [$(img).attr('src'), $(img).attr('data-src'), ...($(img).attr('srcset') ?? '').split(',').map((s) => s.trim().split(' ')[0])];
  for (const c of candidatas) {
    if (!c) continue;
    const id = porUrl.get(normalizarUrl(c));
    if (id) return id;
    // Variante -WxH que no figura en la API: probamos con el original.
    const original = normalizarUrl(c).replace(/-\d+x\d+(?=\.\w+$)/, '').replace(/-scaled(?=\.\w+$)/, '');
    const id2 = porUrl.get(original) ?? porUrl.get(original.replace(/(\.\w+)$/, '-scaled$1'));
    if (id2) return id2;
  }
  return null;
}

function elegirTamano(m, anchoMinimo = ANCHO_OBJETIVO) {
  const tamanos = Object.entries(m.media_details?.sizes ?? {})
    .map(([nombre, s]) => ({ nombre, ancho: s.width, alto: s.height, url: s.source_url }))
    .filter((s) => s.url && !/architecturer|et-pb|inspiro|site_icon|elementor_custom/.test(s.nombre));
  if (m.media_details?.width) tamanos.push({ nombre: 'full', ancho: m.media_details.width, alto: m.media_details.height, url: m.source_url });
  const grandes = tamanos.filter((s) => s.ancho >= anchoMinimo || s.alto >= anchoMinimo).sort((a, b) => a.ancho - b.ancho);
  if (grandes.length) return grandes[0];
  return tamanos.sort((a, b) => b.ancho - a.ancho)[0] ?? { url: m.source_url, ancho: 0, alto: 0 };
}

const descargados = new Map(); // destino → promesa
async function bajarMedio(id, carpeta, nombreBase, anchoMinimo = ANCHO_OBJETIVO) {
  const m = medios.get(id);
  if (!m) return null;
  const t = elegirTamano(m, anchoMinimo);
  const ext = (path.extname(new URL(t.url).pathname) || '.jpg').toLowerCase().replace('.jpeg', '.jpg');
  const destino = path.join(ASSETS, carpeta, `${nombreBase}${ext}`);
  if (!descargados.has(destino)) {
    descargados.set(destino, (async () => {
      if (existsSync(destino)) return;
      await fs.mkdir(path.dirname(destino), { recursive: true });
      const res = await fetch(t.url, { headers: { 'User-Agent': UA } });
      if (!res.ok) throw new Error(`${res.status} al bajar ${t.url}`);
      await fs.writeFile(destino, Buffer.from(await res.arrayBuffer()));
      log('foto', path.relative(RAIZ, destino), `${t.ancho}×${t.alto}`);
    })());
  }
  await descargados.get(destino);
  let { ancho, alto } = t;
  try { const meta = await sharp(destino).metadata(); ancho = meta.width; alto = meta.height; } catch { /* usamos lo de la API */ }
  return { destino, ancho, alto };
}

function rutaRelativa(desdeArchivo, destino) {
  return path.relative(path.dirname(desdeArchivo), destino).split(path.sep).join('/');
}

function detectarEstancia(...textos) {
  const t = textos.filter(Boolean).join(' ');
  return ESTANCIAS.find((e) => e.re.test(t)) ?? null;
}

function limpiarAlt(alt) {
  return limpiarTexto(alt ?? '')
    .replace(/\s*[-–]\s*Bramanti Arquitectos\s*$/i, '')
    .replace(/\bdespues\b/gi, 'después').replace(/\bsalon\b/gi, 'salón').replace(/\bAlcala\b/g, 'Alcalá')
    .replace(/\s+,/g, ',').replace(/\s{2,}/g, ' ').trim();
}

// ---------------------------------------------------------------------------
// HTML → Markdown
// ---------------------------------------------------------------------------
const td = new TurndownService({ headingStyle: 'atx', bulletListMarker: '-', emDelimiter: '*', strongDelimiter: '**' });
td.remove(['script', 'style', 'iframe', 'noscript', 'svg', 'form', 'button', 'input']);
td.addRule('listas', {
  filter: 'li',
  replacement: (contenido, nodo) => {
    const padre = nodo.parentNode;
    const texto = contenido.replace(/\s*\n\s*/g, ' ').replace(/\s+$/, '').trim();
    if (!texto) return '';
    if (padre && padre.nodeName === 'OL') {
      const indice = Array.prototype.indexOf.call(padre.children, nodo) + 1;
      return `${indice}. ${texto}\n`;
    }
    return `- ${texto}\n`;
  },
});
td.addRule('enlaces', {
  filter: 'a',
  replacement: (contenido, nodo) => {
    const href = reescribirEnlace(nodo.getAttribute('href') ?? '');
    const texto = contenido.trim();
    if (!texto) return '';
    if (!href) return texto;
    return `[${texto}](${href})`;
  },
});

function reescribirEnlace(href) {
  if (!href || href.startsWith('#') || href.startsWith('javascript')) return '';
  if (/wp-content\/uploads/.test(href)) return '';
  if (/google\.com\/search\?q=/.test(href)) return '';
  let h = sinMarcaVieja(href.trim());
  try {
    const u = new URL(h, SITE);
    if (u.hostname.replace(/^www\./, '') === 'bramantiarquitectos.com') {
      h = u.pathname + (u.hash || '');
      if (!h.endsWith('/') && !/\.\w+$/.test(u.pathname) && !u.hash) h += '/';
      h = h.replace(/-con-bramanti-arquitectos\/$/, '/');
      return h;
    }
    return u.href;
  } catch { return ''; }
}

function htmlAMarkdown(html) {
  const $ = cheerio.load(`<div id="raiz">${html}</div>`);
  const raiz = $('#raiz');
  raiz.find('h1').each((_, el) => { el.tagName = 'h2'; });
  raiz.find('[style]').removeAttr('style');
  raiz.find('br').each((_, el) => { const sig = el.nextSibling; if (!sig || (sig.type === 'text' && !sig.data.trim() && !sig.nextSibling)) $(el).remove(); });
  raiz.find('span').each((_, el) => { $(el).replaceWith($(el).html() ?? ''); });
  raiz.find('p').each((_, el) => { if (!$(el).text().trim() && !$(el).find('img').length) $(el).remove(); });
  let md = td.turndown(raiz.html() ?? '');
  md = md.replace(/ /g, ' ').replace(/[ \t]+\n/g, (m) => (m.startsWith('  ') ? '  \n' : '\n')).replace(/\n{3,}/g, '\n\n').trim();
  return sinMarcaVieja(md);
}

function textoPlano(html) {
  const $ = cheerio.load(`<div id="raiz">${html.replace(/<br\b[^>]*>/gi, ' ').replace(/<\/(p|li|h\d)>/gi, '</$1> ')}</div>`);
  return limpiarTexto($('#raiz').text().replace(/\s+/g, ' '));
}

function htmlBasico(html) {
  // HTML mínimo y seguro para respuestas de FAQ.
  const $ = cheerio.load(`<div id="raiz">${html}</div>`);
  const raiz = $('#raiz');
  raiz.find('script, style, iframe, svg, img').remove();
  raiz.find('*').each((_, el) => {
    const permitido = ['p', 'ul', 'ol', 'li', 'strong', 'em', 'b', 'i', 'a', 'br'];
    if (!permitido.includes(el.tagName)) { $(el).replaceWith($(el).html() ?? ''); return; }
    const href = el.tagName === 'a' ? reescribirEnlace($(el).attr('href') ?? '') : null;
    for (const a of Object.keys(el.attribs ?? {})) $(el).removeAttr(a);
    if (href) $(el).attr('href', href);
  });
  raiz.find('p').each((_, el) => { if (!$(el).text().trim()) $(el).remove(); });
  let out = (raiz.html() ?? '').replace(/ |&nbsp;/g, ' ').replace(/\s{2,}/g, ' ').trim();
  if (!/^<(p|ul|ol)/.test(out)) out = `<p>${out}</p>`;
  return sinMarcaVieja(out);
}

// ---------------------------------------------------------------------------
// Widgets de Elementor
// ---------------------------------------------------------------------------
function widgets($) {
  return $('.elementor-widget').toArray().filter((el) => $(el).parents('.elementor-widget').length === 0).map((el) => {
    const w = $(el);
    const tipo = (w.attr('data-widget_type') ?? '').replace(/\.default$/, '');
    const cont = w.children('.elementor-widget-container').length ? w.children('.elementor-widget-container') : w;
    return { el, w, tipo, cont, texto: limpiarTexto(w.text().replace(/\s+/g, ' ')) };
  });
}

function nivelTitulo(w) {
  const h = w.find('h1, h2, h3, h4, h5, h6').first();
  const n = h.length ? Number(h[0].tagName.slice(1)) : 2;
  return Math.min(Math.max(n, 2), 4);
}

function youtubeDe(w) {
  try {
    const s = JSON.parse(w.attr('data-settings') ?? '{}');
    if (s.video_type === 'youtube' && s.youtube_url) return s.youtube_url.split('?')[0];
  } catch { /* nada */ }
  return null;
}

function faqsDeToggle($, w) {
  const items = [];
  w.find('.elementor-toggle-item, .eael-accordion-list').each((_, it) => {
    const t = $(it).find('.elementor-tab-title, .eael-accordion-tab-title').first();
    const c = $(it).find('.elementor-tab-content, .eael-accordion-content').first();
    const pregunta = limpiarTexto(t.text().replace(/\s+/g, ' '));
    if (pregunta && c.length) items.push({ pregunta, html: c.html() ?? '' });
  });
  return items;
}

// ---------------------------------------------------------------------------
// Journal (posts)
// ---------------------------------------------------------------------------
const CATEGORIAS = { arquitectura: 'arquitectura', construccion: 'construccion', interiorismo: 'interiorismo', 'arte-y-decoracion': 'arquitectura', 'el-papel-del-arquitecto': 'arquitectura', 'inteligencia-espacial': 'arquitectura', 'tendencias-interiorismo': 'interiorismo', uncategorized: 'arquitectura' };

function slugPost(slug) {
  return slug.replace(/-con-atmosphere-arquitectos$/, '');
}

async function migrarJournal(posts, cats) {
  const catPorId = new Map(cats.map((c) => [c.id, c.slug]));
  for (const p of posts) {
    const slug = slugPost(p.slug);
    const archivo = path.join(CONTENIDO, 'journal', `${slug}.md`);
    if (existsSync(archivo) && !FORCE) { log('existe, no se pisa:', path.relative(RAIZ, archivo)); continue; }
    const $ = cheerio.load(p.content.rendered);
    const titulo = limpiarTexto(decode(p.title.rendered));
    const partes = [];
    let nImg = 0;
    let primeraImagen = null;
    for (const { w, tipo, cont, texto } of widgets($)) {
      if (tipo === 'heading') {
        if (!texto || texto === titulo) continue;
        partes.push(`${'#'.repeat(nivelTitulo(w))} ${texto}`);
      } else if (tipo === 'text-editor') {
        for (const img of cont.find('img').toArray()) {
          const id = idDeImagen($, img);
          if (!id) { $(img).remove(); continue; }
          const alt = limpiarAlt($(img).attr('alt')) || `${titulo} (imagen ${nImg + 1})`;
          const foto = await bajarMedio(id, `journal/${slug}`, `${slug.slice(0, 50)}-${String(++nImg).padStart(2, '0')}`);
          if (foto) { $(img).attr('src', rutaRelativa(archivo, foto.destino)).attr('alt', alt); primeraImagen ??= { ...foto, alt }; }
        }
        const md = htmlAMarkdown(cont.html() ?? '');
        if (md) partes.push(md);
      } else if (tipo === 'image') {
        const img = w.find('img').first();
        if (!img.length) continue;
        const id = idDeImagen($, img[0]);
        if (!id) continue;
        const alt = limpiarAlt(img.attr('alt')) || limpiarTexto(w.find('figcaption').text()) || `${titulo} (imagen ${nImg + 1})`;
        const foto = await bajarMedio(id, `journal/${slug}`, `${slug.slice(0, 50)}-${String(++nImg).padStart(2, '0')}`);
        if (!foto) continue;
        primeraImagen ??= { ...foto, alt };
        partes.push(`![${alt.replace(/[[\]]/g, '')}](${rutaRelativa(archivo, foto.destino)})`);
        const pie = limpiarTexto(w.find('figcaption').text());
        if (pie) partes.push(`*${pie}*`);
      } else if (tipo === 'toggle') {
        for (const f of faqsDeToggle($, w)) partes.push(`### ${f.pregunta}`, htmlAMarkdown(f.html));
      } else if (tipo === 'video') {
        const yt = youtubeDe(w);
        if (yt) partes.push(`[Ver el vídeo en YouTube](${yt})`);
      } else if (tipo === 'button') {
        const href = reescribirEnlace(w.find('a').attr('href') ?? '');
        if (href && !/contacto|wa\.me|whatsapp|tel:|mailto:/.test(href) && texto) partes.push(`[${texto}](${href})`);
      }
    }

    let portada = null;
    if (p.featured_media && medios.has(p.featured_media)) {
      const f = await bajarMedio(p.featured_media, `journal/${slug}`, `${slug.slice(0, 50)}-portada`);
      if (f) portada = { ...f, alt: limpiarAlt(medios.get(p.featured_media).alt_text) || titulo };
    }
    portada ??= primeraImagen;

    const categorias = [...new Set(p.categories.map((id) => CATEGORIAS[catPorId.get(id)] ?? 'arquitectura'))];
    const yoast = p.yoast_head_json ?? {};
    const desc = limpiarTexto(decode(yoast.description || yoast.og_description || p.excerpt.rendered.replace(/<[^>]+>/g, ' ')));
    const datos = {
      title: titulo,
      seoTitle: tituloSeo(titulo) !== titulo ? tituloSeo(titulo) : undefined,
      description: recortar(desc || titulo, 155),
      date: p.date.slice(0, 10),
      updated: p.modified.slice(0, 10),
      categoria: categorias[0],
      categorias,
      cover: portada ? rutaRelativa(archivo, portada.destino) : undefined,
      coverAlt: portada ? portada.alt : undefined,
      wpId: p.id,
    };
    const cuerpo = partes.join('\n\n').replace(/\n{3,}/g, '\n\n');
    await escribir(archivo, frontmatter(datos) + '\n' + cuerpo + '\n');
  }
}

// ---------------------------------------------------------------------------
// Proyectos y promociones
// ---------------------------------------------------------------------------
const FIN_CONTENIDO = /^(¿Quieres|¿Buscas|Contacta con nosotros|Suscríbete|Una oportunidad difícil|Tu nuevo hogar en el centro|Solicita más información|DESCUBRE NUESTRA CARTERA|Eleva tu estilo|¡Contáctanos|Nosotros$)/i;
const DATO = /^(AÑO DE OBRA|PROYECTO\s|DURACI[OÓ]N|Dimensiones|Año\s+\d{4}|Proyecto\s+Reforma|MADRID\s*[-–]?\s*\d{4}|REFORMA INTEGRAL( E INTERIORISMO)?$|Reforma integral Proyecto:|Ubicaci[oó]n\s|\+?\d+\s*m²\s+Superficie|Texturas nobles Diseño)/i;

function extraerDatos(textos) {
  const t = textos.join(' | ');
  const datos = {};
  const anio = t.match(/A[ÑN]O DE OBRA\s*(\d{4})/i) ?? t.match(/\bA[ñn]o\s+(\d{4})/) ?? t.match(/MADRID\s*[-–]?\s*(20\d{2})/i);
  if (anio) datos.anio = Number(anio[1]);
  const dur = t.match(/DURACI[OÓ]N(?: DE REFORMA)?\s*(\d+\s*MESES)/i);
  if (dur) datos.duracion = dur[1].toLowerCase();
  const dim = t.match(/Dimensiones\s*(\d+)\s*m²/i);
  if (dim) datos.superficie = `${dim[1]} m²`;
  if (/PROYECTO\s+REFORMA INTEGRAL E INTERIORISMO/i.test(t)) datos.conInteriorismo = true;
  return datos;
}

async function procesarFicha({ pagina, conf, coleccion, archivo }) {
  const $ = cheerio.load(pagina.content.rendered);
  const ws = widgets($);
  const textos = ws.filter((x) => ['text-editor', 'heading', 'icon-box'].includes(x.tipo)).map((x) => x.texto);
  const datos = extraerDatos(textos);
  const precio = textos.map((t) => t.match(/(\d{1,3}(?:\.\d{3}){1,2})\s?€/)).find(Boolean)?.[1];

  const bloques = []; // { titulo, partes: [] }
  let actual = { titulo: null, partes: [] };
  let fase = 'despues';
  let titulo = null;
  let subtitulo = null;
  let resumen = null;
  let enVenta = false;
  const fotos = []; // { id, alt, fase, bloque }
  const videos = [];
  const contadores = {};
  const faqs = [];

  const cerrar = () => { if (actual.titulo || actual.partes.length) bloques.push(actual); };

  for (const [indice, { w, tipo, cont, texto }] of ws.entries()) {
    if (tipo === 'heading' && FIN_CONTENIDO.test(texto)) {
      if (/oportunidad|disponible|nuevo hogar|PROMOCIÓN DISPONIBLE/i.test(texto)) enVenta = true;
      break;
    }
    if (['wpr-nav-menu', 'icon-list', 'button', 'icon', 'spacer', 'divider', 'html', 'shortcode', 'google_maps', 'menu-anchor'].includes(tipo)) continue;
    if (tipo === 'counter') {
      const n = w.find('[data-to-value]').attr('data-to-value');
      const k = texto.toLowerCase();
      if (n) {
        if (/parcela/.test(k)) contadores.parcela = `${n} m²`;
        else if (/[uú]til/.test(k)) contadores.superficieUtil = `${n} m²`;
        else if (/habitaci/.test(k)) contadores.habitaciones = Number(n);
        else if (/ba[ñn]o/.test(k)) contadores.banos = Number(n);
      }
      continue;
    }
    if (tipo === 'video') { const yt = youtubeDe(w); if (yt) videos.push(yt); continue; }
    if (tipo === 'toggle') { faqs.push(...faqsDeToggle($, w)); continue; }
    if (tipo === 'image') {
      if (ws[indice + 1]?.tipo === 'counter') continue; // ícono del contador
      for (const img of w.find('img').toArray()) {
        const src = $(img).attr('src') ?? '';
        if (/Group-1111|logotipo/i.test(src)) continue;
        const id = idDeImagen($, img);
        if (!id) continue;
        const ancho = medios.get(id)?.media_details?.width ?? 0;
        if (ancho && ancho < 300) continue; // íconos sueltos
        const alt = limpiarAlt($(img).attr('alt'));
        let f = fase;
        if (/despu[eé]s/i.test(alt)) f = 'despues';
        else if (/\bantes\b|estado original|estado previo/i.test(alt)) f = 'antes';
        if (!fotos.some((x) => x.id === id)) fotos.push({ id, alt, fase: f, bloque: bloques.length, archivo: medios.get(id)?.source_url ?? '' });
      }
      continue;
    }
    if (DATO.test(texto) && texto.length < 80) continue;
    if (tipo === 'heading' || tipo === 'icon-box') {
      if (!texto) continue;
      if (!titulo) { titulo = texto; continue; }
      if (/^\d{2}$/.test(texto)) continue;
      if (/^El cliente:?$/i.test(texto)) continue;
      if (/^GALER[IÍ]A/i.test(texto)) { cerrar(); actual = { titulo: null, partes: [] }; continue; }
      if (/estado previo|estado original/i.test(texto)) { fase = 'antes'; continue; }
      fase = 'despues';
      if (/^[“"«]/.test(texto)) { actual.partes.push(`> ${texto}`); continue; }
      if (/^TOTAL SUP/i.test(texto)) { actual.partes.push(`**${texto.replace(/^TOTAL SUP\. CONSTRUIDA/i, 'Superficie construida')}**`); continue; }
      cerrar();
      let t = texto.replace(/^La atmósfera$/i, 'El ambiente');
      if (t === t.toUpperCase() && t.length > 3) t = t.charAt(0) + t.slice(1).toLowerCase();
      actual = { titulo: t, partes: [] };
      continue;
    }
    if (tipo === 'text-editor') {
      const md = htmlAMarkdown(cont.html() ?? '');
      if (!md) continue;
      if (!subtitulo && !resumen && bloques.length === 0 && !actual.titulo && texto.length < 90) { subtitulo = texto; continue; }
      if (/^PLANIMETR[IÍ]A/i.test(texto)) { actual.partes.push(`*${texto.charAt(0) + texto.slice(1).toLowerCase()}*`); continue; }
      if (!resumen) resumen = textoPlano(cont.html() ?? '');
      actual.partes.push(md);
    }
  }
  cerrar();

  // Fotos: nombres descriptivos, alt limpio y sin marca vieja.
  const contadoresNombre = {};
  const galeria = [];
  const antes = [];
  for (const f of fotos) {
    const estancia = detectarEstancia(f.alt, f.archivo.split('/').pop());
    const base = `${conf.corto}-${f.fase === 'antes' ? 'antes-' : ''}${estancia?.id ?? 'detalle'}`;
    contadoresNombre[base] = (contadoresNombre[base] ?? 0) + 1;
    const nombre = `${base}-${String(contadoresNombre[base]).padStart(2, '0')}`;
    const foto = await bajarMedio(f.id, `${coleccion}/${conf.corto}`, nombre);
    if (!foto) continue;
    let alt = f.alt;
    if (!alt || alt.length < 12) {
      alt = `${conf.nombre}: ${estancia ? estancia.es : 'detalle'} ${f.fase === 'antes' ? 'antes de la reforma' : (coleccion === 'promociones' ? 'de la vivienda' : 'tras la reforma')}`;
      aviso(`alt generado para ${nombre}`);
    }
    const item = { src: rutaRelativa(archivo, foto.destino), alt, estancia: estancia?.id ?? 'detalle', ancho: foto.ancho, alto: foto.alto, bloque: f.bloque };
    (f.fase === 'antes' ? antes : galeria).push(item);
  }

  return { titulo, subtitulo, resumen, bloques, galeria, antes, videos, datos, precio, enVenta, contadores, faqs };
}

function cuerpoConFotos(bloques, galeria, maxPorBloque = 1) {
  // Intercala la primera foto de cada bloque en el relato; el resto queda para la galería.
  const usadas = new Set();
  const md = bloques.map((b, i) => {
    const partes = [];
    if (b.titulo) partes.push(`## ${b.titulo}`);
    partes.push(...b.partes);
    const fotos = galeria.filter((g) => g.bloque === i && !usadas.has(g.src) && g.estancia !== 'plano').slice(0, maxPorBloque);
    for (const f of fotos) { usadas.add(f.src); partes.push(`![${f.alt.replace(/[[\]]/g, '')}](${f.src})`); }
    return partes.join('\n\n');
  }).filter((b) => b.replace(/^## .*$/m, '').trim()).join('\n\n');
  return { md, usadas };
}

function elegirPortada(galeria, preferida) {
  const elegida = preferida && galeria.find((g) => g.src.includes(`/${preferida}.`));
  if (elegida) return elegida;
  if (preferida) aviso(`no encontré la portada ${preferida}`);
  return galeria.find((g) => g.ancho > g.alto * 1.2 && g.estancia !== 'plano' && g.estancia !== 'fachada')
    ?? galeria.find((g) => g.estancia !== 'plano') ?? galeria[0];
}

function emparejar(antes, galeria, enOrden) {
  const pares = [];
  const usadas = new Set();
  for (const a of antes) {
    let d = galeria.find((g) => g.estancia === a.estancia && a.estancia !== 'detalle' && !usadas.has(g.src));
    if (!d && enOrden) {
      const candidatas = galeria.filter((g) => !usadas.has(g.src) && g.estancia !== 'plano');
      d = candidatas.find((g) => g.ancho > g.alto) ?? candidatas[0];
    }
    if (d) { usadas.add(d.src); pares.push({ antes: a.src, antesAlt: a.alt, despues: d.src, despuesAlt: d.alt, estancia: a.estancia !== 'detalle' ? a.estancia : d.estancia }); }
  }
  return pares;
}

const sinBloque = (g) => { const { bloque, ancho, alto, ...resto } = g; return resto; };

async function migrarProyectos(paginas) {
  for (const [i, conf] of PROYECTOS.entries()) {
    const pagina = paginas.find((p) => p.slug === conf.slug);
    if (!pagina) { aviso(`no encontré la página del proyecto ${conf.slug}`); continue; }
    const archivo = path.join(CONTENIDO, 'proyectos', `${conf.slug}.md`);
    if (existsSync(archivo) && !FORCE) { log('existe, no se pisa:', path.relative(RAIZ, archivo)); continue; }
    const r = await procesarFicha({ pagina, conf, coleccion: 'proyectos', archivo });
    const portada = elegirPortada(r.galeria, conf.portada);
    const { md, usadas } = cuerpoConFotos(r.bloques, r.galeria.filter((g) => g !== portada));
    const tipos = [...conf.tipos];
    if (r.datos.conInteriorismo && !tipos.includes('interiorismo')) tipos.push('interiorismo');
    const yoast = pagina.yoast_head_json ?? {};
    const descripcion = recortar(limpiarTexto(decode(yoast.description || '')) || r.resumen || conf.nombre, 155);
    const datos = {
      nombre: conf.nombre,
      subtitulo: r.subtitulo && r.subtitulo !== conf.nombre ? r.subtitulo : undefined,
      descripcion,
      resumen: recortar(r.resumen ?? descripcion, 220),
      zona: conf.zona,
      tipos,
      tipoTexto: tipos.includes('interiorismo') && !/interiorismo/i.test(conf.tipoTexto) ? 'Reforma integral e interiorismo' : conf.tipoTexto,
      anio: conf.anio ?? r.datos.anio,
      superficie: conf.superficie ?? r.datos.superficie,
      duracion: r.datos.duracion,
      estado: 'obra terminada',
      enVenta: r.enVenta || undefined,
      destacado: conf.destacado ?? false,
      orden: i + 1,
      portada: portada?.src,
      portadaAlt: portada?.alt,
      galeria: r.galeria.filter((g) => g !== portada && !usadas.has(g.src)).map(sinBloque),
      antes: r.antes.map(sinBloque),
      comparaciones: emparejar(r.antes, r.galeria, conf.emparejarEnOrden),
      videos: r.videos,
      wpId: pagina.id,
    };
    if (r.enVenta) aviso(`${conf.nombre}: la página actual la ofrece en venta${r.precio ? ` (${r.precio} €)` : ''}; confirmar si va también en Promociones`);
    await escribir(archivo, frontmatter(datos) + '\n' + md + '\n');
  }
}

async function migrarPromociones(paginas) {
  for (const [i, conf] of PROMOCIONES.entries()) {
    const pagina = paginas.find((p) => p.slug === conf.wpSlug);
    if (!pagina) { aviso(`no encontré la promoción ${conf.wpSlug}`); continue; }
    const archivo = path.join(CONTENIDO, 'promociones', `${conf.slug}.md`);
    if (existsSync(archivo) && !FORCE) { log('existe, no se pisa:', path.relative(RAIZ, archivo)); continue; }
    const r = await procesarFicha({ pagina, conf, coleccion: 'promociones', archivo });
    const portada = elegirPortada(r.galeria, conf.portada);
    const { md, usadas } = cuerpoConFotos(r.bloques, r.galeria.filter((g) => g !== portada));
    const yoast = pagina.yoast_head_json ?? {};
    const descripcion = recortar(limpiarTexto(decode(yoast.description || '')) || r.resumen || conf.nombre, 155);
    const datos = {
      nombre: conf.nombre,
      url: conf.url,
      subtitulo: r.subtitulo && r.subtitulo !== conf.nombre ? r.subtitulo : undefined,
      descripcion,
      resumen: recortar(r.resumen ?? descripcion, 220),
      zona: conf.zona,
      tipo: conf.tipo,
      operacion: conf.operacion,
      estado: conf.estado,
      precio: r.precio ? `${r.precio} €` : undefined,
      datos: { ...r.contadores, ...conf.datos },
      orden: i + 1,
      portada: portada?.src,
      portadaAlt: portada?.alt,
      galeria: r.galeria.filter((g) => g !== portada && !usadas.has(g.src)).map(sinBloque),
      videos: r.videos,
      wpId: pagina.id,
    };
    await escribir(archivo, frontmatter(datos) + '\n' + md + '\n');
  }
}

// ---------------------------------------------------------------------------
// FAQs, reseñas, legales, imágenes de páginas
// ---------------------------------------------------------------------------
const AMBITO_FAQ = { 'estudio-de-arquitectura-en-madrid': 'general', contacto: 'contacto', 'estudio-interiorismo-madrid': 'interiorismo', 'proyectos-obra-nueva-madrid': 'obra-nueva', 'comprar-casa-en-majadahonda': 'promociones' };

async function migrarFaqs(paginas) {
  const archivo = path.join(CONTENIDO, 'faqs.json');
  const lista = [];
  for (const [slug, ambito] of Object.entries(AMBITO_FAQ)) {
    const p = paginas.find((x) => x.slug === slug);
    if (!p) continue;
    const $ = cheerio.load(p.content.rendered);
    for (const { w, tipo } of widgets($)) {
      if (!['toggle', 'eael-adv-accordion', 'accordion', 'nested-accordion'].includes(tipo)) continue;
      for (const f of faqsDeToggle($, w)) {
        const ya = lista.find((x) => x.pregunta.toLowerCase() === f.pregunta.toLowerCase());
        if (ya) { if (!ya.ambitos.includes(ambito)) ya.ambitos.push(ambito); continue; }
        const respuestaHtml = htmlBasico(f.html);
        lista.push({
          id: slugify(f.pregunta).slice(0, 80),
          pregunta: f.pregunta,
          respuestaHtml,
          respuesta: limpiarTexto(cheerio.load(respuestaHtml.replace(/<\/(p|li)>/g, '</$1> ')).text().replace(/\s+/g, ' ')),
          ambitos: [ambito],
          orden: lista.length + 1,
        });
      }
    }
  }
  // Las 12 de la home sirven para reformas integrales.
  for (const f of lista) if (f.ambitos.includes('general')) f.ambitos.push('reformas');
  await escribir(archivo, JSON.stringify(lista, null, 2) + '\n');
  log(`${lista.length} preguntas frecuentes`);
}

async function migrarResenas(paginas) {
  const home = paginas.find((p) => p.id === 5111) ?? paginas.find((p) => p.link === `${SITE}/`);
  const $ = cheerio.load(home.content.rendered);
  const ficha = $('.ti-widget a[href*="google.com/maps"]').first().attr('href') ?? null;
  const lista = $('.ti-review-item').toArray().map((r) => {
    const nombre = limpiarTexto($(r).find('.ti-name').text());
    const texto = limpiarTexto($(r).find('.ti-review-content').text().replace(/\s+/g, ' '));
    const ts = Number($(r).attr('data-time'));
    return {
      id: slugify(nombre),
      nombre,
      texto,
      fecha: ts ? new Date(ts * 1000).toISOString().slice(0, 10) : undefined,
      fuente: 'Google',
      estrellas: $(r).find('.ti-star.f, img.ti-star[src$="/f.svg"]').length || 5,
      url: ficha,
    };
  });
  await escribir(path.join(CONTENIDO, 'resenas.json'), JSON.stringify(lista, null, 2) + '\n');
  log(`${lista.length} reseñas`);
}

async function migrarLegales(paginas) {
  for (const slug of LEGALES) {
    const p = paginas.find((x) => x.slug === slug);
    if (!p) { aviso(`no encontré ${slug}`); continue; }
    const $ = cheerio.load(p.content.rendered);
    const partes = [];
    let titulo = limpiarTexto(decode(p.title.rendered));
    for (const { w, tipo, cont, texto } of widgets($)) {
      if (tipo === 'heading') {
        if (/^(Nosotros|Contacto|Suscríbete)/i.test(texto)) break;
        if (texto.toLowerCase() === titulo.toLowerCase()) continue;
        if (/^(info@|\+34|Calle Alcalá|Madrid 280|Bramanti Arquitectos 20|Nuestras Creaciones|Estudio|Blog|Preguntas Frecuentes|Política de|Aviso Legal)/i.test(texto)) continue;
        partes.push(`${'#'.repeat(nivelTitulo(w))} ${texto}`);
      } else if (tipo === 'text-editor') {
        const md = htmlAMarkdown(cont.html() ?? '');
        if (md) partes.push(md);
      }
    }
    titulo = titulo.replace(/^Política De Cookies$/i, 'Política de cookies');
    await escribir(path.join(CONTENIDO, 'legales', `${slug}.md`), frontmatter({ title: titulo, updated: p.modified.slice(0, 10), wpId: p.id }) + '\n' + partes.join('\n\n') + '\n');
  }
}

async function migrarImagenesPaginas(paginas) {
  for (const img of IMAGENES_PAGINAS) {
    const id = [...medios.values()].find((m) => m.source_url.includes(img.archivo))?.id;
    if (!id) { aviso(`no encontré la imagen ${img.archivo}`); continue; }
    await bajarMedio(id, 'paginas', img.nombre, img.ancho);
  }
  for (const l of LOGOS) {
    const id = [...medios.values()].find((m) => m.source_url.endsWith(l.archivo))?.id;
    if (id) await bajarMedio(id, 'marca', l.nombre);
  }
}

// ---------------------------------------------------------------------------
async function main() {
  console.log(`Migración desde ${SITE}${FORCE ? ' (--force)' : ''}`);
  const [posts, paginas, categorias, listaMedios] = await Promise.all([
    todo('posts', '&context=view'),
    todo('pages', '&context=view'),
    todo('categories'),
    todo('media', '&_fields=id,source_url,alt_text,media_details,mime_type'),
  ]);
  indexarMedios(listaMedios);
  log(`${posts.length} posts · ${paginas.length} páginas · ${listaMedios.length} medios`);

  if (toca('paginas')) await migrarImagenesPaginas(paginas);
  if (toca('proyectos')) await migrarProyectos(paginas);
  if (toca('promociones')) await migrarPromociones(paginas);
  if (toca('faqs')) await migrarFaqs(paginas);
  if (toca('resenas')) await migrarResenas(paginas);
  if (toca('legales')) await migrarLegales(paginas);
  if (toca('journal')) await migrarJournal(posts, categorias);

  if (avisos.length) {
    console.log(`\n${avisos.length} avisos para revisar:`);
    for (const a of [...new Set(avisos)]) console.log('  -', a);
  }
  console.log('\nListo.');
}

main().catch((e) => { console.error(e); process.exit(1); });
