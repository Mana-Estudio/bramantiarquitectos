// Microinteracciones (las de puntero solo con mouse y sin "reducir movimiento"):
//   - botones magnéticos que siguen un poco al puntero (translate con transición CSS)
//   - etiqueta que acompaña al cursor sobre proyectos y videos (data-cursor)
//   - copiar el email con un clic (data-copiar), en cualquier dispositivo
import { animateMini as animate } from 'motion';

const punteroFino = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

if (punteroFino && !reducir) {
  // Botones magnéticos.
  for (const boton of document.querySelectorAll<HTMLElement>('.boton, .hero-pausa, .previa-control, .carrusel-flecha')) {
    boton.classList.add('magnetico');
    boton.addEventListener('pointermove', (e) => {
      const r = boton.getBoundingClientRect();
      const x = (e.clientX - (r.left + r.width / 2)) * 0.16;
      const y = (e.clientY - (r.top + r.height / 2)) * 0.3;
      boton.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
    });
    boton.addEventListener('pointerleave', () => {
      boton.style.translate = '';
    });
  }

  // Etiqueta que sigue al cursor.
  const etiqueta = document.createElement('div');
  etiqueta.className = 'cursor-etiqueta';
  etiqueta.setAttribute('aria-hidden', 'true');
  document.body.append(etiqueta);
  let activo: HTMLElement | null = null;
  let x = 0;
  let y = 0;
  let pendiente = false;
  document.addEventListener(
    'pointermove',
    (e) => {
      x = e.clientX;
      y = e.clientY;
      if (!pendiente) {
        pendiente = true;
        requestAnimationFrame(() => {
          etiqueta.style.translate = `${x}px ${y}px`;
          pendiente = false;
        });
      }
    },
    { passive: true },
  );
  document.addEventListener('pointerover', (e) => {
    const el = (e.target as Element | null)?.closest<HTMLElement>('[data-cursor]') ?? null;
    if (el === activo) return;
    activo = el;
    if (el) {
      etiqueta.textContent = el.dataset.cursor ?? '';
      etiqueta.classList.add('visible');
    } else {
      etiqueta.classList.remove('visible');
    }
  });
  document.documentElement.addEventListener('pointerleave', () => etiqueta.classList.remove('visible'));
}

// Copiar al portapapeles.
document.addEventListener('click', async (e) => {
  const boton = (e.target as Element | null)?.closest<HTMLElement>('[data-copiar]');
  if (!boton) return;
  e.preventDefault();
  const texto = boton.dataset.copiar ?? '';
  const estado = boton.querySelector<HTMLElement>('[data-copiar-estado]');
  try {
    await navigator.clipboard.writeText(texto);
    boton.setAttribute('data-copiado', '');
    if (estado) estado.textContent = boton.dataset.copiadoTexto ?? 'Copiado';
    if (!reducir) animate(boton, { transform: ['scale(1)', 'scale(0.92)', 'scale(1)'] }, { duration: 0.35 });
    setTimeout(() => {
      boton.removeAttribute('data-copiado');
      if (estado) estado.textContent = boton.dataset.copiarTexto ?? 'Copiar';
    }, 2000);
  } catch {
    window.location.href = `mailto:${texto}`;
  }
});
