// Worker de Cloudflare: solo atiende /api/* (ver run_worker_first en wrangler.jsonc).
// El resto del sitio lo sirve Cloudflare como archivos estáticos desde ./dist.
import { validarConsulta, resumenConsulta, TIPOS_CONSULTA } from '../src/lib/contacto';
import { enviarMail } from '../src/lib/mail';

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
    if (url.pathname.startsWith('/api/')) return json({ ok: false, mensaje: 'No encontrado.' }, 404);
    return env.ASSETS.fetch(request);
  },
} satisfies ExportedHandler<Env>;
