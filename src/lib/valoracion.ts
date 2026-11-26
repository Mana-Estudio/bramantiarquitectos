// Presupuestador ("Pedir valoración"): réplica mejorada del formulario de Tally que usa el estudio.
// Una sola definición para la página (dibuja el asistente) y para el Worker (valida y arma el mail).
// Sin dependencias: corre en Astro y en Cloudflare Workers.

export type Interes = 'reforma-integral' | 'obra-nueva' | 'interiorismo';

export interface Opcion {
  valor: string;
  etiqueta: string;
  detalle?: string;
  /** Color de muestra (paleta de colores). */
  muestra?: string;
}

interface Base {
  id: string;
  etiqueta: string;
  ayuda?: string;
  requerido?: boolean;
  /** Solo se muestra si otro campo tiene alguno de estos valores. */
  si?: { campo: string; valores: string[] };
}
export type Campo =
  | (Base & { tipo: 'texto' | 'email' | 'tel' | 'area'; placeholder?: string; autocomplete?: string; max?: number })
  | (Base & { tipo: 'numero'; placeholder?: string; min: number; max: number; unidad?: string })
  | (Base & { tipo: 'contador'; min: number; max: number; inicial: number })
  | (Base & { tipo: 'opcion' | 'multiple'; opciones: Opcion[]; columnas?: 1 | 2 | 3; tarjetas?: boolean })
  | (Base & { tipo: 'archivos' })
  | (Base & { tipo: 'casilla' });

export interface Paso {
  id: string;
  titulo: string;
  descripcion?: string;
  /** Si existe, el paso solo aparece para estos intereses. */
  caminos?: Interes[];
  campos: Campo[];
}

const interesa = [
  { valor: 'si', etiqueta: 'Me interesa' },
  { valor: 'no', etiqueta: 'No me interesa' },
  { valor: 'no-se', etiqueta: 'No lo sé' },
];

export const PASOS: Paso[] = [
  {
    id: 'inicio',
    titulo: 'Empecemos por lo básico',
    descripcion: 'Contesta en menos de 3 minutos y te prepararemos una propuesta ajustada a tu caso, sin compromiso.',
    campos: [
      { id: 'nombre', tipo: 'texto', etiqueta: '¿Cómo te llamas?', requerido: true, autocomplete: 'name', placeholder: 'Tu nombre', max: 120 },
      {
        id: 'interes',
        tipo: 'opcion',
        etiqueta: '¿En qué tienes interés?',
        requerido: true,
        tarjetas: true,
        columnas: 3,
        opciones: [
          { valor: 'reforma-integral', etiqueta: 'Reforma integral', detalle: 'Pisos y viviendas completas' },
          { valor: 'obra-nueva', etiqueta: 'Proyecto de obra nueva', detalle: 'Viviendas unifamiliares' },
          { valor: 'interiorismo', etiqueta: 'Propuesta de interiorismo', detalle: 'Luz, materia y mobiliario' },
        ],
      },
    ],
  },

  // ---------- Reforma integral ----------
  {
    id: 'reforma-situacion',
    caminos: ['reforma-integral'],
    titulo: '¿Cuál es tu situación?',
    descripcion: 'Elige todas las que encajen con tu caso.',
    campos: [
      {
        id: 'situacion',
        tipo: 'multiple',
        etiqueta: 'Mi situación',
        requerido: true,
        columnas: 2,
        opciones: [
          { valor: 'construida', etiqueta: 'Ya tengo o he encontrado mi vivienda construida' },
          { valor: 'remodelar', etiqueta: 'Tengo mi vivienda y la quiero remodelar' },
          { valor: 'desde-cero', etiqueta: 'Quiero hacer mi casa desde cero' },
          { valor: 'otras', etiqueta: 'Otras opciones' },
        ],
      },
      {
        id: 'situacionOtras',
        tipo: 'multiple',
        etiqueta: 'Otras opciones',
        si: { campo: 'situacion', valores: ['otras'] },
        columnas: 2,
        opciones: [
          { valor: 'buscando', etiqueta: 'Estoy buscando mi vivienda' },
          { valor: 'vender', etiqueta: 'Quiero reacondicionar mi inmueble para venderlo mejor' },
          { valor: 'domotizar', etiqueta: 'Tengo mi vivienda y la quiero domotizar' },
          { valor: 'profesional', etiqueta: 'Soy profesional y necesito apoyo en mi proyecto' },
        ],
      },
    ],
  },
  {
    id: 'reforma-inmueble',
    caminos: ['reforma-integral'],
    titulo: 'Cuéntanos sobre el inmueble',
    campos: [
      {
        id: 'tenencia',
        tipo: 'opcion',
        etiqueta: '¿Ya tienes la vivienda?',
        requerido: true,
        columnas: 2,
        opciones: [
          { valor: 'tengo', etiqueta: 'Ya tengo mi vivienda' },
          { valor: 'senalada', etiqueta: 'La he señalado (pendiente de compra)' },
        ],
      },
      { id: 'direccion', tipo: 'texto', etiqueta: 'Dirección o zona', requerido: true, placeholder: 'Calle o barrio, Madrid', autocomplete: 'street-address', max: 160 },
      { id: 'metros', tipo: 'numero', etiqueta: 'Metros de la vivienda', requerido: true, min: 10, max: 5000, unidad: 'm²', placeholder: '120' },
      {
        id: 'planta',
        tipo: 'opcion',
        etiqueta: 'Planta',
        columnas: 3,
        opciones: [
          { valor: 'exenta', etiqueta: 'Vivienda exenta' },
          { valor: 'bajo', etiqueta: 'Bajo' },
          { valor: '1', etiqueta: '1.ª planta' },
          { valor: '2', etiqueta: '2.ª planta' },
          { valor: '3', etiqueta: '3.ª planta o más' },
          { valor: 'atico', etiqueta: 'Ático' },
          { valor: 'otro', etiqueta: 'Otro' },
        ],
      },
      { id: 'plantaOtra', tipo: 'texto', etiqueta: '¿Cuál?', si: { campo: 'planta', valores: ['otro'] }, max: 120 },
      { id: 'antiguedad', tipo: 'texto', etiqueta: 'Antigüedad del edificio', placeholder: 'Ej.: años 30, 1975…', max: 60 },
    ],
  },
  {
    id: 'reforma-actual',
    caminos: ['reforma-integral'],
    titulo: '¿Cómo es hoy?',
    descripcion: 'La distribución actual de la vivienda.',
    campos: [
      { id: 'dormitoriosActuales', tipo: 'contador', etiqueta: 'Dormitorios', min: 0, max: 12, inicial: 2 },
      { id: 'banosActuales', tipo: 'contador', etiqueta: 'Baños', min: 0, max: 8, inicial: 1 },
      {
        id: 'tieneHoy',
        tipo: 'multiple',
        etiqueta: 'Tiene…',
        columnas: 3,
        opciones: [
          { valor: 'cocina', etiqueta: 'Cocina independiente' },
          { valor: 'salon', etiqueta: 'Salón' },
          { valor: 'terraza', etiqueta: 'Terraza' },
        ],
      },
    ],
  },
  {
    id: 'reforma-deseada',
    caminos: ['reforma-integral'],
    titulo: '¿Cómo te gustaría que fuera?',
    descripcion: 'Lo que tienes en mente para la nueva distribución (sujeto a viabilidad técnica).',
    campos: [
      { id: 'dormitoriosNuevos', tipo: 'contador', etiqueta: 'Dormitorios', min: 0, max: 12, inicial: 2 },
      { id: 'banosNuevos', tipo: 'contador', etiqueta: 'Baños', min: 0, max: 8, inicial: 2 },
      {
        id: 'cocinaNueva',
        tipo: 'opcion',
        etiqueta: 'Cocina',
        columnas: 3,
        opciones: [
          { valor: 'abierta', etiqueta: 'Abierta' },
          { valor: 'cerrada', etiqueta: 'Cerrada' },
          { valor: 'sin-preferencia', etiqueta: 'Sin preferencia' },
        ],
      },
      {
        id: 'salonNuevo',
        tipo: 'opcion',
        etiqueta: 'Salón',
        columnas: 3,
        opciones: [
          { valor: 'mas-grande', etiqueta: 'Más grande' },
          { valor: 'similar', etiqueta: 'Similar' },
          { valor: 'integrado', etiqueta: 'Integrado en la cocina' },
        ],
      },
      {
        id: 'terrazaNueva',
        tipo: 'opcion',
        etiqueta: 'Terraza',
        columnas: 2,
        opciones: [
          { valor: 'quiero', etiqueta: 'Quiero terraza' },
          { valor: 'no', etiqueta: 'No la necesito' },
        ],
      },
    ],
  },
  {
    id: 'reforma-instalaciones',
    caminos: ['reforma-integral'],
    titulo: 'Instalaciones y extras',
    campos: [
      {
        id: 'instalaciones',
        tipo: 'opcion',
        etiqueta: 'Electricidad y fontanería',
        columnas: 2,
        opciones: [
          { valor: 'buen-estado', etiqueta: 'En buen estado' },
          { valor: 'sustituir', etiqueta: 'A sustituir' },
        ],
      },
      {
        id: 'climatizacion',
        tipo: 'opcion',
        etiqueta: 'Climatización',
        columnas: 2,
        opciones: [
          { valor: 'buen-estado', etiqueta: 'En buen estado' },
          { valor: 'sustituir', etiqueta: 'A sustituir' },
        ],
      },
      {
        id: 'interiorismoExtra',
        tipo: 'opcion',
        etiqueta: '¿Te interesa una propuesta especializada de interiorismo?',
        columnas: 2,
        opciones: [
          { valor: 'si', etiqueta: 'Me interesa' },
          { valor: 'no', etiqueta: 'No me interesa' },
        ],
      },
      {
        id: 'financiacion',
        tipo: 'opcion',
        etiqueta: 'Financiación',
        columnas: 2,
        opciones: [
          { valor: 'necesito', etiqueta: 'Necesito financiación' },
          { valor: 'no', etiqueta: 'No la necesito' },
        ],
      },
    ],
  },
  {
    id: 'reforma-presupuesto',
    caminos: ['reforma-integral'],
    titulo: '¿Qué inversión tienes prevista?',
    descripcion: 'Una franja orientativa nos ayuda a plantear una propuesta realista. No es un compromiso.',
    campos: [
      {
        id: 'presupuestoReforma',
        tipo: 'opcion',
        etiqueta: 'Presupuesto estimado',
        requerido: true,
        tarjetas: true,
        columnas: 2,
        opciones: [
          { valor: '15-50', etiqueta: '15.000 – 50.000 €' },
          { valor: '50-80', etiqueta: '50.000 – 80.000 €' },
          { valor: '80-150', etiqueta: '80.000 – 150.000 €' },
          { valor: 'mas-150', etiqueta: 'Más de 150.000 €' },
        ],
      },
    ],
  },

  // ---------- Interiorismo ----------
  {
    id: 'int-vivienda',
    caminos: ['interiorismo'],
    titulo: 'Cuéntanos sobre la vivienda',
    campos: [
      {
        id: 'estadoVivienda',
        tipo: 'opcion',
        etiqueta: 'Estado de la vivienda',
        requerido: true,
        columnas: 3,
        opciones: [
          { valor: 'habito', etiqueta: 'Vivo en ella' },
          { valor: 'senalada', etiqueta: 'Señalada (pendiente de compra)' },
          { valor: 'otro', etiqueta: 'Otro' },
        ],
      },
      { id: 'estadoOtro', tipo: 'texto', etiqueta: 'Cuéntanos', si: { campo: 'estadoVivienda', valores: ['otro'] }, max: 160 },
      { id: 'direccion', tipo: 'texto', etiqueta: 'Dirección o zona', requerido: true, placeholder: 'Calle o barrio, Madrid', autocomplete: 'street-address', max: 160 },
      { id: 'metros', tipo: 'numero', etiqueta: 'Metros de la vivienda', requerido: true, min: 10, max: 5000, unidad: 'm²', placeholder: '90' },
      {
        id: 'plantaInt',
        tipo: 'opcion',
        etiqueta: 'Planta',
        columnas: 3,
        opciones: [
          { valor: '1', etiqueta: '1.ª planta' },
          { valor: '2', etiqueta: '2.ª planta' },
          { valor: '3', etiqueta: '3.ª planta o más' },
          { valor: 'atico', etiqueta: 'Ático' },
          { valor: 'duplex', etiqueta: 'Dúplex' },
          { valor: 'otro', etiqueta: 'Otro' },
        ],
      },
      { id: 'antiguedad', tipo: 'texto', etiqueta: 'Antigüedad del edificio', placeholder: 'Ej.: años 30, 1975…', max: 60 },
    ],
  },
  {
    id: 'int-estilo',
    caminos: ['interiorismo'],
    titulo: 'Tu estilo',
    campos: [
      {
        id: 'linea',
        tipo: 'opcion',
        etiqueta: 'Línea artística',
        columnas: 3,
        opciones: [
          { valor: 'minimalista', etiqueta: 'Minimalista · moderna' },
          { valor: 'industrial', etiqueta: 'Industrial' },
          { valor: 'art-deco', etiqueta: 'Art déco · tradicional' },
          { valor: 'escandinava', etiqueta: 'Escandinava' },
          { valor: 'japandi', etiqueta: 'Japandi' },
          { valor: 'tropical', etiqueta: 'Tropical' },
          { valor: 'mediterranea', etiqueta: 'Mediterránea · naturalista' },
          { valor: 'eclectica', etiqueta: 'Ecléctica' },
          { valor: 'ninguna', etiqueta: 'No encajo en ninguna' },
        ],
      },
      {
        id: 'paleta',
        tipo: 'opcion',
        etiqueta: 'Paleta de colores',
        columnas: 3,
        opciones: [
          { valor: 'neutra', etiqueta: 'Neutra', muestra: 'linear-gradient(90deg,#f1ede6,#cfc8bd,#8f877c)' },
          { valor: 'calida', etiqueta: 'Cálida', muestra: 'linear-gradient(90deg,#f0dcc2,#c9915f,#8a5a3a)' },
          { valor: 'fria', etiqueta: 'Fría', muestra: 'linear-gradient(90deg,#e3e9ee,#9fb2c1,#4f6577)' },
          { valor: 'contrastada', etiqueta: 'Contrastada', muestra: 'linear-gradient(90deg,#f4f1ec,#1c1a17)' },
          { valor: 'natural', etiqueta: 'Natural · terrosa', muestra: 'linear-gradient(90deg,#e6dcc8,#a89070,#6b5a3e)' },
          { valor: 'a-definir', etiqueta: 'A definir con vosotros', muestra: 'linear-gradient(90deg,#e8e2d9,#e8e2d9)' },
        ],
      },
      { id: 'sensacion', tipo: 'area', etiqueta: '¿Cómo quieres que se sienta tu casa?', requerido: true, placeholder: 'Serena, luminosa, cálida para recibir…', max: 1500 },
    ],
  },
  {
    id: 'int-alcance',
    caminos: ['interiorismo'],
    titulo: 'Alcance de la propuesta',
    campos: [
      { id: 'texturas', tipo: 'opcion', etiqueta: 'Estudio de texturas', columnas: 3, opciones: interesa },
      { id: 'iluminacion', tipo: 'opcion', etiqueta: 'Estudio de iluminación', columnas: 3, opciones: interesa },
      {
        id: 'cocinaInt',
        tipo: 'opcion',
        etiqueta: 'Cocina',
        columnas: 3,
        opciones: [
          { valor: 'no-intervenir', etiqueta: 'No intervenir' },
          { valor: 'estetico', etiqueta: 'Cambio estético sin obra' },
          { valor: 'valorar', etiqueta: 'A valorar' },
        ],
      },
    ],
  },
  {
    id: 'int-presupuesto',
    caminos: ['interiorismo'],
    titulo: '¿Qué inversión tienes prevista?',
    descripcion: 'Una franja orientativa para la propuesta de interiorismo. No es un compromiso.',
    campos: [
      {
        id: 'presupuestoInt',
        tipo: 'opcion',
        etiqueta: 'Presupuesto aproximado',
        requerido: true,
        tarjetas: true,
        columnas: 2,
        opciones: [
          { valor: 'menos-3', etiqueta: 'Menos de 3.000 €' },
          { valor: '3-5', etiqueta: '3.000 – 5.000 €' },
          { valor: '5-10', etiqueta: '5.000 – 10.000 €' },
          { valor: 'mas-10', etiqueta: 'Más de 10.000 €' },
        ],
      },
    ],
  },

  // ---------- Obra nueva ----------
  {
    id: 'on-solar',
    caminos: ['obra-nueva'],
    titulo: 'Cuéntanos sobre el solar',
    campos: [
      {
        id: 'estadoSolar',
        tipo: 'opcion',
        etiqueta: 'Estado del solar',
        requerido: true,
        columnas: 3,
        opciones: [
          { valor: 'tengo', etiqueta: 'Ya tengo mi solar' },
          { valor: 'identificado', etiqueta: 'Identificado (pendiente de compra)' },
          { valor: 'otros', etiqueta: 'Otros' },
        ],
      },
      { id: 'solarOtro', tipo: 'texto', etiqueta: 'Cuéntanos', si: { campo: 'estadoSolar', valores: ['otros'] }, max: 160 },
      { id: 'direccionSolar', tipo: 'texto', etiqueta: 'Dirección o zona del solar', requerido: true, placeholder: 'Municipio o urbanización', max: 160 },
      { id: 'metrosParcela', tipo: 'numero', etiqueta: 'Metros de la parcela', requerido: true, min: 50, max: 100000, unidad: 'm²', placeholder: '700' },
      {
        id: 'proyectoBasico',
        tipo: 'opcion',
        etiqueta: 'Proyecto básico',
        columnas: 2,
        opciones: [
          { valor: 'tengo', etiqueta: 'Ya lo tengo' },
          { valor: 'no', etiqueta: 'Todavía no' },
        ],
      },
      {
        id: 'licencia',
        tipo: 'opcion',
        etiqueta: 'Licencia de obra nueva',
        columnas: 3,
        opciones: [
          { valor: 'concedida', etiqueta: 'Concedida' },
          { valor: 'tramite', etiqueta: 'En trámite' },
          { valor: 'no', etiqueta: 'No tengo' },
        ],
      },
    ],
  },
  {
    id: 'on-casa',
    caminos: ['obra-nueva'],
    titulo: 'La casa que quieres',
    campos: [
      { id: 'dormitoriosOn', tipo: 'contador', etiqueta: 'Dormitorios', min: 1, max: 12, inicial: 4 },
      { id: 'banosOn', tipo: 'contador', etiqueta: 'Baños', min: 1, max: 10, inicial: 3 },
      {
        id: 'cocinaOn',
        tipo: 'opcion',
        etiqueta: '¿Cocina abierta al salón?',
        columnas: 3,
        opciones: [
          { valor: 'si', etiqueta: 'Sí' },
          { valor: 'no', etiqueta: 'No' },
          { valor: 'otros', etiqueta: 'Otra idea' },
        ],
      },
      { id: 'cocinaOnOtro', tipo: 'texto', etiqueta: 'Cuéntanos tu idea', si: { campo: 'cocinaOn', valores: ['otros'] }, max: 200 },
      {
        id: 'extrasOn',
        tipo: 'multiple',
        etiqueta: 'Me interesa…',
        columnas: 3,
        opciones: [
          { valor: 'terraza', etiqueta: 'Terraza' },
          { valor: 'piscina', etiqueta: 'Piscina' },
          { valor: 'jardin', etiqueta: 'Jardín' },
        ],
      },
    ],
  },
  {
    id: 'on-presupuesto',
    caminos: ['obra-nueva'],
    titulo: '¿Qué inversión tienes prevista?',
    descripcion: 'Una franja orientativa para la construcción. No es un compromiso.',
    campos: [
      {
        id: 'presupuestoOn',
        tipo: 'opcion',
        etiqueta: 'Presupuesto aproximado',
        requerido: true,
        tarjetas: true,
        columnas: 1,
        opciones: [
          { valor: '300-500', etiqueta: '300.000 – 500.000 €' },
          { valor: '500-800', etiqueta: '500.000 – 800.000 €' },
          { valor: 'mas-800', etiqueta: 'Más de 800.000 €' },
        ],
      },
    ],
  },

  // ---------- Contacto ----------
  {
    id: 'contacto',
    titulo: '¿Dónde te enviamos la propuesta?',
    descripcion: 'Te respondemos personalmente, por email o por teléfono.',
    campos: [
      { id: 'email', tipo: 'email', etiqueta: 'Tu mejor email', requerido: true, autocomplete: 'email', placeholder: 'nombre@dominio.com', max: 160 },
      { id: 'telefono', tipo: 'tel', etiqueta: 'Tu teléfono', requerido: true, autocomplete: 'tel', placeholder: '+34 600 000 000', max: 30 },
      { id: 'mensaje', tipo: 'area', etiqueta: '¿Algo más que debamos saber?', placeholder: 'Plazos, ideas, lo que te preocupa…', max: 3000 },
      {
        id: 'archivos',
        tipo: 'archivos',
        etiqueta: 'Planos, fotos o referencias (opcional)',
        ayuda: 'Si tienes referencias, planos o cualquier documento, podremos darte una mejor respuesta. PDF o imágenes, hasta 8 MB en total.',
      },
      {
        id: 'privacidad',
        tipo: 'casilla',
        etiqueta: 'He leído y acepto la política de privacidad y consiento el tratamiento de mis datos para gestionar mi solicitud.',
        requerido: true,
      },
      {
        id: 'comunicaciones',
        tipo: 'casilla',
        etiqueta: 'Acepto recibir comunicaciones informativas sobre las actividades, productos o servicios del estudio.',
      },
    ],
  },
];

export const ARCHIVOS = {
  maxArchivos: 5,
  maxBytes: 8 * 1024 * 1024,
  tipos: ['application/pdf', 'image/jpeg', 'image/png', 'image/webp', 'image/heic', 'image/heif'],
  aceptar: '.pdf,.jpg,.jpeg,.png,.webp,.heic,.heif',
};

export const INTERESES: Record<Interes, string> = {
  'reforma-integral': 'Reforma integral',
  'obra-nueva': 'Proyecto de obra nueva',
  interiorismo: 'Propuesta de interiorismo',
};

export function pasosPara(interes: Interes | '' | undefined): Paso[] {
  return PASOS.filter((p) => !p.caminos || (interes && p.caminos.includes(interes)));
}

// ---------------------------------------------------------------------------
// Validación (Worker)
// ---------------------------------------------------------------------------
type Valores = Record<string, string[]>;

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const TELEFONO = /^[+()\d\s.-]{9,20}$/;
const limpiar = (v: string, max = 500) => v.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').trim().slice(0, max);

export interface Respuesta {
  campo: Campo;
  valores: string[];
}
export type ResultadoValoracion =
  | { ok: true; interes: Interes; nombre: string; email: string; telefono: string; respuestas: { paso: Paso; respuestas: Respuesta[] }[]; comunicaciones: boolean }
  | { ok: false; errores: string[] };

const visible = (campo: Campo, valores: Valores) => !campo.si || (valores[campo.si.campo] ?? []).some((v) => campo.si!.valores.includes(v));

export function validarValoracion(entrada: Valores): ResultadoValoracion {
  const errores: string[] = [];
  const interes = (entrada.interes?.[0] ?? '') as Interes;
  if (!(interes in INTERESES)) return { ok: false, errores: ['interes'] };

  const respuestasPorPaso: { paso: Paso; respuestas: Respuesta[] }[] = [];
  for (const paso of pasosPara(interes)) {
    const respuestas: Respuesta[] = [];
    for (const campo of paso.campos) {
      if (campo.tipo === 'archivos' || !visible(campo, entrada)) continue;
      const crudos = (entrada[campo.id] ?? []).map((v) => limpiar(v, 'max' in campo && campo.max ? campo.max : 500)).filter(Boolean);
      let valores = crudos;
      if (campo.tipo === 'opcion' || campo.tipo === 'multiple') {
        const validas = new Set(campo.opciones.map((o) => o.valor));
        valores = crudos.filter((v) => validas.has(v));
        if (campo.tipo === 'opcion') valores = valores.slice(0, 1);
        if (valores.length !== crudos.length) errores.push(campo.id);
      } else if (campo.tipo === 'numero' || campo.tipo === 'contador') {
        valores = crudos.slice(0, 1);
        const n = Number(valores[0]);
        if (valores.length && (!Number.isFinite(n) || n < campo.min || n > campo.max)) errores.push(campo.id);
      } else if (campo.tipo === 'email') {
        if (valores[0] && !EMAIL.test(valores[0])) errores.push(campo.id);
      } else if (campo.tipo === 'tel') {
        if (valores[0] && !TELEFONO.test(valores[0])) errores.push(campo.id);
      } else if (campo.tipo === 'casilla') {
        valores = crudos.slice(0, 1).filter((v) => v === 'si' || v === 'on');
      } else {
        valores = valores.slice(0, 1);
      }
      if (campo.requerido && valores.length === 0) errores.push(campo.id);
      if (valores.length) respuestas.push({ campo, valores });
    }
    respuestasPorPaso.push({ paso, respuestas });
  }

  if (errores.length) return { ok: false, errores: [...new Set(errores)] };
  const valor = (id: string) => entrada[id]?.[0] ? limpiar(entrada[id][0], 160) : '';
  return {
    ok: true,
    interes,
    nombre: valor('nombre'),
    email: valor('email').toLowerCase(),
    telefono: valor('telefono'),
    respuestas: respuestasPorPaso,
    comunicaciones: Boolean(entrada.comunicaciones?.length),
  };
}

/** Texto del aviso para el estudio, ordenado por pasos y con las etiquetas legibles. */
export function resumenValoracion(r: Extract<ResultadoValoracion, { ok: true }>, extra: string[] = []): string {
  const lineas: string[] = [`Solicitud de valoración · ${INTERESES[r.interes]}`, ''];
  for (const { paso, respuestas } of r.respuestas) {
    const utiles = respuestas.filter((x) => x.campo.tipo !== 'casilla');
    if (!utiles.length) continue;
    lineas.push(`== ${paso.titulo}`);
    for (const { campo, valores } of utiles) {
      let texto = valores.join(', ');
      if (campo.tipo === 'opcion' || campo.tipo === 'multiple') {
        texto = valores.map((v) => campo.opciones.find((o) => o.valor === v)?.etiqueta ?? v).join(', ');
      } else if (campo.tipo === 'numero' && campo.unidad) {
        texto = `${valores[0]} ${campo.unidad}`;
      }
      lineas.push(`${campo.etiqueta.replace(/[?¿]/g, '').trim()}: ${texto}`);
    }
    lineas.push('');
  }
  lineas.push(`Acepta comunicaciones comerciales: ${r.comunicaciones ? 'sí' : 'no'}`);
  lineas.push(...extra);
  return lineas.join('\n');
}
