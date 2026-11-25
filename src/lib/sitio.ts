// Datos del estudio. Todo lo que aparece acá está verificado en la web actual o en el brief.
// Lo que falta (horario, apellidos del equipo, etc.) está en PENDIENTES.md: no lo inventes.

export const SITIO = {
  nombre: 'Bramanti Arquitectos',
  razonSocial: 'Bramantia Index, S.L.',
  nif: 'B19657360',
  url: 'https://bramantiarquitectos.com',
  email: 'info@bramantiarquitectos.com',
  telefono: '+34 613 074 520',
  telefonoHref: 'tel:+34613074520',
  whatsapp: '34613074520',
  direccion: {
    calle: 'Calle de Alcalá, 229',
    cp: '28028',
    ciudad: 'Madrid',
    region: 'Comunidad de Madrid',
    pais: 'ES',
  },
  // Coordenadas del edificio (OpenStreetMap).
  geo: { lat: 40.430206, lng: -3.6649381 },
  comoLlegar: 'https://www.google.com/maps/dir/?api=1&destination=Calle%20de%20Alcal%C3%A1%20229%2C%2028028%20Madrid',
  fichaGoogle: 'https://www.google.com/maps/search/?api=1&query=Google&query_place_id=ChIJRb2lHIInQg0R9c62UDdKpl8',
  instagram: 'https://www.instagram.com/bramantiarquitectos/',
  grupo: 'https://grupobramanti.com/',
  colaboraciones: ['Casa Decor', 'Real Fábrica de Tapices'],
  trayectoria: 'Más de 7 años',
} as const;

export type Idioma = 'es' | 'en';

/** Enlace de WhatsApp con texto precargado. */
export function whatsapp(texto: string): string {
  return `https://wa.me/${SITIO.whatsapp}?text=${encodeURIComponent(texto)}`;
}

export const TEXTO_WHATSAPP = {
  es: 'Hola, os escribo desde la web de Bramanti Arquitectos. Me gustaría hablar de mi proyecto.',
  en: 'Hello, I am writing from the Bramanti Arquitectos website. I would like to talk about my project.',
} as const;
