// Formulario de presupuesto: pasos, mensajes de validación claros, precarga y envío con fetch.
import { track } from '../lib/track';

const form = document.querySelector<HTMLFormElement>('[data-formulario]');

if (form) {
  const es = form.dataset.idioma !== 'en';
  const pasos = [...form.querySelectorAll<HTMLFieldSetElement>('[data-paso]')];
  const indicador = form.querySelector<HTMLElement>('[data-indicador]');
  const estado = form.querySelector<HTMLElement>('[data-estado]');
  const enviar = form.querySelector<HTMLButtonElement>('[data-enviar]');
  const referencia = form.querySelector<HTMLElement>('[data-referencia]');
  const campoProyecto = form.querySelector<HTMLInputElement>('[data-campo-proyecto]');
  const nombres: Record<string, string> = JSON.parse(form.dataset.proyectos ?? '{}');

  // Turnstile (≈ 28 KB) se carga recién cuando la persona empieza a completar el formulario.
  let turnstileCargado = false;
  const cargarTurnstile = () => {
    if (turnstileCargado) return;
    turnstileCargado = true;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    document.head.append(s);
  };
  form.addEventListener('focusin', cargarTurnstile, { once: true });
  form.addEventListener('pointerdown', cargarTurnstile, { once: true });
  form.addEventListener('change', cargarTurnstile, { once: true });
  if (new URLSearchParams(location.search).has('proyecto') || location.hash === '#presupuesto') cargarTurnstile();

  // Mensajes de error en el idioma de la página (data-error en cada campo).
  form.addEventListener(
    'invalid',
    (e) => {
      const campo = e.target as HTMLInputElement;
      form.classList.add('validado');
      if (campo.dataset.error) campo.setCustomValidity(campo.dataset.error);
    },
    true,
  );
  form.addEventListener('input', (e) => (e.target as HTMLInputElement).setCustomValidity?.(''));
  form.addEventListener('change', (e) => (e.target as HTMLInputElement).setCustomValidity?.(''));

  const valido = (paso: HTMLFieldSetElement) => {
    for (const campo of paso.querySelectorAll<HTMLInputElement>('input, select, textarea')) {
      campo.setCustomValidity('');
      if (!campo.checkValidity()) {
        campo.reportValidity();
        return false;
      }
    }
    return true;
  };

  const mostrarPaso = (n: number, enfocar = true) => {
    form.classList.toggle('en-paso-2', n === 2);
    if (indicador) indicador.textContent = es ? `Paso ${n} de 2` : `Step ${n} of 2`;
    if (enfocar) pasos[n - 1]?.querySelector<HTMLElement>('legend')?.focus();
  };

  // Con JS: dos pasos (el estado inicial ya lo pinta el CSS con @media (scripting: enabled)).
  mostrarPaso(1, false);
  form.querySelector('[data-siguiente]')?.addEventListener('click', (e) => {
    e.preventDefault();
    cargarTurnstile();
    if (valido(pasos[0])) {
      mostrarPaso(2);
      track('formulario-paso-2');
    }
  });
  form.querySelector('[data-atras]')?.addEventListener('click', () => mostrarPaso(1));

  // Precarga desde ?proyecto= y ?servicio=
  const params = new URLSearchParams(location.search);
  const servicio = params.get('servicio');
  if (servicio) {
    const radio = form.querySelector<HTMLInputElement>(`input[name="tipo"][value="${CSS.escape(servicio)}"]`);
    if (radio) radio.checked = true;
  }
  const proyecto = params.get('proyecto');
  if (proyecto && nombres[proyecto]) {
    const nombre = nombres[proyecto];
    if (campoProyecto) campoProyecto.value = nombre;
    if (referencia) {
      referencia.hidden = false;
      referencia.textContent = es ? `Consulta sobre: ${nombre}` : `Enquiry about: ${nombre}`;
    }
    const mensaje = form.querySelector<HTMLTextAreaElement>('textarea[name="mensaje"]');
    if (mensaje && !mensaje.value) mensaje.value = es ? `Me interesa un proyecto como ${nombre}. ` : `I am interested in a project like ${nombre}. `;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (!valido(pasos[0])) {
      mostrarPaso(1);
      return;
    }
    if (!valido(pasos[1])) return;

    const datos = new FormData(form);
    if (!datos.get('cf-turnstile-response')) {
      if (estado) estado.textContent = es ? 'Espera un momento a que se complete la verificación antispam y vuelve a enviar.' : 'Please wait for the anti-spam check to finish and send again.';
      return;
    }

    if (enviar) {
      enviar.disabled = true;
      enviar.dataset.texto = enviar.textContent ?? '';
      enviar.textContent = es ? 'Enviando…' : 'Sending…';
    }
    if (estado) {
      estado.classList.remove('ok');
      estado.textContent = '';
    }

    try {
      const res = await fetch(form.action, { method: 'POST', body: datos, headers: { Accept: 'application/json' } });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; redirigir?: string; mensaje?: string };
      if (res.ok && json.ok) {
        track('formulario-ok', { tipo: String(datos.get('tipo') ?? '') });
        location.href = json.redirigir ?? form.dataset.gracias ?? '/gracias/';
        return;
      }
      throw new Error(json.mensaje ?? '');
    } catch (error) {
      if (estado) {
        estado.textContent =
          (error instanceof Error && error.message) ||
          (es
            ? 'No pudimos enviar el formulario. Inténtalo de nuevo o escríbenos por WhatsApp o a info@bramantiarquitectos.com.'
            : 'We could not send the form. Please try again or write to us on WhatsApp or at info@bramantiarquitectos.com.');
      }
      (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
      if (enviar) {
        enviar.disabled = false;
        enviar.textContent = enviar.dataset.texto ?? (es ? 'Enviar consulta' : 'Send enquiry');
      }
    }
  });
}
