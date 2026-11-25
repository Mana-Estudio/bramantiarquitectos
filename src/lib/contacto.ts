// Definición y validación del formulario de presupuesto. La usan el formulario (opciones)
// y el Worker de /api/contacto (validación en servidor). Sin dependencias.

export const TIPOS_CONSULTA = {
  'reforma-integral': { es: 'Reforma integral', en: 'Full renovation' },
  interiorismo: { es: 'Interiorismo', en: 'Interior design' },
  'obra-nueva': { es: 'Obra nueva', en: 'New build' },
  promocion: { es: 'Compra de vivienda', en: 'Buying a home' },
  otro: { es: 'Otro', en: 'Other' },
} as const;

export const PLAZOS = {
  ya: { es: 'Lo antes posible', en: 'As soon as possible' },
  '3-6': { es: 'En 3–6 meses', en: 'In 3–6 months' },
  '6-12': { es: 'En 6–12 meses', en: 'In 6–12 months' },
  despues: { es: 'Más adelante', en: 'Later on' },
  'no-se': { es: 'Aún no lo sé', en: 'Not sure yet' },
} as const;

// Franjas orientativas publicadas por el estudio en /reformas-integrales-madrid/ (no son precios).
export const INVERSIONES = {
  'menos-50': { es: 'Menos de 50.000 €', en: 'Under €50,000' },
  '50-90': { es: '50.000 – 89.999 €', en: '€50,000 – €89,999' },
  '90-120': { es: '90.000 – 119.999 €', en: '€90,000 – €119,999' },
  'mas-120': { es: '120.000 € o más', en: '€120,000 or more' },
  'sin-indicar': { es: 'Prefiero no indicarlo', en: 'I prefer not to say' },
} as const;

export interface Consulta {
  tipo: keyof typeof TIPOS_CONSULTA;
  zona: string;
  superficie?: string;
  plazo: keyof typeof PLAZOS;
  inversion?: keyof typeof INVERSIONES;
  nombre: string;
  email: string;
  telefono: string;
  mensaje?: string;
  proyecto?: string;
  idioma: 'es' | 'en';
  pagina?: string;
}

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^[+()\d\s.-]{9,20}$/;

function texto(v: unknown, max: number): string {
  return typeof v === 'string' ? v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max) : '';
}

export type Resultado = { ok: true; consulta: Consulta } | { ok: false; errores: string[] };

export function validarConsulta(datos: Record<string, unknown>): Resultado {
  const errores: string[] = [];
  const tipo = texto(datos.tipo, 30);
  const plazo = texto(datos.plazo, 20);
  const inversion = texto(datos.inversion, 20);
  const consulta: Consulta = {
    tipo: tipo as Consulta['tipo'],
    zona: texto(datos.zona, 120),
    superficie: texto(datos.superficie, 10) || undefined,
    plazo: plazo as Consulta['plazo'],
    inversion: (inversion || undefined) as Consulta['inversion'],
    nombre: texto(datos.nombre, 120),
    email: texto(datos.email, 160).toLowerCase(),
    telefono: texto(datos.telefono, 30),
    mensaje: texto(datos.mensaje, 4000) || undefined,
    proyecto: texto(datos.proyecto, 120) || undefined,
    idioma: datos.idioma === 'en' ? 'en' : 'es',
    pagina: texto(datos.pagina, 200) || undefined,
  };

  if (!(tipo in TIPOS_CONSULTA)) errores.push('tipo');
  if (consulta.zona.length < 2) errores.push('zona');
  if (consulta.superficie && !/^\d{1,5}$/.test(consulta.superficie)) errores.push('superficie');
  if (!(plazo in PLAZOS)) errores.push('plazo');
  if (inversion && !(inversion in INVERSIONES)) errores.push('inversion');
  if (consulta.nombre.length < 2) errores.push('nombre');
  if (!EMAIL.test(consulta.email)) errores.push('email');
  if (!TELEFONO.test(consulta.telefono)) errores.push('telefono');
  if (datos.consentimiento !== 'si' && datos.consentimiento !== 'on') errores.push('consentimiento');

  return errores.length ? { ok: false, errores } : { ok: true, consulta };
}

/** Texto plano del aviso para el estudio. */
export function resumenConsulta(c: Consulta): string {
  const lineas = [
    `Tipo de proyecto: ${TIPOS_CONSULTA[c.tipo].es}`,
    `Zona: ${c.zona}`,
    `Superficie aproximada: ${c.superficie ? `${c.superficie} m²` : '—'}`,
    `Plazo: ${PLAZOS[c.plazo].es}`,
    `Inversión prevista: ${c.inversion ? INVERSIONES[c.inversion].es : '—'}`,
    c.proyecto ? `Proyecto de referencia: ${c.proyecto}` : null,
    '',
    `Nombre: ${c.nombre}`,
    `Email: ${c.email}`,
    `Teléfono: ${c.telefono}`,
    '',
    'Mensaje:',
    c.mensaje ?? '—',
    '',
    `Idioma: ${c.idioma} · Página: ${c.pagina ?? '—'}`,
  ];
  return lineas.filter((l) => l !== null).join('\n');
}
