// Carrusel horizontal: flechas que avanzan de a una tarjeta y arrastre con mouse (el táctil ya es nativo).
for (const carrusel of document.querySelectorAll<HTMLElement>('[data-carrusel]')) {
  const pista = carrusel.querySelector<HTMLElement>('[data-carrusel-pista]');
  const anterior = carrusel.querySelector<HTMLButtonElement>('[data-carrusel-anterior]');
  const siguiente = carrusel.querySelector<HTMLButtonElement>('[data-carrusel-siguiente]');
  if (!pista) continue;
  const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const paso = () => {
    const item = pista.querySelector<HTMLElement>('li');
    return item ? item.getBoundingClientRect().width + 24 : pista.clientWidth * 0.8;
  };
  const actualizar = () => {
    const max = pista.scrollWidth - pista.clientWidth - 4;
    if (anterior) anterior.disabled = pista.scrollLeft <= 4;
    if (siguiente) siguiente.disabled = pista.scrollLeft >= max;
  };
  anterior?.addEventListener('click', () => pista.scrollBy({ left: -paso(), behavior: reducir ? 'auto' : 'smooth' }));
  siguiente?.addEventListener('click', () => pista.scrollBy({ left: paso(), behavior: reducir ? 'auto' : 'smooth' }));
  pista.addEventListener('scroll', () => requestAnimationFrame(actualizar), { passive: true });
  window.addEventListener('resize', actualizar);
  // El estado de las flechas se calcula cuando el carrusel se acerca a la pantalla:
  // medir al cargar fuerza un layout de toda la página y bloquea el primer pintado.
  new IntersectionObserver(
    (entradas, observador) => {
      if (!entradas.some((e) => e.isIntersecting)) return;
      actualizar();
      observador.disconnect();
    },
    { rootMargin: '300px 0px' },
  ).observe(carrusel);

  // Arrastre con mouse.
  let inicioX = 0;
  let inicioScroll = 0;
  let arrastrando = false;
  let movio = false;
  pista.addEventListener('pointerdown', (e) => {
    if (e.pointerType !== 'mouse' || e.button !== 0) return;
    arrastrando = true;
    movio = false;
    inicioX = e.clientX;
    inicioScroll = pista.scrollLeft;
  });
  window.addEventListener('pointermove', (e) => {
    if (!arrastrando) return;
    const dx = e.clientX - inicioX;
    if (Math.abs(dx) > 6) {
      movio = true;
      pista.classList.add('arrastrando');
    }
    pista.scrollLeft = inicioScroll - dx;
  });
  window.addEventListener('pointerup', () => {
    if (!arrastrando) return;
    arrastrando = false;
    pista.classList.remove('arrastrando');
  });
  // Si fue un arrastre, que no cuente como clic en el video.
  pista.addEventListener(
    'click',
    (e) => {
      if (movio) {
        e.preventDefault();
        e.stopPropagation();
        movio = false;
      }
    },
    true,
  );
  pista.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') pista.scrollBy({ left: paso(), behavior: reducir ? 'auto' : 'smooth' });
    if (e.key === 'ArrowLeft') pista.scrollBy({ left: -paso(), behavior: reducir ? 'auto' : 'smooth' });
  });
}
