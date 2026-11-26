// Envío de mails aislado del resto: cambiar de proveedor es tocar solo este archivo.
// Por defecto Resend (https://resend.com) con RESEND_API_KEY como secreto del Worker.
// Sin clave (desarrollo local) no envía nada: deja el mail en el log y devuelve ok.

export interface EntornoMail {
  RESEND_API_KEY?: string;
  MAIL_TO?: string;
  MAIL_FROM?: string;
}

export interface Adjunto {
  nombre: string;
  /** Contenido en base64. */
  contenido: string;
}

export interface Mensaje {
  asunto: string;
  texto: string;
  responderA?: string;
  adjuntos?: Adjunto[];
}

export type ResultadoMail = { ok: true; simulado?: boolean } | { ok: false; error: string };

export async function enviarMail(env: EntornoMail, mensaje: Mensaje): Promise<ResultadoMail> {
  const para = env.MAIL_TO ?? 'info@bramantiarquitectos.com';
  const de = env.MAIL_FROM ?? 'Web Bramanti Arquitectos <web@bramantiarquitectos.com>';
  const adjuntos = mensaje.adjuntos ?? [];

  if (!env.RESEND_API_KEY) {
    const lista = adjuntos.map((a) => `  - ${a.nombre} (${Math.round((a.contenido.length * 3) / 4 / 1024)} KB)`).join('\n');
    console.log(`[mail simulado] Para: ${para}\nAsunto: ${mensaje.asunto}\n\n${mensaje.texto}${lista ? `\n\nAdjuntos:\n${lista}` : ''}`);
    return { ok: true, simulado: true };
  }

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: de,
      to: [para],
      subject: mensaje.asunto,
      text: mensaje.texto,
      ...(mensaje.responderA ? { reply_to: mensaje.responderA } : {}),
      ...(adjuntos.length ? { attachments: adjuntos.map((a) => ({ filename: a.nombre, content: a.contenido })) } : {}),
    }),
  });

  if (!res.ok) {
    const detalle = await res.text().catch(() => '');
    return { ok: false, error: `Resend respondió ${res.status}: ${detalle.slice(0, 200)}` };
  }
  return { ok: true };
}

/** ArrayBuffer → base64, en trozos para no reventar la pila con archivos grandes. */
export function aBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binario = '';
  const trozo = 0x8000;
  for (let i = 0; i < bytes.length; i += trozo) {
    binario += String.fromCharCode(...bytes.subarray(i, i + trozo));
  }
  return btoa(binario);
}
