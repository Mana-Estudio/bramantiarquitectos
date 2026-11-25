// Activa los comparadores antes/después: el range nativo mueve el recorte.
for (const comp of document.querySelectorAll<HTMLElement>('[data-comparador]')) {
  const control = comp.querySelector<HTMLInputElement>('.comparador-control');
  const marco = comp.querySelector<HTMLElement>('.comparador-marco');
  if (!control || !marco) continue;
  const actualizar = () => {
    marco.style.setProperty('--pos', `${control.value}%`);
    control.setAttribute('aria-valuetext', `${100 - Number(control.value)} ${control.dataset.texto ?? ''}`.trim());
  };
  comp.classList.add('activo');
  control.addEventListener('input', actualizar);
  actualizar();
}
