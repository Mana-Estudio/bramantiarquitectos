// Worker de Cloudflare: solo atiende /api/* (ver run_worker_first en wrangler.jsonc).
// El resto del sitio lo sirve Cloudflare como archivos estáticos desde ./dist.
import { validarConsulta, resumenConsulta, TIPOS_CONSULTA } from '../src/lib/contacto';
import { enviarMail, aBase64, type Adjunto } from '../src/lib/mail';
import { validarValoracion, resumenValoracion, ARCHIVOS, INTERESES } from '../src/lib/valoracion';

interface Env {
  ASSETS: Fetcher;
  TURNSTILE_SECRET?: string;
  RESEND_API_KEY?: string;
  MAIL_TO?: string;
  MAIL_FROM?: string;
  SITE_URL?: string;
}

const CABECERAS = {
  'X-Content-Type-Options': 'nosniff',
  'Referrer-Policy': 'strict-origin-when-cross-origin',
  'Cache-Control': 'no-store',
};

function json(datos: unknown, status = 200): Response {
  return new Response(JSON.stringify(datos), { status, headers: { 'Content-Type': 'application/json; charset=utf-8', ...CABECERAS } });
}

function redirigir(ruta: string, url: URL): Response {
  return new Response(null, { status: 303, headers: { Location: new URL(ruta, url).href, ...CABECERAS } });
}

async function verificarTurnstile(token: string, secreto: string, ip: string | null): Promise<boolean> {
  const cuerpo = new FormData();
  cuerpo.append('secret', secreto);
  cuerpo.append('response', token);
  if (ip) cuerpo.append('remoteip', ip);
  const res = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', { method: 'POST', body: cuerpo });
  if (!res.ok) return false;
  const datos = (await res.json()) as { success?: boolean };
  return datos.success === true;
}

async function contacto(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const quiereJson = (request.headers.get('Accept') ?? '').includes('application/json');
  const tipoContenido = request.headers.get('Content-Type') ?? '';
  if (!/multipart\/form-data|application\/x-www-form-urlencoded/.test(tipoContenido)) {
    return json({ ok: false, mensaje: 'Formato no admitido.' }, 415);
  }

  // Mismo origen: el formulario solo se envía desde la propia web.
  const origen = request.headers.get('Origin');
  if (origen && new URL(origen).host !== url.host) return json({ ok: false, mensaje: 'Origen no permitido.' }, 403);

  const form = await request.formData();
  const datos = Object.fromEntries([...form.entries()].map(([k, v]) => [k, typeof v === 'string' ? v : '']));
  const idioma = datos.idioma === 'en' ? 'en' : 'es';
  const gracias = idioma === 'en' ? '/en/thank-you/' : '/gracias/';
  const volver = idioma === 'en' ? '/en/contact/' : '/contacto/';
  const fallo = (mensaje: string, codigo: string, status = 400) =>
    quiereJson ? json({ ok: false, mensaje }, status) : redirigir(`${volver}?error=${codigo}#presupuesto`, url);

  // Honeypot: si un bot lo rellena, fingimos éxito y no enviamos nada.
  if (datos.web) return quiereJson ? json({ ok: true, redirigir: gracias }) : redirigir(gracias, url);

  if (!env.TURNSTILE_SECRET) {
    console.error('Falta el secreto TURNSTILE_SECRET');
    return fallo(idioma === 'en' ? 'The form is not configured yet. Please write to us on WhatsApp.' : 'El formulario aún no está configurado. Escríbenos por WhatsApp.', 'config', 500);
  }
  const token = datos['cf-turnstile-response'] ?? '';
  const humano = token ? await verificarTurnstile(token, env.TURNSTILE_SECRET, request.headers.get('CF-Connecting-IP')) : false;
  if (!humano) {
    return fallo(idioma === 'en' ? 'We could not verify the anti-spam check. Please try again.' : 'No pudimos completar la verificación antispam. Vuelve a intentarlo.', 'turnstile', 403);
  }

  const resultado = validarConsulta(datos);
  if (!resultado.ok) {
    return fallo(
      idioma === 'en' ? `Please review these fields: ${resultado.errores.join(', ')}.` : `Revisa estos campos: ${resultado.errores.join(', ')}.`,
      'datos',
    );
  }

  const c = resultado.consulta;
  const envio = await enviarMail(env, {
    asunto: `Nueva consulta web · ${TIPOS_CONSULTA[c.tipo].es} · ${c.nombre}`,
    texto: resumenConsulta(c),
    responderA: c.email,
  });
  if (!envio.ok) {
    console.error(envio.error);
    return fallo(
      idioma === 'en' ? 'We could not send your enquiry. Please write to us at info@bramantiarquitectos.com.' : 'No pudimos enviar tu consulta. Escríbenos a info@bramantiarquitectos.com.',
      'envio',
      502,
    );
  }
  return quiereJson ? json({ ok: true, redirigir: gracias, simulado: envio.simulado ?? false }) : redirigir(gracias, url);
}

/** Presupuestador (/pedir-valoracion/): mismas defensas que el contacto, más adjuntos. */
async function valoracion(request: Request, env: Env): Promise<Response> {
  const url = new URL(request.url);
  const quiereJson = (request.headers.get('Accept') ?? '').includes('application/json');
  const origen = request.headers.get('Origin');
  if (origen && new URL(origen).host !== url.host) return json({ ok: false, mensaje: 'Origen no permitido.' }, 403);
  if (!/multipart\/form-data|application\/x-www-form-urlencoded/.test(request.headers.get('Content-Type') ?? '')) {
    return json({ ok: false, mensaje: 'Formato no admitido.' }, 415);
  }
  const gracias = '/gracias/?origen=valoracion';
  const fallo = (mensaje: string, codigo: string, status = 400) =>
    quiereJson ? json({ ok: false, mensaje }, status) : redirigir(`/pedir-valoracion/?error=${codigo}`, url);

  const form = await request.formData();
  if (form.get('web')) return quiereJson ? json({ ok: true, redirigir: gracias }) : redirigir(gracias, url);

  if (!env.TURNSTILE_SECRET) {
    console.error('Falta el secreto TURNSTILE_SECRET');
    return fallo('El formulario aún no está configurado. Escríbenos por WhatsApp.', 'config', 500);
  }
  const token = String(form.get('cf-turnstile-response') ?? '');
  const humano = token ? await verificarTurnstile(token, env.TURNSTILE_SECRET, request.headers.get('CF-Connecting-IP')) : false;
  if (!humano) return fallo('No pudimos completar la verificación antispam. Vuelve a intentarlo.', 'turnstile', 403);

  // Campos de texto agrupados por nombre (las preguntas de opción múltiple llegan repetidas).
  const valores: Record<string, string[]> = {};
  for (const [clave, valor] of form.entries()) {
    if (typeof valor === 'string') (valores[clave] ??= []).push(valor);
  }
  const resultado = validarValoracion(valores);
  if (!resultado.ok) return fallo(`Revisa estos campos: ${resultado.errores.join(', ')}.`, 'datos');

  // Adjuntos: cantidad, tamaño total y tipos permitidos.
  const archivos = form.getAll('archivos').filter((a): a is File => typeof a !== 'string' && a.size > 0);
  if (archivos.length > ARCHIVOS.maxArchivos) return fallo(`Puedes adjuntar hasta ${ARCHIVOS.maxArchivos} archivos.`, 'archivos', 413);
  const total = archivos.reduce((suma, a) => suma + a.size, 0);
  if (total > ARCHIVOS.maxBytes) return fallo('Los archivos superan el tamaño máximo (8 MB en total).', 'archivos', 413);
  if (archivos.some((a) => a.type && !ARCHIVOS.tipos.includes(a.type))) return fallo('Solo se admiten PDF o imágenes.', 'archivos', 415);
  const adjuntos: Adjunto[] = [];
  for (const a of archivos) {
    adjuntos.push({ nombre: a.name.replace(/[^\w.\- ]+/g, '_').slice(0, 120) || 'adjunto', contenido: aBase64(await a.arrayBuffer()) });
  }

  const proyecto = String(form.get('proyecto') ?? '').slice(0, 120);
  const extra = [proyecto ? `Proyecto de referencia: ${proyecto}` : '', `Página: ${String(form.get('pagina') ?? '').slice(0, 200)}`].filter(Boolean);
  const envio = await enviarMail(env, {
    asunto: `Valoración web · ${INTERESES[resultado.interes]} · ${resultado.nombre}`,
    texto: resumenValoracion(resultado, extra),
    responderA: resultado.email,
    adjuntos,
  });
  if (!envio.ok) {
    console.error(envio.error);
    return fallo('No pudimos enviar tu solicitud. Escríbenos a info@bramantiarquitectos.com.', 'envio', 502);
  }
  return quiereJson ? json({ ok: true, redirigir: gracias, simulado: envio.simulado ?? false }) : redirigir(gracias, url);
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (url.pathname === '/api/contacto' || url.pathname === '/api/contacto/') {
      if (request.method !== 'POST') return json({ ok: false, mensaje: 'Método no permitido.' }, 405);
      try {
        return await contacto(request, env);
      } catch (error) {
        console.error(error);
        return json({ ok: false, mensaje: 'Error inesperado.' }, 500);
      }
    }
    if (url.pathname === '/api/valoracion' || url.pathname === '/api/valoracion/') {
      if (request.method !== 'POST') return json({ ok: false, mensaje: 'Método no permitido.' }, 405);
      try {
        return await valoracion(request, env);
      } catch (error) {
        console.error(error);
        return json({ ok: false, mensaje: 'Error inesperado.' }, 500);
      }
    }
    if (url.pathname.startsWith('/api/')) return json({ ok: false, mensaje: 'No encontrado.' }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
