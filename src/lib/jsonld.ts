import { SITIO } from './sitio';

const ID_ESTUDIO = `${SITIO.url}/#estudio`;

/** ProfessionalService en todo el sitio. Sin AggregateRating propio (Google no lo admite para el propio negocio). */
export function estudio(logoUrl: string, imagenUrl?: string) {
  return {
    '@context': 'https://schema.org',
    '@type': 'ProfessionalService',
    '@id': ID_ESTUDIO,
    name: SITIO.nombre,
    legalName: SITIO.razonSocial,
    url: `${SITIO.url}/`,
    logo: logoUrl,
    image: imagenUrl ?? logoUrl,
    email: SITIO.email,
    telephone: SITIO.telefono.replace(/\s/g, ''),
    address: {
      '@type': 'PostalAddress',
      streetAddress: SITIO.direccion.calle,
      postalCode: SITIO.direccion.cp,
      addressLocality: SITIO.direccion.ciudad,
      addressRegion: SITIO.direccion.region,
      addressCountry: SITIO.direccion.pais,
    },
    geo: { '@type': 'GeoCoordinates', latitude: SITIO.geo.lat, longitude: SITIO.geo.lng },
    areaServed: { '@type': 'City', name: 'Madrid' },
    knowsAbout: ['Reformas integrales', 'Interiorismo', 'Obra nueva', 'Passivhaus', 'Domótica'],
    sameAs: [SITIO.instagram],
    parentOrganization: { '@type': 'Organization', name: 'Grupo Bramanti', url: SITIO.grupo },
  };
}

export function migas(items: { nombre: string; url: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((it, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: it.nombre,
      item: new URL(it.url, SITIO.url).href,
    })),
  };
}

export function obra(p: {
  nombre: string;
  descripcion: string;
  url: string;
  imagen: string;
  zona: string;
  anio?: number;
  idioma: 'es' | 'en';
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'CreativeWork',
    name: p.nombre,
    description: p.descripcion,
    url: new URL(p.url, SITIO.url).href,
    image: p.imagen,
    inLanguage: p.idioma === 'es' ? 'es-ES' : 'en',
    creator: { '@id': ID_ESTUDIO },
    locationCreated: { '@type': 'Place', name: `${p.zona}, Madrid` },
    ...(p.anio ? { dateCreated: String(p.anio) } : {}),
  };
}

export function articulo(a: {
  titulo: string;
  descripcion: string;
  url: string;
  imagen?: string;
  publicado: Date;
  actualizado?: Date;
}) {
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: a.titulo,
    description: a.descripcion,
    mainEntityOfPage: new URL(a.url, SITIO.url).href,
    ...(a.imagen ? { image: a.imagen } : {}),
    datePublished: a.publicado.toISOString(),
    dateModified: (a.actualizado ?? a.publicado).toISOString(),
    inLanguage: 'es-ES',
    author: { '@type': 'Organization', name: SITIO.nombre, url: `${SITIO.url}/` },
    publisher: { '@id': ID_ESTUDIO },
  };
}

export function preguntas(items: { pregunta: string; respuesta: string }[]) {
  return {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((f) => ({
      '@type': 'Question',
      name: f.pregunta,
      acceptedAnswer: { '@type': 'Answer', text: f.respuesta },
    })),
  };
}
