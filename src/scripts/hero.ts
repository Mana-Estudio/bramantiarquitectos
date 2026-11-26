// Carrusel del hero: fundido entre obras, barra de progreso por diapositiva, pausa accesible y swipe.
import { animateMini as animate } from 'motion';

const hero = document.querySelector<HTMLElement>('[data-hero]');

if (hero) {
  const diapositivas = [...hero.querySelectorAll<HTMLElement>('[data-diapositiva]')];
  const puntos = [...hero.querySelectorAll<HTMLButtonElement>('[data-hero-ir]')];
  const pausa = hero.querySelector<HTMLButtonElement>('[data-hero-pausa]');
  const pie = hero.querySelector<HTMLAnchorElement>('[data-hero-pie]');
  const nombre = hero.querySelector<HTMLElement>('[data-hero-nombre]');
  const zona = hero.querySelector<HTMLElement>('[data-hero-zona]');
  const actualTxt = hero.querySelector<HTMLElement>('[data-hero-actual]');
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const DURACION = 6000;
  hero.style.setProperty('--duracion-diapositiva', `${DURACION}ms`);

  let actual = 0;
  let temporizador: number | undefined;
  let pausadoPorUsuario = reducir;
  let visible = true;

  const reiniciarBarra = (punto: HTMLButtonElement) => {
    // Reinicia la transición de la barra sin forzar un layout (dos frames en lugar de offsetWidth).
    punto.classList.remove('activo');
    requestAnimationFrame(() => requestAnimationFrame(() => punto.classList.add('activo')));
  };

  const ir = (i: number, desdeUsuario = false) => {
    const siguiente = (i + diapositivas.length) % diapositivas.length;
    if (siguiente === actual && !desdeUsuario) return;
    const anterior = diapositivas[actual];
    const nueva = diapositivas[siguiente];
    nueva.classList.add('lista');
    anterior.classList.remove('activa');
    anterior.setAttribute('aria-hidden', 'true');
    nueva.classList.add('activa');
    nueva.removeAttribute('aria-hidden');
    puntos.forEach((p, j) => {
      p.classList.toggle('activo', j === siguiente);
      if (j === siguiente) p.setAttribute('aria-current', 'true');
      else p.removeAttribute('aria-current');
    });
    if (puntos[siguiente] && !pausadoPorUsuario) reiniciarBarra(puntos[siguiente]);
    actual = siguiente;
    // Solo se prepara (y descarga) la foto que viene después, no todas a la vez.
    diapositivas[(siguiente + 1) % diapositivas.length]?.classList.add('lista');
    if (actualTxt) actualTxt.textContent = String(siguiente + 1).padStart(2, '0');
    if (pie && nombre && zona) {
      const cambiar = () => {
        nombre.textContent = nueva.dataset.nombre ?? '';
        zona.textContent = nueva.dataset.zona ?? '';
        pie.href = nueva.dataset.href ?? pie.href;
      };
      if (reducir) cambiar();
      else
        animate(pie, { opacity: [1, 0], transform: ['translateY(0)', 'translateY(-6px)'] }, { duration: 0.25 }).then(() => {
          cambiar();
          animate(pie, { opacity: [0, 1], transform: ['translateY(8px)', 'translateY(0)'] }, { duration: 0.45, ease: [0.22, 0.61, 0.36, 1] });
        });
    }
    programar();
  };

  const programar = () => {
    window.clearTimeout(temporizador);
    if (pausadoPorUsuario || !visible || document.hidden) return;
    temporizador = window.setTimeout(() => ir(actual + 1), DURACION);
  };

  const actualizarPausa = () => {
    hero.toggleAttribute('data-pausado', pausadoPorUsuario);
    if (!pausa) return;
    pausa.setAttribute('aria-pressed', String(pausadoPorUsuario));
    const texto = pausa.querySelector('.visualmente-oculto');
    if (texto) texto.textContent = (pausadoPorUsuario ? pausa.dataset.etiquetaPlay : pausa.dataset.etiquetaPausa) ?? '';
  };

  puntos.forEach((p, i) => p.addEventListener('click', () => ir(i, true)));
  pausa?.addEventListener('click', () => {
    pausadoPorUsuario = !pausadoPorUsuario;
    actualizarPausa();
    if (!pausadoPorUsuario && puntos[actual]) reiniciarBarra(puntos[actual]);
    programar();
  });

  // Swipe en táctil.
  let inicioX: number | null = null;
  hero.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse') inicioX = e.clientX;
  });
  hero.addEventListener('pointerup', (e) => {
    if (inicioX === null) return;
    const dx = e.clientX - inicioX;
    if (Math.abs(dx) > 50) ir(actual + (dx < 0 ? 1 : -1), true);
    inicioX = null;
  });

  // Se pausa solo si el hero no se ve o la pestaña está oculta.
  new IntersectionObserver(([entrada]) => {
    visible = entrada.isIntersecting;
    programar();
  }).observe(hero);
  document.addEventListener('visibilitychange', programar);

  // La segunda foto se prepara después de la carga, para no competir con la imagen principal.
  const preparar = () => {
    diapositivas[1]?.classList.add('lista');
    actualizarPausa();
    if (!pausadoPorUsuario && puntos[0]) reiniciarBarra(puntos[0]);
    programar();
  };
  if (document.readyState === 'complete') setTimeout(preparar, 1200);
  else window.addEventListener('load', () => setTimeout(preparar, 1200), { once: true });
}
