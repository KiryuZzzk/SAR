// ============================================================
// Perfiles de Comportamiento de Persona Perdida (LPB)
// Basado en estadísticas NASAR / Robert J. Koester
// "Lost Person Behavior" — dbS Productions, 2008
// ============================================================

export const PERSON_CATEGORIES = {
  hiker: {
    id: 'hiker',
    label: 'Excursionista / Caminante',
    labelShort: 'Excursionista',
    icon: '🥾',
    color: '#2563EB',
    distances: { p25: 2.0, p50: 3.8, p75: 7.0, p90: 12.0, p95: 18.0 },
    // Pesos de atracción/repulsión topográfica (positivo = atrae, negativo = repele)
    terrainWeights: { trail: 2.0, water: 0.4, downhill: 0.2, uphill: 0.5, isolation: 0.0 },
    // Distribución angular: mayor prob. en dirección de sendero
    tendencies: [
      'Sigue senderos y caminos establecidos',
      'Tiende a subir terreno elevado',
      'Busca abrigo al caer el sol',
      'Puede crear campamento temporal',
      'Responde a llamados y señales',
    ],
    riskFactors: [
      'Lesión por terreno accidentado',
      'Hipotermia nocturna',
      'Deshidratación en verano',
      'Desorientación por niebla o lluvia',
    ],
    priorityZones: ['senderos', 'cumbres', 'refugios', 'fuentes de agua'],
    checklist: [
      'Verificar registro de entrada a área protegida',
      'Consultar guardaparques sobre avistamientos',
      'Revisar senderos principales en radio de 5 km',
      'Verificar cumbre o destino declarado',
      'Buscar en fuentes de agua cercanas',
      'Desplegar equipos en senderos secundarios',
      'Revisar refugios y abrigos naturales',
      'Verificar área de estacionamiento',
    ],
  },

  child_1_6: {
    id: 'child_1_6',
    label: 'Niño/a (1–6 años)',
    labelShort: 'Niño pequeño',
    icon: '👶',
    color: '#DC2626',
    distances: { p25: 0.3, p50: 0.5, p75: 0.9, p90: 1.6, p95: 2.5 },
    terrainWeights: { trail: -0.3, water: 3.0, downhill: 0.8, uphill: 0.0, isolation: 0.5 },
    tendencies: [
      'Se oculta y NO responde a llamados (instinto de miedo)',
      'Busca agua: arroyos, pozas, charcos',
      'Sigue pendientes hacia abajo',
      'Permanece en el primer lugar que le parece seguro',
      'Puede quedarse dormido en su escondite',
    ],
    riskFactors: [
      'Ahogamiento (busca agua activamente)',
      'Hipotermia (sin abrigo suficiente)',
      'Imposibilidad de comunicarse',
      'Pánico al ver extraños',
    ],
    priorityZones: ['agua', 'vegetación densa', 'pequeñas cuevas', 'debajo de arbustos'],
    checklist: [
      'PRIORIDAD MÁXIMA: buscar TODOS los cuerpos de agua en radio 1 km',
      'Desplegar buscadores silenciosos (no llamar, escuchar)',
      'Buscar bajo arbustos y vegetación densa',
      'Revisar estructuras pequeñas: troncos huecos, cuevas',
      'Cuadricular zona de 1 km con equipos densos',
      'Usar perros de rastreo (olfato superior)',
      'Verificar que nadie lleva al niño fuera del área',
      'Colocar objeto familiar en LKP (puede regresar)',
    ],
  },

  child_7_15: {
    id: 'child_7_15',
    label: 'Niño/a (7–15 años)',
    labelShort: 'Niño mayor',
    icon: '🧒',
    color: '#EA580C',
    distances: { p25: 1.5, p50: 2.8, p75: 5.0, p90: 9.0, p95: 14.0 },
    terrainWeights: { trail: 0.8, water: 0.8, downhill: 0.3, uphill: 0.2, isolation: 0.2 },
    tendencies: [
      'Puede responder a llamados si confía',
      'Sigue curiosidad: senderos, animales, puntos de interés',
      'Tiende a reunirse con amigos si van en grupo',
      'Puede intentar encontrar el camino solo',
      'Busca terreno familiar o con señas reconocibles',
    ],
    riskFactors: [
      'Desorientación por aventurarse en terreno nuevo',
      'Lesiones al intentar escalar o cruzar corrientes',
      'Deshidratación por no pedir ayuda',
    ],
    priorityZones: ['senderos secundarios', 'puntos de interés', 'vistas panorámicas'],
    checklist: [
      'Llamar por nombre en toda la zona (puede responder)',
      'Preguntar a otros visitantes por avistamientos',
      'Revisar puntos de interés: cascadas, vistas, árboles grandes',
      'Verificar si tenía amigos en el área',
      'Buscar senderos secundarios y atajos',
      'Revisar el camino de regreso hacia el punto de inicio',
    ],
  },

  elderly: {
    id: 'elderly',
    label: 'Persona Mayor (65+ años)',
    labelShort: 'Adulto mayor',
    icon: '🧓',
    color: '#7C3AED',
    distances: { p25: 0.5, p50: 1.2, p75: 2.5, p90: 4.5, p95: 7.0 },
    terrainWeights: { trail: 1.2, water: 0.3, downhill: 0.6, uphill: -0.3, isolation: 0.0 },
    tendencies: [
      'Movilidad reducida, no viaja lejos del LKP',
      'Puede seguir rutas habituales o conocidas',
      'Responde a llamados si escucha bien',
      'Puede caer y quedar inmovilizado',
      'Busca descanso en lugares sombreados',
    ],
    riskFactors: [
      'Caídas y fracturas por terreno irregular',
      'Problemas cardiacos por esfuerzo',
      'Hipotermia rápida (menor reserva calórica)',
      'Deshidratación acelerada',
    ],
    priorityZones: ['caminos fáciles', 'bancas y descansos', 'sombra', 'terrenoplano'],
    checklist: [
      'Concentrar búsqueda en radio de 2 km del LKP',
      'Revisar caminos planos y accesibles',
      'Buscar en zonas de sombra y descanso',
      'Verificar si padece condición médica previa',
      'Priorizar búsqueda de alguien inmovilizado (caída)',
      'Desplegar unidades ATV/cuatrimoto para cobertura rápida',
      'Coordinación con servicios médicos anticipada',
    ],
  },

  alzheimer: {
    id: 'alzheimer',
    label: 'Persona con Demencia / Alzheimer',
    labelShort: 'Demencia',
    icon: '🧠',
    color: '#BE185D',
    distances: { p25: 0.8, p50: 2.0, p75: 4.0, p90: 8.0, p95: 12.0 },
    terrainWeights: { trail: 0.2, water: 2.0, downhill: 0.5, uphill: 0.0, isolation: 0.0 },
    tendencies: [
      'Viaja en línea recta ignorando obstáculos',
      'NO responde a su nombre',
      'Puede cruzar barreras peligrosas sin percatarse',
      'Busca destinos del pasado (casa de infancia, trabajo antiguo)',
      'Dirección predecible: NO regresa al LKP',
    ],
    riskFactors: [
      'Cruce de corrientes o carreteras sin detenerse',
      'Hipotermia severa (no busca abrigo)',
      'Tasa de mortalidad alta si no se encuentra en 24h',
      'Incapacidad de comunicarse si se encuentra',
    ],
    priorityZones: ['línea recta desde LKP', 'cuerpos de agua en esa dirección', 'carreteras'],
    checklist: [
      'URGENTE: buscar en línea recta desde LKP en dirección inicial',
      'Verificar todos los cuerpos de agua en la trayectoria',
      'Alertar a conductores en carreteras cercanas',
      'Contactar familia: ¿destino del pasado cercano?',
      'Usar perros de rastreo inmediatamente',
      'Desplegar búsqueda aérea si disponible (24h críticas)',
      'Alertar comunidades vecinas con foto',
      'Revisar dirección de viento y corrientes de agua',
    ],
  },

  hunter: {
    id: 'hunter',
    label: 'Cazador / Pescador',
    labelShort: 'Cazador',
    icon: '🏹',
    color: '#15803D',
    distances: { p25: 3.0, p50: 5.5, p75: 9.0, p90: 14.0, p95: 20.0 },
    terrainWeights: { trail: 0.3, water: 1.0, downhill: 0.3, uphill: 0.2, isolation: 0.8 },
    tendencies: [
      'Se interna profundo en zona sin senderos',
      'Conoce técnicas de supervivencia básicas',
      'Puede estar creando campamento y esperar rescate',
      'Puede haberse lastimado en terreno accidentado',
      'Lleva equipo: señalar con disparos al aire (3 = SOS)',
    ],
    riskFactors: [
      'Accidente con arma de fuego',
      'Caída en terreno escarpado',
      'Pérdida de orientación lejos de senderos',
    ],
    priorityZones: ['quebradas', 'áreas de caza conocidas', 'riberas de ríos', 'cañadas'],
    checklist: [
      'Obtener mapa de zona de caza declarada',
      'Verificar vehículo en acceso al área',
      'Buscar en quebradas y cañones (terreno de caza)',
      'Escuchar disparos de señal (3 tiros = SOS)',
      'Revisar riberas de ríos y corrientes',
      'Coordinar con guías locales que conocen la zona',
      'Búsqueda aérea para zona sin senderos',
    ],
  },

  despondent: {
    id: 'despondent',
    label: 'Persona en Crisis / Angustia',
    labelShort: 'Persona en crisis',
    icon: '⚠️',
    color: '#1D4ED8',
    distances: { p25: 1.5, p50: 3.0, p75: 6.0, p90: 11.0, p95: 16.0 },
    terrainWeights: { trail: -0.8, water: 1.5, downhill: 0.0, uphill: 0.5, isolation: 1.5 },
    tendencies: [
      'Busca isolamiento deliberado',
      'Evita senderos principales y personas',
      'Puede dejar pertenencias en LKP como "señal"',
      'Tiende hacia terreno elevado o cuerpos de agua',
      'NO responde a llamados',
    ],
    riskFactors: [
      'Riesgo de autolesión',
      'Busca activamente aislamiento profundo',
      'Puede haber dejado nota o mensaje',
    ],
    priorityZones: ['terreno elevado aislado', 'cuerpos de agua profundos', 'barrancos'],
    checklist: [
      'Verificar si dejó nota, mensaje o pertenencias en LKP',
      'Buscar en terreno ALEJADO de senderos',
      'Revisar todos los cuerpos de agua profundos',
      'Desplegar personal entrenado en crisis (no enviar solo)',
      'Buscar en puntos elevados con vista al área',
      'Revisar vehículo: documentos, teléfono, notas',
      'Contactar familia y cercanos para contexto',
      'Incluir trabajador social o psicólogo en el rescate',
    ],
  },

  climber: {
    id: 'climber',
    label: 'Alpinista / Escalador',
    labelShort: 'Alpinista',
    icon: '⛰️',
    color: '#0369A1',
    distances: { p25: 3.0, p50: 6.0, p75: 10.0, p90: 15.0, p95: 22.0 },
    terrainWeights: { trail: 0.5, water: 0.0, downhill: -0.5, uphill: 2.5, isolation: 0.3 },
    tendencies: [
      'Se mueve verticalmente (ascenso/descenso)',
      'Puede estar atrapado en pared o cornisa',
      'Lleva equipo técnico (arnés, cuerda)',
      'Conoce técnicas de supervivencia en montaña',
      'Puede señalizar con espejo o linterna',
    ],
    riskFactors: [
      'Caída en pared o descenso',
      'Alud de piedras o nieve',
      'Atrapado en fisura o fisura',
      'Hipotermia en altitud',
    ],
    priorityZones: ['rutas de escalada conocidas', 'paredes verticales', 'cuellos de botella'],
    checklist: [
      'Obtener ruta declarada o prevista',
      'Revisar paredes con binóculos o dron',
      'Desplegar equipo de rescate en altura',
      'Verificar en base de la ruta: equipo abandonado',
      'Coordinar helicóptero para rescate técnico',
      'Buscar señales visuales: reflejo de espejo, ropa',
    ],
  },
}

export const TERRAIN_TYPES = [
  { id: 'forest', label: 'Bosque / Selva', multiplier: 1.3 },
  { id: 'mountain', label: 'Montaña / Sierra', multiplier: 1.5 },
  { id: 'desert', label: 'Desierto / Semiseco', multiplier: 1.4 },
  { id: 'grassland', label: 'Praderas / Pastizales', multiplier: 0.9 },
  { id: 'canyon', label: 'Cañón / Barranca', multiplier: 1.2 },
  { id: 'coastal', label: 'Costero / Manglar', multiplier: 1.1 },
  { id: 'mixed', label: 'Terreno Mixto', multiplier: 1.2 },
]

export const WEATHER_CONDITIONS = [
  { id: 'clear', label: 'Despejado', icon: '☀️', survivalMultiplier: 1.0 },
  { id: 'cloudy', label: 'Nublado', icon: '☁️', survivalMultiplier: 0.95 },
  { id: 'rain', label: 'Lluvia', icon: '🌧️', survivalMultiplier: 0.75 },
  { id: 'fog', label: 'Neblina / Niebla', icon: '🌫️', survivalMultiplier: 0.80 },
  { id: 'wind', label: 'Viento fuerte', icon: '💨', survivalMultiplier: 0.85 },
  { id: 'cold', label: 'Frío extremo', icon: '🌨️', survivalMultiplier: 0.60 },
  { id: 'hot', label: 'Calor extremo', icon: '🔥', survivalMultiplier: 0.65 },
]

export const SURVIVAL_STATS = {
  // Probabilidad de supervivencia según horas transcurridas
  // Varía por tipo de persona y clima (baseline clima templado)
  baseline: [
    { hours: 0,   probability: 99 },
    { hours: 6,   probability: 96 },
    { hours: 12,  probability: 91 },
    { hours: 24,  probability: 83 },
    { hours: 36,  probability: 74 },
    { hours: 48,  probability: 64 },
    { hours: 72,  probability: 48 },
    { hours: 96,  probability: 35 },
    { hours: 120, probability: 24 },
    { hours: 168, probability: 15 }, // 7 días
  ],
}
