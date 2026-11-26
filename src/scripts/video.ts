// Videos: fachada de YouTube (el reproductor se carga solo al pulsar) y previas propias
// (clips sin sonido que se reproducen solos mientras están a la vista, con botón de pausa).

const reducirMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)');

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

// Previas propias: play al entrar en pantalla, pausa al salir. El botón deja pausarlas (WCAG 2.2.2).
const previas = [...document.querySelectorAll<HTMLElement>('[data-previa]')];
if (previas.length && 'IntersectionObserver' in window) {
  const pausadas = new WeakSet<HTMLVideoElement>();
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        const video = entrada.target.querySelector('video');
        if (!video) continue;
        if (entrada.isIntersecting && !pausadas.has(video) && !reducirMovimiento.matches) {
          if (video.preload === 'none') video.preload = 'auto';
          video.play().catch(() => {});
        } else {
          video.pause();
        }
      }
    },
    { threshold: 0.35 },
  );
  for (const previa of previas) {
    const video = previa.querySelector('video');
    const control = previa.querySelector<HTMLButtonElement>('[data-previa-control]');
    if (!video) continue;
    if (reducirMovimiento.matches) pausadas.add(video);
    const actualizar = () => {
      const enPausa = video.paused;
      control?.setAttribute('aria-pressed', String(enPausa));
      const texto = control?.querySelector('.visualmente-oculto');
      if (texto) texto.textContent = (enPausa ? control?.dataset.etiquetaPlay : control?.dataset.etiquetaPausa) ?? '';
    };
    video.addEventListener('play', actualizar);
    video.addEventListener('pause', actualizar);
    control?.addEventListener('click', () => {
      if (video.paused) {
        pausadas.delete(video);
        video.preload = 'auto';
        video.play().catch(() => {});
      } else {
        pausadas.add(video);
        video.pause();
      }
    });
    actualizar();
    observador.observe(previa);
  }
}

// Previas de YouTube en las tarjetas de proyecto (solo escritorio y con buena conexión),
// como en la home actual: el video corre de fondo, sin sonido, cuando la tarjeta está a la vista.
const conexion = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
const escritorio = window.matchMedia('(min-width: 60rem) and (hover: hover)');
const tarjetasVideo = [...document.querySelectorAll<HTMLElement>('[data-video-fondo]')];
if (tarjetasVideo.length && escritorio.matches && !reducirMovimiento.matches && !conexion?.saveData && 'IntersectionObserver' in window) {
  const observador = new IntersectionObserver(
    (entradas) => {
      for (const entrada of entradas) {
        if (!entrada.isIntersecting) continue;
        const marco = entrada.target as HTMLElement;
        observador.unobserve(marco);
        const id = marco.dataset.videoFondo;
        if (!id || !/^[\w-]{11}$/.test(id)) continue;
        const iframe = document.createElement('iframe');
        iframe.src = `https://www.youtube-nocookie.com/embed/${id}?autoplay=1&mute=1&loop=1&playlist=${id}&controls=0&disablekb=1&modestbranding=1&playsinline=1&rel=0&iv_load_policy=3`;
        iframe.title = marco.dataset.videoTitulo ?? 'Video';
        iframe.allow = 'autoplay; encrypted-media';
        iframe.tabIndex = -1;
        iframe.setAttribute('aria-hidden', 'true');
        iframe.className = 'video-fondo';
        // Se muestra recién cuando arrancó (y ya pasó el rótulo inicial de YouTube).
        iframe.addEventListener('load', () => setTimeout(() => iframe.classList.add('visible'), 2800), { once: true });
        marco.append(iframe);
      }
    },
    { rootMargin: '0px 0px -15% 0px' },
  );
  for (const t of tarjetasVideo) observador.observe(t);
}
