// Filtros del portfolio: tipo y zona, con estado en la URL (?tipo=&zona=).
// Sin JS el formulario queda oculto y se ven todos los proyectos.
const form = document.querySelector<HTMLFormElement>('[data-filtros]');
const grilla = document.querySelector<HTMLElement>('[data-grilla]');

if (form && grilla) {
  const celdas = [...grilla.querySelectorAll<HTMLElement>('.celda')];
  const contador = form.querySelector<HTMLElement>('[data-contador]');
  const vacio = document.querySelector<HTMLElement>('[data-vacio]');
  const zona = form.querySelector<HTMLSelectElement>('select[name="zona"]');
  const ritmos = ['a', 'b', 'c', 'd'];

  const leerUrl = () => {
    const p = new URLSearchParams(location.search);
    const tipo = p.get('tipo') ?? '';
    const radio = form.querySelector<HTMLInputElement>(`input[name="tipo"][value="${CSS.escape(tipo)}"]`);
    if (radio) radio.checked = true;
    if (zona) zona.value = [...zona.options].some((o) => o.value === p.get('zona')) ? (p.get('zona') ?? '') : '';
  };

  const aplicar = (actualizarUrl: boolean) => {
    const tipo = form.querySelector<HTMLInputElement>('input[name="tipo"]:checked')?.value ?? '';
    const z = zona?.value ?? '';
    let visibles = 0;
    for (const celda of celdas) {
      const tarjeta = celda.querySelector<HTMLElement>('[data-proyecto]');
      const okTipo = !tipo || (tarjeta?.dataset.tipos ?? '').split(' ').includes(tipo);
      const okZona = !z || tarjeta?.dataset.zona === z;
      const mostrar = okTipo && okZona;
      celda.hidden = !mostrar;
      if (mostrar) {
        celda.dataset.ritmo = ritmos[visibles % ritmos.length];
        visibles++;
      }
    }
    if (contador) {
      contador.textContent = `${visibles} ${visibles === 1 ? contador.dataset.singular : contador.dataset.plural}`;
    }
    if (vacio) vacio.hidden = visibles > 0;
    if (actualizarUrl) {
      const p = new URLSearchParams();
      if (tipo) p.set('tipo', tipo);
      if (z) p.set('zona', z);
      const q = p.toString();
      history.replaceState(null, '', q ? `?${q}` : location.pathname);
    }
  };

  form.hidden = false;
  leerUrl();
  aplicar(false);
  form.addEventListener('change', () => aplicar(true));
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    aplicar(true);
  });
  document.querySelector('[data-limpiar]')?.addEventListener('click', () => {
    form.reset();
    aplicar(true);
  });
}
