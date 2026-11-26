# Pendientes · Bramanti Arquitectos

Lo que falta para pasar de la demo a producción. Donde no había un dato, la demo usa un valor por defecto y queda anotado acá. Nada se inventó: precios, años, m², apellidos y reseñas salen de la web actual o del brief.

## Para pedirle al cliente

### Fotos y marca
- [ ] **Fotos originales en alta** de todos los proyectos y promociones. Las de la demo vienen de la biblioteca de WordPress y son solo para la presentación privada.
- [ ] **Qué imágenes son renders.** Hoy los 10 proyectos figuran como "obra terminada" (no se pudo deducir) y Los Satélites y Proyecto Omega como "render".
- [ ] **Crédito fotográfico.** Los archivos de Casa Felipe II llevan el nombre de un fotógrafo en el nombre del archivo; confirmar si quieren mostrar el crédito (el campo `fotografo` ya existe).
- [ ] **Logo en vector (SVG).** La demo usa los PNG actuales (`Group-11115.png` blanco y `Group-11116.png` negro).
- [ ] Aprobar el **favicon nuevo** (la "B" de Archivo, la familia del logotipo, sobre tinta). El de la web actual sigue siendo el de la marca anterior.
- [ ] **Descripciones de fotos (alt).** Muchas imágenes no tenían texto alternativo en WordPress: en proyectos y promociones llevan uno genérico ("Casa X: cocina tras la reforma", unas 30 apariciones) y en el journal, el título del artículo con "(imagen n)" (40). Lo ideal es describir cada foto al recibir los originales.

### Equipo y estudio
- [ ] **Equipo:** apellidos, cargos, fotos y una bio corta. Solo se sabe que Adrián es arquitecto y que Antonio forma parte del equipo (por las reseñas). En la página de Estudio hay placeholders marcados "Foto y bio pendientes".
- [ ] **Horario** del estudio y del showroom, y si las visitas son con cita. No se publica hasta tenerlo.
- [ ] **Tiempo de respuesta** a las consultas: la página de gracias no promete plazos.
- [ ] Confirmar la **relación con Grupo Bramanti** (el footer y Estudio enlazan a grupobramanti.com con el texto de la web actual).
- [ ] **Referencias** de webs que les gustan y **lo que no quieren** (falta en el brief).

### Contenido
- [ ] **Casa Elara:** su página actual dice que está en venta por 1.599.000 €. En la demo está en el portfolio con un aviso "a la venta" sin precio. ¿La sumamos también a Promociones?
- [ ] **Precios y disponibilidad** de las promociones: Casa Silva (1.140.000 €) y Proyecto Omega (1.650.000 €) muestran el precio de la web actual. Confirmar que siguen vigentes.
- [ ] **Los Satélites:** la web actual se contradice (los contadores dicen 5 dormitorios y 3 baños; un texto dice seis habitaciones y cuatro baños). En la demo los datos destacados usan 5 y 3; el texto migrado quedó como estaba.
- [ ] **Franjas de inversión** del formulario: se usan las de su página de reformas (50.000–89.999 € y 90.000–119.999 €) más "menos de 50.000" y "120.000 o más". Una FAQ dice "a partir de aproximadamente 35.000 €". Confirmar cuál vale.
- [ ] **Antes/después:** en Casa Felipe II las fotos "antes" no indican la estancia, así que los pares del slider se armaron en orden. Revisar que coincidan. Elara y Werlyb se emparejaron por estancia.
- [ ] Datos que faltan en algunas fichas (solo se muestran si existen): año de Casa Elara, Santos Dumont y Werlyb… y m² de los proyectos más antiguos.
- [ ] **Inglés:** revisar la traducción (home, 3 servicios, Estudio, Contacto y los 10 proyectos). La hizo Maná; los relatos largos (Elara, Santos Dumont) están resumidos. Confirmar si quieren mantener el inglés.
- [ ] **Videos con la marca anterior:** en YouTube, "Proyecto Werlyb", "Proyecto Alcalá" (Casa Silva) y "Proyecto Omega" llevan el nombre de la marca anterior en el título y en la miniatura. En la web se usan títulos y portadas propios, pero al reproducirlos YouTube muestra su título y, probablemente, la cortinilla del video. Hay que renombrarlos en el canal y, si es posible, reexportarlos sin la marca anterior.
- [ ] **Permisos de los testimonios:** "Mi nueva casa" es un video del canal de Jorge Casanovas (@werlyb), y la opinión en video (`casa-werlyb-opinion.mp4`, migrado de la web actual y alojado en la nueva) lo muestra con su nombre. Confirmar que se pueden seguir usando.
- [ ] **Equipo en los videos:** en el video de Casa Werlyb aparece "Marta Varela, Arquitecta". No figura en el brief: confirmar si forma parte del equipo para sumarla a la página de Estudio.
- [ ] **Videos nuevos:** cualquier video nuevo se suma en `src/content/videos.json` (ver README). Si tienen versiones en mejor calidad o portadas propias, mejor que las fotos de proyecto que se usan hoy como portada.
- [ ] **Reseñas:** la web actual no guarda el enlace de cada reseña; todas enlazan a la ficha de Google del estudio. Confirmar que se pueden mostrar con nombre.
- [ ] **Journal:** hay artículos con datos fechados (2024, "otoño 2025", ayudas del Plan Rehabilita). Revisar cuáles actualizar. Las categorías se simplificaron a Arquitectura, Construcción e Interiorismo.
- [ ] **Video de Casa Felipe II:** la miniatura de YouTube lleva la marca de agua "Veo" (herramienta de video con IA de Google) y el video tiene subtítulos incrustados. Confirmar si es un video generado o retocado con IA; si lo es, conviene indicarlo o sustituirlo por un recorrido real. En la web se usa con portada propia y, en la home, como vista previa silenciosa.
- [ ] **Video "render" de obra nueva** (`obra-nueva-render.mp4`, migrado de la web actual): no se sabe de qué proyecto es. Se muestra con la etiqueta "Render" en la home y en Obra nueva. Confirmar proyecto y si es render o grabación.
- [ ] **Fotos del hero:** el carrusel de la home usa salón de Felipe II, salón de Werlyb, salón de Santos Dumont, cocina de Elara y cocina de Goya. La foto "Salon1_Alcala124" de la web actual parece un render y no se usó. Confirmar la selección (idealmente con los originales en alta).
- [ ] **Presupuestador (sustituye a Tally):** replica las preguntas del formulario de Tally (https://tally.so/r/9q7DyY) con caminos por interés (reforma, interiorismo, obra nueva). Revisar:
  - Las **franjas de inversión** del presupuestador son las de Tally (15.000–50.000 €, 50.000–80.000 €, 80.000–150.000 €, más de 150.000 €) y no coinciden con las del formulario de contacto ni con la FAQ (ver punto anterior). Unificar.
  - El aviso de privacidad de Tally nombra un domicilio distinto (C/ Azcona 20, 3º B) al de la web (Calle de Alcalá, 229). Confirmar cuál es el domicilio del responsable del tratamiento.
  - Cuando la web nueva esté en producción, **desactivar el formulario de Tally** o cambiar sus enlaces (Instagram, Google, firmas de mail) por `/pedir-valoracion/`.
  - En inglés no hay presupuestador: el botón lleva al formulario de contacto. Decidir si se traduce.
- [ ] **Newsletter "Ecos de Bramanti":** la web actual tiene un botón; no se migró. ¿Sigue activa?
- [ ] **Redes:** la página de Facebook sigue con el nombre de la marca anterior y por eso no se enlaza. Existe también la cuenta de Instagram anterior. Conviene renombrarlas o cerrarlas.

### Legal
- [ ] **Revisión legal** de la política de privacidad (se reescribió la sección 6: encargados Cloudflare y proveedor de mail, sin cookies de Google) y de la política de cookies (reescrita: la web nueva no usa cookies de terceros). Revisar también el criterio para YouTube: en general el reproductor solo se carga cuando la persona pulsa reproducir (la web lo avisa debajo de cada bloque de videos), **salvo las vistas previas silenciosas de Casa Felipe II y Casa Werlyb en la home**, que en ordenador cargan `youtube-nocookie.com` al entrar en pantalla, sin clic ni banner. Las políticas ya lo explican, pero hay que validar que no requiera consentimiento previo; si lo requiere, poner `VISTAS_PREVIAS_YOUTUBE = false` en `src/components/paginas/Inicio.astro` y quedan las fotos.
- [ ] El **presupuestador** guarda un borrador en el `localStorage` del navegador (14 días, se borra al enviar) y admite adjuntos (planos y fotos, hasta 5 archivos y 8 MB) que llegan por mail. Está explicado en cookies y privacidad; validarlo en la revisión legal.
- [ ] Confirmar el **proveedor de envío de mail** para nombrarlo en la política (por defecto, Resend).
- [ ] Aviso legal y términos: se migraron tal cual. Verificar datos registrales.

## Para Maná (técnico)

- [ ] **Cloudflare:** crear el Worker `bramantiarquitectos`, conectarlo al repo (Workers Builds), publicar staging en `bramanti.manaestudio.ar` y protegerlo con **Access** (mails de Maná y del cliente).
- [ ] **Turnstile:** crear el widget; la site key va como `PUBLIC_TURNSTILE_SITE_KEY` en el build y el secreto con `npx wrangler secret put TURNSTILE_SECRET`. Hoy se usan las claves públicas de prueba.
- [ ] **Resend:** cuenta, verificar el dominio `bramantiarquitectos.com` (SPF/DKIM en DNS), `npx wrangler secret put RESEND_API_KEY` y ajustar `MAIL_FROM` en `wrangler.jsonc`. Claves en Bitwarden.
- [ ] **Cloudflare Web Analytics:** token en `PUBLIC_CF_ANALYTICS_TOKEN`.
- [ ] Conectar `src/lib/track.ts` con la herramienta de medición que elija el cliente (si quiere algo más que Web Analytics).
- [ ] **Resend y adjuntos:** el presupuestador manda los planos como adjuntos (hasta 8 MB en total, por debajo del límite de 40 MB de Resend). Probar un envío real con archivos al conectar Resend.
- [ ] Repetir **Lighthouse** sobre staging real (detrás de Access) y con las fotos definitivas.
- [ ] **Producción:** dominio a nombre del cliente, DNS en Cloudflare, build con `ENTORNO=produccion` (quita el noindex), SSL, alta en UptimeRobot, enviar el sitemap nuevo a Search Console y vigilar los 301 las primeras semanas.
- [ ] La plantilla `mana-template-astro` no existía: esta base (Astro 7 + Workers + `_headers` + noindex de staging) puede servir para crearla.
