// Presupuestador paso a paso: caminos según el interés, preguntas condicionales, validación clara,
// avance automático en preguntas de una sola opción, borrador guardado, adjuntos y envío con fetch.
import { animateMini as animate } from 'motion';
import { track } from '../lib/track';

const raiz = document.querySelector<HTMLElement>('[data-presu]');
const form = document.querySelector<HTMLFormElement>('[data-presu-form]');

if (raiz && form) {
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const CLAVE = 'bramanti-valoracion-v1';
  const pasos = [...form.querySelectorAll<HTMLFieldSetElement>('[data-paso]')];
  const barra = form.querySelector<HTMLElement>('[data-presu-barra]');
  const indicador = form.querySelector<HTMLElement>('[data-presu-indicador]');
  const atras = form.querySelector<HTMLButtonElement>('[data-presu-atras]');
  const siguiente = form.querySelector<HTMLButtonElement>('[data-presu-siguiente]');
  const enviar = form.querySelector<HTMLButtonElement>('[data-presu-enviar]');
  const estado = form.querySelector<HTMLElement>('[data-presu-estado]');
  const resumen = form.querySelector<HTMLElement>('[data-presu-resumen]');
  const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
  const TELEFONO = /^[+()\d\s.-]{9,20}$/;

  let indice = 0; // posición dentro del camino activo

  const interes = () => form.querySelector<HTMLInputElement>('input[name="interes"]:checked')?.value ?? '';
  const camino = () => pasos.filter((p) => !p.dataset.caminos || p.dataset.caminos.split(' ').includes(interes()));
  const valores = (nombre: string, en: ParentNode = form) =>
    [...en.querySelectorAll<HTMLInputElement>(`[name="${nombre}"]`)].filter((i) => !i.disabled && ((i.type !== 'radio' && i.type !== 'checkbox') || i.checked)).map((i) => i.value).filter(Boolean);

  // ---------- Visibilidad: pasos fuera del camino y preguntas condicionales quedan deshabilitados ----------
  const sincronizar = () => {
    const activos = new Set(camino());
    for (const paso of pasos) {
      const enCamino = activos.has(paso);
      for (const campo of paso.querySelectorAll<HTMLElement>('[data-campo]')) {
        let mostrar = enCamino;
        if (campo.dataset.siCampo) {
          const actuales = valores(campo.dataset.siCampo, paso);
          mostrar = enCamino && actuales.some((v) => (campo.dataset.siValores ?? '').split(' ').includes(v));
          campo.hidden = !mostrar;
        }
        for (const el of campo.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input, textarea')) el.disabled = !mostrar;
      }
    }
  };

  // ---------- Mostrar un paso ----------
  const mostrar = (nuevo: number, direccion = 1, enfocar = true) => {
    const lista = camino();
    indice = Math.max(0, Math.min(nuevo, lista.length - 1));
    const actual = lista[indice];
    for (const p of pasos) p.hidden = p !== actual;
    lista.forEach((p, i) => {
      const num = p.querySelector('[data-presu-numero]');
      if (num) num.textContent = String(i + 1).padStart(2, '0');
    });
    const ultimo = indice === lista.length - 1;
    if (atras) atras.hidden = indice === 0;
    if (siguiente) siguiente.hidden = ultimo;
    if (enviar) enviar.hidden = !ultimo;
    if (barra) barra.style.transform = `scaleX(${interes() ? Math.max(0.05, (indice + 1) / lista.length) : 0.08})`;
    const titulo = actual.querySelector<HTMLElement>('.presu-titulo');
    // Hasta elegir el interés no se sabe cuántos pasos hay: no mostramos un total que luego cambia.
    const total = interes() ? ` de ${lista.length}` : '';
    if (indicador) indicador.textContent = `Paso ${indice + 1}${total}${titulo ? ` · ${titulo.textContent}` : ''}`;
    if (ultimo) {
      cargarTurnstile();
      armarResumen();
    }
    if (!reducir) {
      animate(actual, { opacity: [0, 1], transform: [`translateX(${24 * direccion}px)`, 'translateX(0)'] }, { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] });
    }
    if (enfocar) {
      titulo?.focus({ preventScroll: true });
      const top = form.getBoundingClientRect().top + window.scrollY - 96;
      if (window.scrollY > top) window.scrollTo({ top, behavior: reducir ? 'auto' : 'smooth' });
    }
    track('valoracion-paso', { paso: actual.dataset.paso ?? '', numero: indice + 1 });
  };

  // ---------- Validación del paso ----------
  const error = (campo: HTMLElement, mensaje: string) => {
    campo.classList.toggle('invalido', Boolean(mensaje));
    const p = campo.querySelector<HTMLElement>('[data-error]');
    if (p) p.textContent = mensaje;
  };
  const validarPaso = (paso: HTMLElement) => {
    let primero: HTMLElement | null = null;
    for (const campo of paso.querySelectorAll<HTMLElement>('[data-campo]')) {
      if (campo.hidden) continue;
      const tipo = campo.dataset.tipo;
      const requerido = campo.hasAttribute('data-requerido');
      const nombre = campo.dataset.campo ?? '';
      const vals = valores(nombre, campo);
      let mensaje = '';
      if (requerido && vals.length === 0) {
        mensaje =
          tipo === 'opcion' ? 'Elige una opción para seguir.' :
          tipo === 'multiple' ? 'Elige al menos una opción.' :
          tipo === 'casilla' ? 'Necesitamos tu consentimiento para responderte.' :
          'Este dato es necesario para seguir.';
      } else if (vals.length) {
        const v = vals[0];
        const input = campo.querySelector<HTMLInputElement>('input[type="number"]');
        if (tipo === 'email' && !EMAIL.test(v)) mensaje = 'Revisa el email, por ejemplo nombre@dominio.com.';
        if (tipo === 'tel' && !TELEFONO.test(v)) mensaje = 'Revisa el teléfono: al menos 9 cifras.';
        if ((tipo === 'numero' || tipo === 'contador') && input) {
          const n = Number(v);
          if (!Number.isFinite(n) || n < Number(input.min) || n > Number(input.max)) mensaje = `Escribe un número entre ${input.min} y ${input.max}.`;
        }
      }
      if (tipo === 'archivos') mensaje = campo.querySelector<HTMLElement>('[data-error]')?.textContent ?? '';
      error(campo, mensaje);
      if (mensaje && !primero) primero = campo;
    }
    if (primero) {
      const foco = primero.querySelector<HTMLElement>('input:not([type="hidden"]), textarea');
      foco?.focus();
      if (!reducir) animate(primero, { transform: ['translateX(0)', 'translateX(-6px)', 'translateX(6px)', 'translateX(0)'] }, { duration: 0.35 });
      return false;
    }
    return true;
  };

  const avanzar = () => {
    const lista = camino();
    if (!validarPaso(lista[indice])) return;
    mostrar(indice + 1, 1);
  };
  siguiente?.addEventListener('click', avanzar);
  atras?.addEventListener('click', () => mostrar(indice - 1, -1));
  form.addEventListener('keydown', (e) => {
    const destino = e.target as HTMLElement;
    if (e.key !== 'Enter' || destino.tagName === 'TEXTAREA' || destino.tagName === 'BUTTON' || destino.tagName === 'A') return;
    e.preventDefault();
    if (indice < camino().length - 1) avanzar();
    else form.requestSubmit();
  });

  // Avance automático cuando el paso tiene una sola pregunta de una opción.
  form.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement;
    sincronizar();
    guardar();
    const campo = el.closest<HTMLElement>('[data-campo]');
    if (campo) error(campo, '');
    const paso = el.closest<HTMLElement>('[data-paso]');
    if (!paso || el.type !== 'radio') return;
    const visibles = [...paso.querySelectorAll<HTMLElement>('[data-campo]')].filter((c) => !c.hidden);
    if (visibles.length === 1 && visibles[0].dataset.tipo === 'opcion') setTimeout(avanzar, reducir ? 0 : 420);
  });
  form.addEventListener('input', (e) => {
    const campo = (e.target as HTMLElement).closest<HTMLElement>('[data-campo]');
    if (campo?.classList.contains('invalido')) error(campo, '');
    guardar();
  });

  // ---------- Contadores −/+ ----------
  form.addEventListener('click', (e) => {
    const boton = (e.target as Element).closest<HTMLButtonElement>('[data-restar], [data-sumar]');
    if (!boton) return;
    const input = boton.parentElement?.querySelector<HTMLInputElement>('input');
    if (!input) return;
    const n = (Number(input.value) || 0) + (boton.hasAttribute('data-sumar') ? 1 : -1);
    input.value = String(Math.max(Number(input.min), Math.min(Number(input.max), n)));
    if (!reducir) animate(input, { transform: ['scale(1.18)', 'scale(1)'] }, { duration: 0.3 });
    guardar();
  });

  // ---------- Adjuntos ----------
  const archivo = form.querySelector<HTMLInputElement>('input[type="file"]');
  const listaArchivos = form.querySelector<HTMLElement>('[data-lista-archivos]');
  const soltar = form.querySelector<HTMLElement>('[data-soltar]');
  const tiposOk = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'];
  const tamano = (b: number) => (b > 1e6 ? `${(b / 1e6).toFixed(1)} MB` : `${Math.max(1, Math.round(b / 1e3))} KB`);
  const pintarArchivos = () => {
    if (!archivo || !listaArchivos) return;
    const campo = archivo.closest<HTMLElement>('[data-campo]');
    const archivos = [...(archivo.files ?? [])];
    const total = archivos.reduce((s, f) => s + f.size, 0);
    let mensaje = '';
    if (archivos.length > Number(archivo.dataset.maxArchivos)) mensaje = `Puedes adjuntar hasta ${archivo.dataset.maxArchivos} archivos.`;
    else if (total > Number(archivo.dataset.maxBytes)) mensaje = `Los archivos suman ${tamano(total)}; el máximo es ${tamano(Number(archivo.dataset.maxBytes))}.`;
    else if (archivos.some((f) => f.type && !tiposOk.includes(f.type))) mensaje = 'Solo PDF o imágenes (JPG, PNG, WEBP, HEIC).';
    if (campo) error(campo, mensaje);
    listaArchivos.replaceChildren(
      ...archivos.map((f, i) => {
        const li = document.createElement('li');
        const nombre = document.createElement('span');
        nombre.textContent = `${f.name} · ${tamano(f.size)}`;
        const quitar = document.createElement('button');
        quitar.type = 'button';
        quitar.textContent = 'Quitar';
        quitar.setAttribute('aria-label', `Quitar ${f.name}`);
        quitar.addEventListener('click', () => {
          const dt = new DataTransfer();
          archivos.forEach((g, j) => j !== i && dt.items.add(g));
          archivo.files = dt.files;
          pintarArchivos();
        });
        li.append(nombre, quitar);
        return li;
      }),
    );
  };
  archivo?.addEventListener('change', pintarArchivos);
  soltar?.addEventListener('dragover', (e) => {
    e.preventDefault();
    soltar.classList.add('encima');
  });
  soltar?.addEventListener('dragleave', () => soltar.classList.remove('encima'));
  soltar?.addEventListener('drop', () => soltar.classList.remove('encima'));

  // ---------- Resumen editable ----------
  function armarResumen() {
    if (!resumen) return;
    const filas: HTMLElement[] = [];
    camino().forEach((paso, i) => {
      if (paso.dataset.paso === 'contacto') return;
      for (const campo of paso.querySelectorAll<HTMLElement>('[data-campo]')) {
        if (campo.hidden) continue;
        const nombre = campo.dataset.campo ?? '';
        const etiquetas = [...campo.querySelectorAll<HTMLInputElement>(`[name="${nombre}"]`)]
          .filter((el) => !el.disabled && ((el.type !== 'radio' && el.type !== 'checkbox') || el.checked) && el.value)
          .map((el) => (el.type === 'radio' || el.type === 'checkbox' ? el.closest('label')?.querySelector('.presu-opcion-etiqueta')?.textContent ?? el.value : el.value));
        if (!etiquetas.length) continue;
        const fila = document.createElement('div');
        fila.className = 'fila';
        const dt = document.createElement('dt');
        dt.textContent = (campo.querySelector('.presu-etiqueta')?.firstChild?.textContent ?? nombre).replace(/[*?¿]/g, '').trim();
        const dd = document.createElement('dd');
        dd.textContent = etiquetas.join(', ');
        const editar = document.createElement('button');
        editar.type = 'button';
        editar.className = 'editar';
        editar.textContent = 'Editar';
        editar.addEventListener('click', () => mostrar(i, -1));
        fila.append(dt, dd, editar);
        filas.push(fila);
      }
    });
    resumen.replaceChildren(...filas);
  }

  // ---------- Borrador en el navegador (se puede cerrar y volver) ----------
  const guardar = () => {
    try {
      const datos: Record<string, string[]> = {};
      for (const el of form.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>('input[name], textarea[name]')) {
        if (el.type === 'file' || el.type === 'hidden' || el.name === 'web' || el.name === 'cf-turnstile-response') continue;
        if ((el.type === 'radio' || el.type === 'checkbox') && !(el as HTMLInputElement).checked) continue;
        (datos[`${el.closest('[data-paso]')?.getAttribute('data-paso')}|${el.name}`] ??= []).push(el.value);
      }
      localStorage.setItem(CLAVE, JSON.stringify({ datos, guardado: Date.now() }));
    } catch {
      /* sin almacenamiento disponible: no pasa nada */
    }
  };
  const restaurar = () => {
    try {
      const crudo = localStorage.getItem(CLAVE);
      if (!crudo) return false;
      const { datos, guardado } = JSON.parse(crudo) as { datos: Record<string, string[]>; guardado: number };
      if (Date.now() - guardado > 1000 * 60 * 60 * 24 * 14) {
        localStorage.removeItem(CLAVE);
        return false;
      }
      let algo = false;
      for (const [clave, vals] of Object.entries(datos)) {
        const [paso, nombre] = clave.split('|');
        const contenedor = form.querySelector(`[data-paso="${paso}"]`);
        if (!contenedor) continue;
        for (const el of contenedor.querySelectorAll<HTMLInputElement | HTMLTextAreaElement>(`[name="${nombre}"]`)) {
          if (el.type === 'radio' || el.type === 'checkbox') (el as HTMLInputElement).checked = vals.includes(el.value);
          else el.value = vals[0] ?? el.value;
          algo = true;
        }
      }
      return algo;
    } catch {
      return false;
    }
  };
  form.querySelector('[data-presu-reiniciar]')?.addEventListener('click', () => {
    try {
      localStorage.removeItem(CLAVE);
    } catch {
      /* nada */
    }
    form.reset();
    form.querySelector<HTMLElement>('[data-presu-recuperado]')?.setAttribute('hidden', '');
    sincronizar();
    mostrar(0, -1);
  });

  // ---------- Turnstile (se carga recién al llegar al último paso) ----------
  let turnstileCargado = false;
  function cargarTurnstile() {
    if (turnstileCargado) return;
    turnstileCargado = true;
    const s = document.createElement('script');
    s.src = 'https://challenges.cloudflare.com/turnstile/v0/api.js';
    s.async = true;
    document.head.append(s);
  }

  // ---------- Envío ----------
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const lista = camino();
    for (let i = 0; i < lista.length; i++) {
      if (!validarPaso(lista[i])) {
        mostrar(i, -1, false);
        validarPaso(lista[i]);
        return;
      }
    }
    const datos = new FormData(form);
    if (!datos.get('cf-turnstile-response')) {
      if (estado) estado.textContent = 'Espera un momento a que termine la verificación antispam y vuelve a enviar.';
      return;
    }
    if (enviar) {
      enviar.disabled = true;
      enviar.dataset.texto = enviar.textContent ?? '';
      enviar.textContent = 'Enviando…';
    }
    if (estado) estado.textContent = '';
    try {
      const res = await fetch(form.action, { method: 'POST', body: datos, headers: { Accept: 'application/json' } });
      const json = (await res.json().catch(() => ({}))) as { ok?: boolean; redirigir?: string; mensaje?: string };
      if (res.ok && json.ok) {
        track('valoracion-enviada', { interes: interes() });
        try {
          localStorage.removeItem(CLAVE);
        } catch {
          /* nada */
        }
        window.location.href = json.redirigir ?? raiz.dataset.gracias ?? '/gracias/';
        return;
      }
      throw new Error(json.mensaje ?? '');
    } catch (error) {
      if (estado) {
        estado.textContent =
          (error instanceof Error && error.message) || 'No pudimos enviar tu solicitud. Inténtalo de nuevo o escríbenos por WhatsApp o a info@bramantiarquitectos.com.';
      }
      (window as unknown as { turnstile?: { reset: () => void } }).turnstile?.reset();
      if (enviar) {
        enviar.disabled = false;
        enviar.textContent = enviar.dataset.texto ?? 'Enviar';
      }
    }
  });

  // ---------- Arranque: borrador, precarga desde la URL ----------
  const recuperado = restaurar();
  const params = new URLSearchParams(location.search);
  const servicio = params.get('servicio');
  const mapa: Record<string, string> = { 'reforma-integral': 'reforma-integral', interiorismo: 'interiorismo', 'obra-nueva': 'obra-nueva' };
  if (servicio && mapa[servicio] && !interes()) {
    const radio = form.querySelector<HTMLInputElement>(`input[name="interes"][value="${mapa[servicio]}"]`);
    if (radio) radio.checked = true;
  }
  const proyecto = params.get('proyecto');
  const campoProyecto = form.querySelector<HTMLInputElement>('[data-presu-proyecto]');
  const referencia = form.querySelector<HTMLElement>('[data-presu-referencia]');
  if (proyecto && campoProyecto) {
    const legible = proyecto.replace(/-reforma.*$|-madrid$/g, '').replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
    campoProyecto.value = legible;
    if (referencia) {
      referencia.hidden = false;
      referencia.textContent = `Pides una valoración tomando como referencia: ${legible}.`;
    }
  }
  if (recuperado) form.querySelector<HTMLElement>('[data-presu-recuperado]')?.removeAttribute('hidden');
  sincronizar();
  mostrar(0, 1, false);
}
