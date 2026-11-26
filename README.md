# Bramanti Arquitectos · web nueva

Web de [Bramanti Arquitectos](https://bramantiarquitectos.com) hecha por Maná Estudio: Astro 7 estático sobre Cloudflare Workers, con el contenido migrado desde el WordPress actual, las mismas URLs (y 301 para las viejas), formulario propio con WhatsApp y versión en inglés.

> Las fotos son las de la web actual y se usan solo para la demo privada. Antes de publicar se reemplazan por los originales del cliente (ver [PENDIENTES.md](PENDIENTES.md)).

## Requisitos

- Node 22.23 o superior (probado con Node 26) y npm.
- Para el formulario en local: `wrangler` (viene en las dependencias).

## Cómo correrlo

```bash
npm install
npm run dev          # desarrollo en http://localhost:4321
npm run build        # genera dist/ (por defecto como staging: noindex)
npm run preview      # sirve dist/ sin el Worker
npm run check        # astro check (tipos y plantillas)
npm run verificar-urls   # compara dist/ y _redirects con el sitemap de la web actual
```

Para probar el formulario de punta a punta (sitio + Worker de `/api/contacto`):

```bash
cp .dev.vars.example .dev.vars   # claves de PRUEBA de Turnstile, no son secretos
npm run build
npx wrangler dev                 # http://localhost:8787
```

Sin `RESEND_API_KEY` el Worker no envía mails: los muestra en la consola de `wrangler dev`.

## Estructura

```
src/
  content/            Contenido editable (Markdown y JSON, validado con zod en content.config.ts)
    proyectos/        Un .md por proyecto · proyectos/en/ = traducción al inglés
    promociones/      Viviendas en venta (cada una con su URL actual)
    servicios/es|en/  Textos de Reformas integrales, Interiorismo y Obra nueva
    journal/          Los 40 artículos migrados (URL en la raíz: /<slug>/)
    legales/          Aviso legal, privacidad, cookies, términos
    faqs.json         Preguntas frecuentes (con su ámbito: general, contacto, interiorismo…)
    videos.json       Videos (YouTube o mp4 propio) y en qué páginas aparecen
    resenas.json      Reseñas de Google migradas
  assets/             Fotos (proyectos/, promociones/, journal/, paginas/) y logo (marca/)
  components/         Piezas reutilizables · components/paginas/ = páginas completas en es/en
  layouts/Base.astro  <head>, SEO, JSON-LD, header, footer y barra móvil
  lib/                Datos del estudio (sitio.ts), textos de interfaz (i18n.ts), rutas es↔en,
                      JSON-LD, validación del formulario, preguntas del presupuestador
                      (valoracion.ts), envío de mail y medición
  pages/              Rutas. Las URLs de la web actual se mantienen tal cual
  scripts/            JS de cliente: menú, filtros, lightbox, antes/después, formulario, presupuestador,
                      hero, carruseles, animaciones (Motion) y microinteracciones
  styles/global.css   Tokens, tipografía y utilidades
worker/index.ts       Worker de Cloudflare: POST /api/contacto y POST /api/valoracion (Turnstile + mail con adjuntos)
public/               _headers (CSP y seguridad), _redirects (301), favicon, videos/ (mp4 propios)
scripts/              migrar-wp.mjs y verificar-urls.mjs
```

## Cómo agregar un proyecto

1. Crear la carpeta de fotos `src/assets/proyectos/<nombre-corto>/` con nombres descriptivos en kebab-case (`casa-ejemplo-salon-01.jpg`, `casa-ejemplo-antes-cocina-01.jpg`). Con 1600–2000 px de ancho alcanza: Astro genera AVIF/WebP y todos los tamaños.
2. Crear `src/content/proyectos/<slug>.md`. El nombre del archivo es la URL: `/nuestras-creaciones/<slug>/`.

```markdown
---
nombre: "Casa Ejemplo"
subtitulo: "Reforma integral en Chamberí"            # opcional
descripcion: "Texto para Google, máximo 155 caracteres."
resumen: "Una o dos frases para tarjetas y la cabecera de la ficha."
zona: "Chamberí"
tipos: ["reforma-integral", "interiorismo"]          # reforma-integral | interiorismo | obra-nueva
tipoTexto: "Reforma integral e interiorismo"
anio: 2025                                          # opcional: solo si es un dato confirmado
superficie: "120 m²"                                # opcional
duracion: "4 meses"                                 # opcional
fotografo: "Nombre Apellido"                        # opcional
estado: "obra terminada"                            # o "render"
destacado: true                                     # aparece en la home
orden: 11
portada: "../../assets/proyectos/casa-ejemplo/casa-ejemplo-salon-01.jpg"
portadaAlt: "Salón de Casa Ejemplo con… (describir la foto)"
galeria:
  - src: "../../assets/proyectos/casa-ejemplo/casa-ejemplo-cocina-01.jpg"
    alt: "Cocina abierta con isla de madera"
    estancia: "cocina"
antes: []                                           # fotos del estado previo (mismo formato)
comparaciones: []                                   # pares para el slider antes/después
---

## El origen

Relato del proyecto en Markdown. Cada `##` es un bloque. Una foto suelta en su propio párrafo
se muestra a ancho completo dentro del relato:

![Detalle de la carpintería a medida](../../assets/proyectos/casa-ejemplo/casa-ejemplo-detalle-01.jpg)
```

3. Opcional, versión en inglés: `src/content/proyectos/en/<slug>.md` con `descripcion`, `resumen`, `tipoTexto`, `portadaAlt` (y `subtitulo`, `zona`) más el relato traducido. Si no existe, el proyecto solo se publica en español.
4. `npm run build` valida todo (campos obligatorios, rutas de fotos, largo de la descripción).

Las promociones funcionan igual en `src/content/promociones/` (con el campo `url`, que define su dirección) y los artículos en `src/content/journal/`.

## Cómo agregar un video

Los videos viven en `src/content/videos.json`. Cada uno aparece solo en las páginas con las que está relacionado.

1. Guardar una portada en `src/assets/videos/` (una foto del proyecto o un fotograma; mejor sin textos encima).
2. Sumar una entrada a `videos.json`:

```json
{
  "id": "casa-ejemplo",
  "youtube": "ID_DE_11_CARACTERES",
  "titulo": "Casa Ejemplo, en vídeo",
  "tituloEn": "Casa Ejemplo on video",
  "descripcion": "Una frase sobre el video.",
  "descripcionEn": "One sentence about the video.",
  "poster": "../assets/videos/casa-ejemplo.jpg",
  "posterAlt": "Descripción de la portada",
  "posterAltEn": "Cover description",
  "formato": "horizontal",
  "proyecto": "casa-ejemplo-reforma-integral-madrid",
  "servicios": ["reforma-integral"],
  "destacado": false,
  "orden": 9
}
```

- `formato`: `horizontal` o `vertical` (shorts y videos grabados con el móvil).
- Relación: `proyecto`, `promocion` o `articulo` (el slug), `servicios` (sale en esas páginas de servicio), `paginas: ["estudio"]`, `testimonio: true` (va en el bloque "Lo cuenta quien vive aquí" de la ficha) y `destacado: true` (sale en la home).
- Para un video propio en lugar de YouTube: subir el `.mp4` a `public/videos/` (máximo 25 MB por archivo en Cloudflare) y usar `"archivo": "/videos/nombre.mp4"` en lugar de `"youtube"`.
- `"previa": true` (solo mp4 propios, cortos y sin sonido importante): el clip arranca en silencio y en bucle cuando entra en pantalla, con un botón de pausa. Es lo que se usa en el carrusel "Casas en movimiento" de la home. Conviene que pese menos de 7 MB.
- `"render": true`: muestra la etiqueta "Render" sobre el video.

Los videos de YouTube se muestran con la portada propia y el reproductor (`youtube-nocookie.com`) se carga recién al pulsar reproducir: la página no le pide nada a YouTube hasta entonces. Sin JS, la portada enlaza al video en YouTube.

**Excepción, la home:** las dos tarjetas grandes de "Creaciones recientes" (Casa Felipe II y Casa Werlyb) reproducen su video de YouTube en silencio, de fondo, como en la web actual. Solo en ordenador (pantalla de 60 rem o más con ratón), sin "ahorro de datos" ni "reducir movimiento", y solo cuando la tarjeta entra en pantalla. Se apaga con `VISTAS_PREVIAS_YOUTUBE = false` en `src/components/paginas/Inicio.astro` (ver PENDIENTES, revisión legal).

## Presupuestador (/pedir-valoracion/)

Sustituye al formulario de Tally de la web actual con las mismas preguntas, dentro del sitio y con la estética de la marca. Todos los botones "Pedir valoración" en español llevan aquí (en inglés, al formulario de contacto).

- **Preguntas:** `src/lib/valoracion.ts` es la única fuente. Define los pasos (`PASOS`), en qué camino aparece cada uno (`caminos`: `reforma`, `interiorismo`, `obra-nueva`), los campos (texto, email, teléfono, número, contador −/+, opción única, múltiple, archivos, casilla) y las preguntas condicionales (`si: { campo, valores }`). El componente, el script y el Worker leen de ahí, así que agregar o cambiar una pregunta es tocar solo ese archivo.
- **Cómo funciona:** un paso por pantalla con barra de progreso, avance automático en preguntas de una sola opción, Enter para seguir, errores en línea, resumen editable antes de enviar y borrador guardado en el navegador (14 días). Turnstile se carga recién en el último paso. Sin JS se ofrece el formulario de contacto.
- **Precarga:** `/pedir-valoracion/?servicio=reforma-integral` (o `interiorismo`, `obra-nueva`) elige el camino; `?proyecto=<slug>` se adjunta como referencia.
- **Envío:** `POST /api/valoracion` valida otra vez todo en el Worker (mismas reglas), comprueba Turnstile, honeypot y adjuntos (hasta 5 archivos, 8 MB en total, PDF o imágenes) y manda un mail ordenado por pasos con los archivos adjuntos y `reply-to` del cliente. Asunto: `Valoración web · <interés> · <nombre>`.

## Hero, animaciones y microinteracciones

- **Hero:** `src/components/HeroCarrusel.astro`. Carrusel a pantalla completa con el texto encima, pie con el proyecto de cada foto, puntos con barra de progreso y botón de pausa (se pausa solo fuera de pantalla o con la pestaña oculta; con "reducir movimiento" no avanza). Las diapositivas se eligen en `Inicio.astro` (`diapositivas`). La primera foto es la que carga con prioridad (LCP).
- **Animaciones:** [Motion](https://motion.dev) (`animateMini`, `inView`, `scroll`; ~4 KB gzip). Se activan con atributos en el HTML, sin tocar JS:
  - `data-anim="subir"` (aparece subiendo), `data-anim="escalonar"` (los hijos aparecen en cascada), `data-anim="imagen"` (la imagen se descubre).
  - `data-contar` en un número: cuenta desde 0 al entrar en pantalla.
  - `data-parallax` en una imagen: se desplaza suave con el scroll.
  - `data-progreso`: barra de lectura (scroll de la página).
- **Microinteracciones:** botones magnéticos y con "presión" al pulsar, subrayados animados en enlaces y menú, etiqueta que sigue al cursor sobre proyectos y videos (`data-cursor="Ver proyecto"`), copiar al portapapeles (`data-copiar="texto"`).
- Todo respeta `prefers-reduced-motion`: sin JS o con movimiento reducido, el contenido se ve completo y quieto.

## Cómo editar textos

| Qué | Dónde |
|---|---|
| Teléfono, mail, dirección, Instagram, colaboraciones | `src/lib/sitio.ts` |
| Home, Estudio, Contacto (es y en) | `src/components/paginas/Inicio.astro`, `Estudio.astro`, `Contacto.astro` |
| Servicios | `src/content/servicios/es/*.md` y `en/*.md` |
| Proceso (Inmersión → Obra y entrega) | `src/components/Proceso.astro` |
| Preguntas frecuentes | `src/content/faqs.json` (`ambitos` decide en qué página salen) |
| Reseñas | `src/content/resenas.json` |
| Textos legales | `src/content/legales/*.md` |
| Opciones del formulario (tipos, plazos, franjas de inversión) | `src/lib/contacto.ts` |
| Preguntas del presupuestador | `src/lib/valoracion.ts` |
| Fotos del hero de la home | `src/components/paginas/Inicio.astro` (`diapositivas`) |
| Menú, botones y etiquetas de interfaz | `src/lib/i18n.ts` |
| Videos | `src/content/videos.json` y portadas en `src/assets/videos/` |
| Tipografías (Archivo para títulos, la familia del logotipo; Manrope para texto) | `astro.config.mjs` (`fonts`) y escala en `src/styles/global.css` |

## Migración desde WordPress

`node scripts/migrar-wp.mjs` lee la API REST de la web actual (`/wp-json/wp/v2/`), recorre el HTML de Elementor y escribe las colecciones y las fotos. Opciones: `--solo=journal,proyectos,promociones,faqs,resenas,legales,paginas`, `--force` (vuelve a escribir los `.md`) y `--fresco` (ignora la caché local de la API).

Ojo: después de migrar se corrigieron a mano erratas, la política de cookies, la sección 6 de privacidad y las portadas. **`--force` pisa esas ediciones**: usarlo solo sobre una rama nueva y revisar el diff.

## Despliegue en Cloudflare

El sitio se publica como Worker con assets estáticos (`wrangler.jsonc`: assets en `./dist`, `not_found_handling: "404-page"`, y solo `/api/*` pasa por el Worker).

- **Build:** `npm run build` · **Deploy:** `npx wrangler deploy` (o Workers Builds conectado al repo).
- **Staging vs. producción:** todo build es de staging y agrega `X-Robots-Tag: noindex` a `_headers`. Solo el build de producción lleva `ENTORNO=produccion`.
- **Variables de build (públicas):** `SITE_URL`, `ENTORNO`, `PUBLIC_TURNSTILE_SITE_KEY` (si falta se usa la de prueba), `PUBLIC_CF_ANALYTICS_TOKEN` (si falta no se carga Web Analytics).
- **Variables del Worker (públicas, en `wrangler.jsonc`):** `MAIL_TO`, `MAIL_FROM`, `SITE_URL`.
- **Secretos del Worker (nunca al repo):**
  ```bash
  npx wrangler secret put TURNSTILE_SECRET
  npx wrangler secret put RESEND_API_KEY
  ```
  Los valores van en Bitwarden, no en este repo ni en el cerebro.

## Medición

Todos los CTA llevan `data-evento` (`whatsapp`, `llamar`, `email`, `presupuesto`, `formulario-enviado`…). `src/lib/track.ts` está vacío a propósito, listo para conectar la herramienta que elija el cliente. Cloudflare Web Analytics no usa cookies, así que no hace falta banner.

## Calidad (último control, 2026-11-25)

- `npm run build` y `astro check`: sin errores, warnings ni hints. `npx tsc -p worker/tsconfig.json`: limpio.
- `verificar-urls`: las 76 URLs del sitemap actual existen (63) o tienen 301 (13).
- Lighthouse móvil (contra `wrangler dev`, con el Worker y los `_headers` reales): Inicio 99/100/100, Pedir valoración 100/100/100, ficha de Casa Felipe II 98/100/100, Contacto 100/100/100 (rendimiento/accesibilidad/buenas prácticas). CLS 0 en todas; LCP de la home 1,4 s. El SEO marca 61–69 solo porque el build de staging manda `X-Robots-Tag: noindex` (a propósito); en producción ese punto desaparece.
- JS propio por página: Motion (`animateMini` + `inView` + `scroll`) suma unos 4 KB gzip; la home queda en ~14 KB gzip en total. Turnstile (≈ 28 KB) se carga solo al empezar el formulario de contacto o en el último paso del presupuestador.
- Presupuestador probado de punta a punta en `wrangler dev` (camino de reforma, validación por paso, adjunto PDF, Turnstile de prueba, mail simulado y redirección a /gracias/).
- WCAG 2.2 AA: skip link, foco visible, todo usable con teclado (menú y submenú con `<details>`, filtros, lightbox con `<dialog>`, slider con `<input type="range">`, carruseles con flechas y teclado), contraste AA verificado, objetivos de 44 px. El hero y los clips en movimiento tienen botón de pausa (2.2.2) y todo respeta `prefers-reduced-motion`.
