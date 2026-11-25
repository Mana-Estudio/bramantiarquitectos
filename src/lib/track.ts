// Medición de eventos. A propósito vacío: listo para conectar la herramienta que elija el cliente
// (por ejemplo Plausible, Fathom o un endpoint propio) sin tocar los componentes.
//
// Cada CTA lleva data-evento="..." (y opcionalmente data-evento-detalle="...").
// Ejemplos de eventos: whatsapp, llamar, email, presupuesto, formulario-paso-2, formulario-enviado.

export type DatosEvento = Record<string, string | number | boolean | undefined>;

export function track(evento: string, datos: DatosEvento = {}): void {
  // Conectar acá. Ejemplo:
  // window.plausible?.(evento, { props: datos });
  void evento;
  void datos;
}

/** Escucha los clics en cualquier elemento con data-evento. Se llama una vez desde el layout. */
export function escucharEventos(): void {
  document.addEventListener(
    'click',
    (e) => {
      const el = (e.target as Element | null)?.closest<HTMLElement>('[data-evento]');
      if (!el) return;
      track(el.dataset.evento ?? 'clic', { detalle: el.dataset.eventoDetalle, pagina: location.pathname });
    },
    { passive: true },
  );
}
