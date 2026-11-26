import type { Idioma } from './sitio';

/** Textos de interfaz. El contenido largo vive en las colecciones. */
export const UI = {
  es: {
    saltar: 'Saltar al contenido',
    menu: 'Menú',
    cerrar: 'Cerrar',
    inicio: 'Inicio',
    proyectos: 'Proyectos',
    servicios: 'Servicios',
    estudio: 'Estudio',
    promociones: 'Promociones',
    journal: 'Journal',
    contacto: 'Contacto',
    pedirValoracion: 'Pedir valoración',
    presupuesto: 'Presupuesto',
    whatsapp: 'WhatsApp',
    llamar: 'Llamar',
    escribenos: 'Escríbenos',
    idiomaOtro: 'English',
    idiomaOtroCorto: 'EN',
    navPrincipal: 'Navegación principal',
    verProyecto: 'Ver proyecto',
    verTodos: 'Ver todos los proyectos',
    leerMas: 'Leer artículo',
    zona: 'Zona',
    tipo: 'Tipo',
    anio: 'Año',
    superficie: 'Superficie',
    duracion: 'Duración',
    estado: 'Estado',
    obraTerminada: 'Obra terminada',
    render: 'Render',
    legal: 'Legal',
    derechos: 'Todos los derechos reservados.',
    migas: 'Ruta de navegación',
  },
  en: {
    saltar: 'Skip to content',
    menu: 'Menu',
    cerrar: 'Close',
    inicio: 'Home',
    proyectos: 'Projects',
    servicios: 'Services',
    estudio: 'Studio',
    promociones: 'For sale',
    journal: 'Journal (ES)',
    contacto: 'Contact',
    pedirValoracion: 'Request a consultation',
    presupuesto: 'Enquiry',
    whatsapp: 'WhatsApp',
    llamar: 'Call',
    escribenos: 'Write to us',
    idiomaOtro: 'Español',
    idiomaOtroCorto: 'ES',
    navPrincipal: 'Main navigation',
    verProyecto: 'View project',
    verTodos: 'View all projects',
    leerMas: 'Read article',
    zona: 'Area',
    tipo: 'Type',
    anio: 'Year',
    superficie: 'Area size',
    duracion: 'Duration',
    estado: 'Status',
    obraTerminada: 'Completed',
    render: 'Render',
    legal: 'Legal',
    derechos: 'All rights reserved.',
    migas: 'Breadcrumb',
  },
} as const satisfies Record<Idioma, Record<string, string>>;

export const TIPOS = {
  'reforma-integral': { es: 'Reforma integral', en: 'Full renovation' },
  interiorismo: { es: 'Interiorismo', en: 'Interior design' },
  'obra-nueva': { es: 'Obra nueva', en: 'New build' },
} as const;

export type TipoProyecto = keyof typeof TIPOS;

/** Rutas de cada servicio por idioma. */
export const RUTAS_SERVICIO: Record<TipoProyecto, Record<Idioma, string>> = {
  'reforma-integral': { es: '/reformas-integrales-madrid/', en: '/en/full-renovations-madrid/' },
  interiorismo: { es: '/estudio-interiorismo-madrid/', en: '/en/interior-design-madrid/' },
  'obra-nueva': { es: '/proyectos-obra-nueva-madrid/', en: '/en/new-build-madrid/' },
};

export const RUTAS = {
  es: {
    inicio: '/',
    proyectos: '/nuestras-creaciones/',
    proyecto: (slug: string) => `/nuestras-creaciones/${slug}/`,
    estudio: '/estudio-arquitectura-madrid/',
    promociones: '/promociones/',
    journal: '/blog/',
    contacto: '/contacto/',
    valoracion: '/pedir-valoracion/',
    gracias: '/gracias/',
  },
  en: {
    inicio: '/en/',
    proyectos: '/en/projects/',
    proyecto: (slug: string) => `/en/projects/${slug}/`,
    estudio: '/en/studio/',
    promociones: '/promociones/',
    journal: '/blog/',
    contacto: '/en/contact/',
    valoracion: '/en/contact/#presupuesto',
    gracias: '/en/thank-you/',
  },
} as const;

export const ZONAS_EN: Record<string, string> = {
  'Barrio de Salamanca': 'Salamanca district',
  'Centro de Madrid': 'Central Madrid',
  'Madrid Río': 'Madrid Río',
  Retiro: 'Retiro',
  Madrid: 'Madrid',
  'Esteban de Arteaga': 'Esteban de Arteaga',
  'Pozuelo de Alarcón': 'Pozuelo de Alarcón',
};

export function slug(texto: string): string {
  return texto
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[’']/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

export function numero(n: number): string {
  return String(n).padStart(2, '0');
}

export function fecha(d: Date, idioma: Idioma = 'es'): string {
  return d.toLocaleDateString(idioma === 'es' ? 'es-ES' : 'en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
}
