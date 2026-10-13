/**
 * Guatemala Departments and Zones / Sectors Mapping
 * Contains all 22 official departments of Guatemala with realistic,
 * authentic municipalities, zones, and popular residential/rental sectors.
 */

export const GUATEMALA_DEPARTMENTS_ONLY = [
  'Guatemala',
  'Sacatepéquez',
  'Quetzaltenango',
  'Chimaltenango',
  'Escuintla',
  'Sololá',
  'Petén',
  'Alta Verapaz',
  'Baja Verapaz',
  'Izabal',
  'Zacapa',
  'Chiquimula',
  'Santa Rosa',
  'Jutiapa',
  'Jalapa',
  'Suchitepéquez',
  'Retalhuleu',
  'San Marcos',
  'Huehuetenango',
  'Quiché',
  'Totonicapán',
  'El Progreso',
];

export const GUATEMALA_DEPARTMENTS = [
  'Todos',
  ...GUATEMALA_DEPARTMENTS_ONLY,
];

export const DEPARTMENT_ZONES_MAP = {
  Todos: [
    'Todas las zonas y sectores',
    'Zona 10 (Guatemala)',
    'Zona 14 (Guatemala)',
    'Zona 15 (Guatemala)',
    'Zona 16 (Guatemala)',
    'Zona 4 (Guatemala)',
    'Antigua Guatemala (Sacatepéquez)',
    'Mixco / San Cristóbal (Guatemala)',
    'Carretera a El Salvador (Guatemala)',
    'Xela Centro (Quetzaltenango)',
    'Panajachel (Sololá)',
    'Puerto San José (Escuintla)',
    'Isla de Flores (Petén)',
    'Cobán Centro (Alta Verapaz)',
  ],

  Guatemala: [
    'Todas las zonas',
    'Zona 1 (Centro Histórico)',
    'Zona 2 (Ciudad Nueva / Hipódromo)',
    'Zona 3',
    'Zona 4 (Cuatro Grados Norte)',
    'Zona 5 (Jardines de la Asunción)',
    'Zona 6',
    'Zona 7 (Kaminaljuyú / Landívar)',
    'Zona 8',
    'Zona 9 (Tívoli)',
    'Zona 10 (Zona Viva / Oakland)',
    'Zona 11 (Mariscal / Roosevelt / Miraflores)',
    'Zona 12 (La Reformita / USAC / El Carmen)',
    'Zona 13 (Aurora / Las Américas)',
    'Zona 14 (La Cañada / Europlaza)',
    'Zona 15 (Vista Hermosa I, II, III)',
    'Zona 16 (Cayalá / San Isidro / Kanajuyú)',
    'Zona 17 (Lomas del Norte)',
    'Zona 18 (Alameda / Pinares)',
    'Zona 21 (Justo Rufino Barrios / Nimajuyú)',
    'Carretera a El Salvador (Fraijanes / Santa Catarina)',
    'Mixco (San Cristóbal / Minervas / Naranjo)',
    'Villa Nueva (Bárcenas / Álamos / Metrosur)',
    'Santa Catarina Pinula (Muxbal / Puerta Parada)',
    'San José Pinula',
    'San Miguel Petapa (Villa Hermosa)',
    'Amatitlán',
    'Chinautla',
  ],

  Sacatepéquez: [
    'Todas las zonas / sectores',
    'Antigua Guatemala (Centro Histórico)',
    'Antigua Guatemala (San Pedro Las Huertas)',
    'Antigua Guatemala (San Felipe de Jesús)',
    'Antigua Guatemala (Santa Ana)',
    'Antigua Guatemala (San Bartolomé)',
    'Jocotenango',
    'San Lucas Sacatepéquez (Carretera Interamericana)',
    'Ciudad Vieja',
    'Pastores',
    'Santa María de Jesús',
    'Santiago Sacatepéquez',
    'San Bartolomé Milpas Altas',
    'Santo Domingo Xenacoj',
    'Alotenango',
    'San Miguel Dueñas',
  ],

  Quetzaltenango: [
    'Todas las zonas / sectores',
    'Zona 1 (Centro Histórico / Parque Central)',
    'Zona 2 (La Democracia)',
    'Zona 3 (Terminal / Minerva)',
    'Zona 4 (San Bartolomé)',
    'Zona 5 (Las Rosas)',
    'Zona 7 (Cipresales)',
    'Zona 8 (La Floresta)',
    'Zona 9 (Pradera Xela / Trigales)',
    'Zona 10 (Chicua)',
    'Salcajá',
    'La Esperanza',
    'Olintepeque',
    'Cantel',
    'Almolonga',
    'San Mateo',
    'Coatepeque',
  ],

  Chimaltenango: [
    'Todas las zonas / sectores',
    'Chimaltenango Centro',
    'El Tejar',
    'San Andrés Itzapa',
    'Tecpán Guatemala',
    'Patzicía',
    'Patzún',
    'Zaragoza',
    'Acatenango',
    'San Juan Comalapa',
    'Parramos',
    'Pochuta',
  ],

  Escuintla: [
    'Todas las zonas / sectores',
    'Escuintla Centro',
    'Puerto San José (Playas / Chalets)',
    'Puerto Quetzal / Likin',
    'Santa Lucía Cotzumalguapa',
    'Palín (Autopista)',
    'Iztapa (Canal / Bahía)',
    'Nueva Concepción',
    'Tiquisate',
    'Siquinalá',
    'La Gomera',
    'San Vicente Pacaya',
  ],

  Sololá: [
    'Todas las zonas / sectores',
    'Panajachel (Calle Santander / Embarcadero)',
    'Sololá Centro',
    'San Pedro La Laguna',
    'San Marcos La Laguna',
    'Santa Cruz La Laguna',
    'Santiago Atitlán',
    'San Juan La Laguna',
    'Santa Catarina Palopó',
    'San Antonio Palopó',
    'Nahualá',
    'Santa Clara La Laguna',
  ],

  Petén: [
    'Todas las zonas / sectores',
    'Isla de Flores (Malecón)',
    'Santa Elena',
    'San Benito',
    'El Remate (Lago Petén Itzá)',
    'Poptún',
    'San Francisco',
    'Sayaxché',
    'Melchor de Mencos',
    'San Andrés',
    'La Libertad',
  ],

  'Alta Verapaz': [
    'Todas las zonas / sectores',
    'Cobán Centro',
    'Cobán (Zona 1 a Zona 4)',
    'San Pedro Carchá',
    'San Juan Chamelco',
    'Santa Cruz Verapaz',
    'Tactic',
    'Lanquín (Semuc Champey)',
    'Chisec',
    'Tamahú',
  ],

  'Baja Verapaz': [
    'Todas las zonas / sectores',
    'Salamá Centro',
    'San Jerónimo',
    'Purulhá (Biotopo del Quetzal)',
    'Rabinal',
    'Cubulco',
    'Granados',
    'San Miguel Chicaj',
    'Santa Cruz El Chol',
  ],

  Izabal: [
    'Todas las zonas / sectores',
    'Puerto Barrios Centro',
    'Santo Tomás de Castilla',
    'Livingston',
    'Morales',
    'Río Dulce / Fronteras',
    'El Estor',
    'Los Amates (Quiriguá)',
  ],

  Zacapa: [
    'Todas las zonas / sectores',
    'Zacapa Centro',
    'Estanzuela',
    'Gualán',
    'Teculután',
    'Río Hondo',
    'Usumatlán',
    'Cabañas',
    'San Diego',
    'La Unión',
  ],

  Chiquimula: [
    'Todas las zonas / sectores',
    'Chiquimula Centro',
    'Esquipulas (Basílica)',
    'Jocotán',
    'Camotán',
    'Quetzaltepeque',
    'Ipala (Volcán y Laguna)',
    'San Jacinto',
    'Concepción Las Minas',
  ],

  'Santa Rosa': [
    'Todas las zonas / sectores',
    'Cuilapa Centro',
    'Barberena',
    'Chiquimulilla',
    'Monterrico (Playas)',
    'Guazacapán',
    'Taxisco',
    'San Rafael Las Flores',
    'Pueblo Nuevo Viñas',
    'Santa María Ixhuatán',
  ],

  Jutiapa: [
    'Todas las zonas / sectores',
    'Jutiapa Centro',
    'Asunción Mita',
    'Agua Blanca',
    'El Progreso Jutiapa',
    'Moyuta',
    'Santa Catarina Mita',
    'Pasaco',
    'Quesada',
    'Jalpatagua',
  ],

  Jalapa: [
    'Todas las zonas / sectores',
    'Jalapa Centro',
    'Mataquescuintla',
    'San Pedro Pinula',
    'Monjas',
    'San Luis Jilotepeque',
    'San Manuel Chaparrón',
    'San Carlos Alzatate',
  ],

  'Suchitepéquez': [
    'Todas las zonas / sectores',
    'Mazatenango Centro',
    'Cuyotenango',
    'San Bernardino',
    'Chicacao',
    'Patulul',
    'San Antonio Suchitepéquez',
    'Santo Domingo Suchitepéquez',
    'Santa Bárbara',
  ],

  Retalhuleu: [
    'Todas las zonas / sectores',
    'Retalhuleu Centro',
    'San Sebastián',
    'Santa Cruz Muluá (Área IRTRA)',
    'San Martín Zapotitlán',
    'El Asintal (Takalik Abaj)',
    'Champerico (Playa)',
    'Nuevo San Carlos',
  ],

  'San Marcos': [
    'Todas las zonas / sectores',
    'San Marcos Centro',
    'San Pedro Sacatepéquez',
    'Malacatán',
    'Tecún Umán (Frontera)',
    'Esquipulas Palo Gordo',
    'San Rafael Pie de la Cuesta',
    'Tacaná',
    'Tajumulco',
  ],

  Huehuetenango: [
    'Todas las zonas / sectores',
    'Huehuetenango Centro (Zonas 1-12)',
    'Chiantla (Los Cuchumatanes)',
    'Aguacatán',
    'Todos Santos Cuchumatán',
    'Barillas',
    'Jacaltenango',
    'San Pedro Necta',
    'La Democracia',
    'Soloma',
  ],

  'Quiché': [
    'Todas las zonas / sectores',
    'Santa Cruz del Quiché',
    'Chichicastenango (Mercado / Centro)',
    'Joyabaj',
    'Nebaj (Triángulo Ixil)',
    'Zacualpa',
    'Uspantán',
    'Cotzal',
    'Chajul',
    'Sacapulas',
  ],

  'Totonicapán': [
    'Todas las zonas / sectores',
    'Totonicapán Centro',
    'San Cristóbal Totonicapán',
    'San Francisco El Alto',
    'Santa María Chiquimula',
    'Momostenango',
    'San Andrés Xecul',
    'Santa Lucía La Reforma',
  ],

  'El Progreso': [
    'Todas las zonas / sectores',
    'Guastatoya Centro',
    'Sanarate',
    'El Jícaro',
    'Morazán',
    'San Agustín Acasaguastlán',
    'San Cristóbal Acasaguastlán',
    'San Antonio La Paz',
    'Sansare',
  ],
};

/**
 * Geographic coordinates and zoom levels for all 22 departments + national overview
 */
export const DEPARTMENT_COORDINATES = {
  Todos: { lat: 14.6349, lng: -90.5069, zoom: 8 },
  Guatemala: { lat: 14.6349, lng: -90.5069, zoom: 12 },
  Sacatepéquez: { lat: 14.5586, lng: -90.7295, zoom: 13 },
  Quetzaltenango: { lat: 14.8347, lng: -91.5181, zoom: 13 },
  Chimaltenango: { lat: 14.6611, lng: -90.8208, zoom: 12 },
  Escuintla: { lat: 14.3009, lng: -90.7858, zoom: 11 },
  Sololá: { lat: 14.7410, lng: -91.1560, zoom: 12 },
  Petén: { lat: 16.9248, lng: -89.8964, zoom: 10 },
  'Alta Verapaz': { lat: 15.4706, lng: -90.3708, zoom: 11 },
  'Baja Verapaz': { lat: 15.1028, lng: -90.3181, zoom: 11 },
  Izabal: { lat: 15.7278, lng: -88.5944, zoom: 10 },
  Zacapa: { lat: 14.9722, lng: -89.5306, zoom: 11 },
  Chiquimula: { lat: 14.7981, lng: -89.5458, zoom: 11 },
  'Santa Rosa': { lat: 14.2764, lng: -90.2986, zoom: 11 },
  Jutiapa: { lat: 14.2817, lng: -89.8958, zoom: 11 },
  Jalapa: { lat: 14.6339, lng: -89.9889, zoom: 11 },
  'Suchitepéquez': { lat: 14.5342, lng: -91.5033, zoom: 11 },
  Retalhuleu: { lat: 14.5361, lng: -91.6778, zoom: 11 },
  'San Marcos': { lat: 14.9639, lng: -91.7944, zoom: 11 },
  Huehuetenango: { lat: 15.3197, lng: -91.4708, zoom: 11 },
  'Quiché': { lat: 15.0306, lng: -91.1489, zoom: 11 },
  'Totonicapán': { lat: 14.9117, lng: -91.3611, zoom: 11 },
  'El Progreso': { lat: 14.8519, lng: -90.0189, zoom: 11 },
};

/**
 * High-precision geographic coordinates for prominent Guatemalan zones, sectors, and municipalities
 */
export const ZONE_COORDINATES = {
  // Guatemala City Zones
  'zona 1': { lat: 14.6393, lng: -90.5133, zoom: 14 },
  'zona 2': { lat: 14.6550, lng: -90.5100, zoom: 14 },
  'zona 3': { lat: 14.6300, lng: -90.5350, zoom: 14 },
  'zona 4': { lat: 14.6186, lng: -90.5164, zoom: 15 },
  'zona 5': { lat: 14.6250, lng: -90.4980, zoom: 14 },
  'zona 6': { lat: 14.6500, lng: -90.4900, zoom: 14 },
  'zona 7': { lat: 14.6350, lng: -90.5500, zoom: 14 },
  'zona 8': { lat: 14.6200, lng: -90.5250, zoom: 14 },
  'zona 9': { lat: 14.6067, lng: -90.5197, zoom: 15 },
  'zona 10': { lat: 14.5975, lng: -90.5106, zoom: 15 },
  'zona 11': { lat: 14.6150, lng: -90.5500, zoom: 14 },
  'zona 12': { lat: 14.5900, lng: -90.5450, zoom: 14 },
  'zona 13': { lat: 14.5800, lng: -90.5280, zoom: 14 },
  'zona 14': { lat: 14.5815, lng: -90.5210, zoom: 15 },
  'zona 15': { lat: 14.5850, lng: -90.4900, zoom: 15 },
  'zona 16': { lat: 14.6000, lng: -90.4750, zoom: 14 },
  'zona 17': { lat: 14.6400, lng: -90.4700, zoom: 14 },
  'zona 18': { lat: 14.6600, lng: -90.4600, zoom: 13 },
  'zona 21': { lat: 14.5550, lng: -90.5350, zoom: 14 },

  // Guatemala Metro Area
  'carretera a el salvador': { lat: 14.5300, lng: -90.4500, zoom: 13 },
  'mixco': { lat: 14.6333, lng: -90.6063, zoom: 13 },
  'san cristóbal': { lat: 14.6000, lng: -90.5900, zoom: 14 },
  'naranjo': { lat: 14.6400, lng: -90.5600, zoom: 14 },
  'villa nueva': { lat: 14.5282, lng: -90.5956, zoom: 13 },
  'santa catarina pinula': { lat: 14.5700, lng: -90.4943, zoom: 13 },
  'san josé pinula': { lat: 14.5450, lng: -90.4150, zoom: 13 },
  'san miguel petapa': { lat: 14.5014, lng: -90.5567, zoom: 13 },
  'amatitlán': { lat: 14.4750, lng: -90.6275, zoom: 13 },
  'fraijanes': { lat: 14.4650, lng: -90.4400, zoom: 13 },

  // Sacatepéquez
  'antigua guatemala': { lat: 14.5586, lng: -90.7295, zoom: 15 },
  'jocotenango': { lat: 14.5750, lng: -90.7380, zoom: 14 },
  'san lucas sacatepéquez': { lat: 14.6150, lng: -90.6603, zoom: 14 },
  'ciudad vieja': { lat: 14.5260, lng: -90.7600, zoom: 14 },
  'pastores': { lat: 14.5950, lng: -90.7550, zoom: 14 },
  'san pedro las huertas': { lat: 14.5350, lng: -90.7300, zoom: 14 },
  'san felipe de jesús': { lat: 14.5700, lng: -90.7350, zoom: 14 },
  'santa ana': { lat: 14.5450, lng: -90.7200, zoom: 14 },

  // Quetzaltenango
  'xela': { lat: 14.8347, lng: -91.5181, zoom: 14 },
  'salcajá': { lat: 14.8800, lng: -91.4600, zoom: 14 },
  'la esperanza': { lat: 14.8650, lng: -91.5600, zoom: 14 },
  'cantel': { lat: 14.8100, lng: -91.4550, zoom: 14 },
  'almolonga': { lat: 14.8150, lng: -91.4950, zoom: 14 },

  // Sololá
  'panajachel': { lat: 14.7410, lng: -91.1560, zoom: 15 },
  'sololá': { lat: 14.7725, lng: -91.1833, zoom: 14 },
  'san pedro la laguna': { lat: 14.6933, lng: -91.2725, zoom: 14 },
  'san marcos la laguna': { lat: 14.7233, lng: -91.2575, zoom: 14 },
  'santa cruz la laguna': { lat: 14.7450, lng: -91.2050, zoom: 14 },
  'santiago atitlán': { lat: 14.6400, lng: -91.2300, zoom: 14 },

  // Escuintla
  'puerto san josé': { lat: 13.9267, lng: -90.8217, zoom: 14 },
  'puerto quetzal': { lat: 13.9200, lng: -90.7900, zoom: 13 },
  'palín': { lat: 14.4050, lng: -90.6975, zoom: 14 },
  'santa lucía cotzumalguapa': { lat: 14.3333, lng: -91.0250, zoom: 13 },
  'iztapa': { lat: 13.9300, lng: -90.7100, zoom: 14 },

  // Petén
  'isla de flores': { lat: 16.9295, lng: -89.8897, zoom: 15 },
  'santa elena': { lat: 16.9150, lng: -89.8950, zoom: 14 },
  'san benito': { lat: 16.9170, lng: -89.9200, zoom: 14 },
  'el remate': { lat: 17.0000, lng: -89.7000, zoom: 14 },

  // Alta Verapaz
  'cobán': { lat: 15.4706, lng: -90.3708, zoom: 14 },
  'san pedro carchá': { lat: 15.4800, lng: -90.3000, zoom: 14 },
  'lanquín': { lat: 15.5650, lng: -89.9800, zoom: 13 },

  // Chimaltenango
  'el tejar': { lat: 14.6450, lng: -90.7950, zoom: 14 },
  'tecpán guatemala': { lat: 14.7600, lng: -90.9900, zoom: 14 },
  'zaragoza': { lat: 14.6500, lng: -90.8900, zoom: 14 },

  // Izabal
  'puerto barrios': { lat: 15.7278, lng: -88.5944, zoom: 14 },
  'livingston': { lat: 15.8283, lng: -88.7511, zoom: 14 },
  'río dulce': { lat: 15.6550, lng: -88.9950, zoom: 14 },
};

/**
 * Returns geographic center and zoom for a department
 */
export function getCoordinatesForDepartment(department) {
  if (!department || department === 'Todos') {
    return DEPARTMENT_COORDINATES.Todos;
  }
  return DEPARTMENT_COORDINATES[department] || DEPARTMENT_COORDINATES.Guatemala;
}

// Pre-sort zone keys by length descending to match specific multi-digit zones before single digits (e.g. "zona 10" before "zona 1")
const SORTED_ZONE_KEYS = Object.keys(ZONE_COORDINATES).sort((a, b) => b.length - a.length);

/**
 * Returns geographic center and zoom dynamically according to selected department AND zone
 */
export function getCoordinatesForLocation(department, zone) {
  if (zone && !zone.toLowerCase().startsWith('todas') && !zone.toLowerCase().startsWith('todos')) {
    const cleanZone = zone.toLowerCase();
    const zoneBase = cleanZone.split('(')[0].trim();

    // Check longest keys first so "zona 10", "zona 14", "zona 15" match before "zona 1"
    for (const key of SORTED_ZONE_KEYS) {
      if (cleanZone.includes(key) || zoneBase === key) {
        return ZONE_COORDINATES[key];
      }
    }
  }

  // Fallback to department level coordinates
  return getCoordinatesForDepartment(department);
}

/**
 * Returns available zones/sectors for a given department
 */
export function getZonesForDepartment(department) {
  if (!department || department === 'Todos') {
    return DEPARTMENT_ZONES_MAP.Todos;
  }
  return DEPARTMENT_ZONES_MAP[department] || [
    'Todas las zonas / sectores',
    `${department} Centro`,
  ];
}

/**
 * Check whether a zone belongs to a department's list
 */
export function isZoneValidForDepartment(zone, department) {
  const zones = getZonesForDepartment(department);
  return zones.includes(zone);
}

