// Comportamientos comunes a todas las páginas. Vanilla y chico.
import { escucharEventos } from '../lib/track';

escucharEventos();

// Header que se compacta al scrollear (solo transforms: no mueve el contenido).
const header = document.querySelector<HTMLElement>('[data-header]');
if (header) {
  let compacto = false;
  const actualizar = () => {
    const debe = window.scrollY > 40;
    if (debe !== compacto) {
      compacto = debe;
      header.classList.toggle('compacto', debe);
    }
  };
  actualizar();
  window.addEventListener('scroll', () => requestAnimationFrame(actualizar), { passive: true });
}

// Submenús (<details>): se cierran al hacer clic afuera o con Escape.
const desplegables = [...document.querySelectorAll<HTMLDetailsElement>('[data-submenu], [data-menu-movil]')];
document.addEventListener('click', (e) => {
  for (const d of desplegables) {
    if (d.open && !d.contains(e.target as Node)) d.open = false;
  }
});
document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape') return;
  for (const d of desplegables) {
    if (d.open) {
      d.open = false;
      d.querySelector('summary')?.focus();
    }
  }
});

// Menú móvil: bloquea el scroll del fondo mientras está abierto.
const menuMovil = document.querySelector<HTMLDetailsElement>('[data-menu-movil]');
menuMovil?.addEventListener('toggle', () => {
  document.documentElement.style.overflow = menuMovil.open ? 'hidden' : '';
});
