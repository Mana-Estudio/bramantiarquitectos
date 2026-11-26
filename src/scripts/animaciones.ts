// Animaciones al hacer scroll con Motion (motion.dev, la librería antes llamada Framer Motion).
// Se usa animateMini (Web Animations API, muy liviano) + inView + scroll + stagger.
// Atributos:
//   data-anim="subir"      aparece subiendo
//   data-anim="escalonar"  sus hijos aparecen uno tras otro
//   data-anim="imagen"     la imagen se revela con un recorte y un zoom suave
//   data-contar="7"        número que cuenta hasta el valor (data-prefijo="+")
//   data-parallax          se desplaza un poco más lento que el scroll
//   data-progreso          barra que se llena según lo leído
// Todo se apaga con prefers-reduced-motion. El contenido nunca queda oculto si el JS no carga:
// el estado inicial (opacity 0) solo aplica cuando este script agrega la clase .anim al <html>.
import { animateMini as animate, inView, scroll, stagger } from 'motion';

const reducir = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
const curva = [0.22, 0.61, 0.36, 1] as [number, number, number, number];

if (!reducir) {
  const raiz = document.documentElement;
  const enPantalla = (el: Element) => {
    const r = el.getBoundingClientRect();
    return r.top < window.innerHeight && r.bottom > 0;
  };

  // Lo que ya está a la vista al cargar no se esconde (sin parpadeos).
  for (const el of document.querySelectorAll('[data-anim]')) {
    if (enPantalla(el)) el.setAttribute('data-anim-visto', '');
  }
  raiz.classList.add('anim');

  const aparecer = (objetivo: Element | Element[], retraso: number | ReturnType<typeof stagger> = 0) =>
    animate(objetivo, { opacity: [0, 1], transform: ['translateY(30px)', 'translateY(0)'] }, { duration: 0.9, ease: curva, delay: retraso });

  inView(
    '[data-anim="subir"]:not([data-anim-visto])',
    (el) => {
      el.setAttribute('data-anim-visto', '');
      aparecer(el);
    },
    { margin: '0px 0px -12% 0px' },
  );

  inView(
    '[data-anim="escalonar"]:not([data-anim-visto])',
    (el) => {
      el.setAttribute('data-anim-visto', '');
      aparecer([...el.children], stagger(0.09));
    },
    { margin: '0px 0px -10% 0px' },
  );

  inView(
    '[data-anim="imagen"]:not([data-anim-visto])',
    (el) => {
      el.setAttribute('data-anim-visto', '');
      animate(el, { opacity: [0, 1], clipPath: ['inset(14% 0% 0% 0%)', 'inset(0% 0% 0% 0%)'] }, { duration: 1.2, ease: curva });
      const img = el.querySelector('img');
      if (img) animate(img, { transform: ['scale(1.14)', 'scale(1)'] }, { duration: 1.8, ease: curva });
    },
    { margin: '0px 0px -8% 0px' },
  );

  // Contadores: el número final ya está en el HTML; acá solo se anima la cuenta.
  inView('[data-contar]', (el) => {
    const nodo = el as HTMLElement;
    const fin = Number(nodo.dataset.contar);
    const prefijo = nodo.dataset.prefijo ?? '';
    if (!Number.isFinite(fin) || fin <= 0) return;
    const duracion = 1400;
    const inicio = performance.now();
    const paso = (ahora: number) => {
      const t = Math.min(1, (ahora - inicio) / duracion);
      const suave = 1 - Math.pow(1 - t, 3);
      nodo.textContent = `${prefijo}${Math.round(fin * suave)}`;
      if (t < 1) requestAnimationFrame(paso);
    };
    requestAnimationFrame(paso);
  });

  for (const el of document.querySelectorAll<HTMLElement>('[data-parallax]')) {
    const objetivo = el.closest('section') ?? el;
    scroll(animate(el, { transform: ['translateY(0%)', 'translateY(12%)'] }, { ease: 'linear' }), { target: objetivo, offset: ['start start', 'end start'] });
  }

  const barra = document.querySelector<HTMLElement>('[data-progreso]');
  if (barra) scroll(animate(barra, { transform: ['scaleX(0)', 'scaleX(1)'] }, { ease: 'linear' }));
}
