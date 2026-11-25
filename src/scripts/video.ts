// Fachada de YouTube: al pulsar la portada se cambia por el reproductor (modo sin cookies hasta reproducir).
// Hasta ese momento la página no pide nada a YouTube.
document.addEventListener('click', (e) => {
  const enlace = (e.target as Element | null)?.closest<HTMLAnchorElement>('a[data-youtube]');
  if (!enlace || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const id = enlace.dataset.youtube;
  if (!id || !/^[\w-]{11}$/.test(id)) return;
  e.preventDefault();

  const iframe = document.createElement('iframe');
  iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&rel=0&playsinline=1`;
  iframe.title = enlace.dataset.titulo ?? 'Video';
  iframe.allow = 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share';
  iframe.allowFullscreen = true;
  iframe.referrerPolicy = 'strict-origin-when-cross-origin';

  // Copia clases y atributos de estilo (los estilos con alcance de Astro usan data-astro-cid-*).
  const marco = document.createElement('div');
  const fuera = ['href', 'target', 'rel', 'aria-label', 'data-youtube', 'data-titulo', 'data-evento', 'data-evento-detalle'];
  for (const atributo of [...enlace.attributes]) {
    if (!fuera.includes(atributo.name)) marco.setAttribute(atributo.name, atributo.value);
  }
  marco.append(iframe);
  enlace.replaceWith(marco);
  iframe.focus();
});
