// Lightbox de galería: <dialog> nativo (foco atrapado y Escape), flechas del teclado y swipe.
for (const galeria of document.querySelectorAll<HTMLElement>('[data-galeria]')) {
  const dialog = galeria.querySelector<HTMLDialogElement>('[data-lightbox]');
  const img = galeria.querySelector<HTMLImageElement>('[data-lightbox-img]');
  const texto = galeria.querySelector<HTMLElement>('[data-lightbox-texto]');
  const contador = galeria.querySelector<HTMLElement>('[data-lightbox-contador]');
  const items = [...galeria.querySelectorAll<HTMLAnchorElement>('[data-grande]')];
  if (!dialog || !img || typeof dialog.showModal !== 'function' || items.length === 0) continue;

  let actual = 0;
  let origen: HTMLElement | null = null;

  const mostrar = (i: number) => {
    actual = (i + items.length) % items.length;
    const item = items[actual];
    const alt = item.querySelector('img')?.alt ?? '';
    img.src = item.dataset.grande ?? item.href;
    img.alt = alt;
    if (texto) texto.textContent = alt;
    if (contador) contador.textContent = `${actual + 1} / ${items.length}`;
    // Precarga la siguiente.
    const siguiente = items[(actual + 1) % items.length];
    if (siguiente?.dataset.grande) new Image().src = siguiente.dataset.grande;
  };

  items.forEach((item, i) =>
    item.addEventListener('click', (e) => {
      e.preventDefault();
      origen = item;
      mostrar(i);
      dialog.showModal();
    }),
  );

  dialog.querySelector('[data-cerrar]')?.addEventListener('click', () => dialog.close());
  dialog.querySelector('[data-anterior]')?.addEventListener('click', () => mostrar(actual - 1));
  dialog.querySelector('[data-siguiente]')?.addEventListener('click', () => mostrar(actual + 1));
  dialog.addEventListener('close', () => origen?.focus());
  dialog.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowRight') mostrar(actual + 1);
    if (e.key === 'ArrowLeft') mostrar(actual - 1);
  });
  // Clic en el fondo (fuera de la foto y los botones) cierra.
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) dialog.close();
  });

  let inicioX: number | null = null;
  img.addEventListener('pointerdown', (e) => {
    inicioX = e.clientX;
  });
  img.addEventListener('pointerup', (e) => {
    if (inicioX === null) return;
    const dx = e.clientX - inicioX;
    if (Math.abs(dx) > 40) mostrar(actual + (dx < 0 ? 1 : -1));
    inicioX = null;
  });
}
