// ============================================================
// Motor de Análisis Adaptativo SAR
//
// Evalúa continuamente el estado completo del incidente y
// genera recomendaciones priorizadas en tiempo real.
//
// Entradas: incident, elapsedHours, weather, updates,
//           clueMarkers, clearedZones, survivalProbability
// Salida:   recomendaciones ordenadas por urgencia
// ============================================================

import { PERSON_CATEGORIES, WEATHER_CONDITIONS } from '../data/sarProfiles'
import { haversine } from './geo'

// ─── Prioridades ─────────────────────────────────────────────
export const PRIORITY = {
  CRITICA: { label: 'CRÍTICA', order: 0, color: '#dc2626', bg: '#450a0a' },
  ALTA:    { label: 'ALTA',    order: 1, color: '#ea580c', bg: '#431407' },
  MEDIA:   { label: 'MEDIA',   order: 2, color: '#ca8a04', bg: '#422006' },
  INFO:    { label: 'INFO',    order: 3, color: '#3b82f6', bg: '#172554' },
}

// ─── Categorías con íconos ────────────────────────────────────
export const CATEGORY = {
  tiempo:       { label: 'Tiempo',        icon: '⏱' },
  clima:        { label: 'Clima',         icon: '🌧' },
  perfil:       { label: 'Perfil LPB',    icon: '🧠' },
  hallazgo:     { label: 'Hallazgo',      icon: '📍' },
  contacto:     { label: 'Contacto',      icon: '📡' },
  supervivencia:{ label: 'Supervivencia', icon: '❤️' },
  recursos:     { label: 'Recursos',      icon: '🚁' },
  zona:         { label: 'Zona búsqueda', icon: '🗺' },
  protocolo:    { label: 'Protocolo',     icon: '📋' },
  medico:       { label: 'Médico',        icon: '🏥' },
}

// ─── Helpers ─────────────────────────────────────────────────
function fmt(h) {
  const hh = Math.floor(h), mm = Math.round((h - hh) * 60)
  return hh > 0 ? `${hh}h${mm > 0 ? ` ${mm}m` : ''}` : `${mm}m`
}

function lastUpdate(updates, type) {
  return updates.find(u => u.type === type)
}

function updatesOfType(updates, type) {
  return updates.filter(u => u.type === type)
}

function ageGroup(age) {
  const n = parseInt(age)
  if (!n) return null
  if (n <= 6)  return 'infant'
  if (n <= 12) return 'child'
  if (n <= 17) return 'teen'
  if (n >= 65) return 'elderly'
  return 'adult'
}

// ─── Motor de reglas ──────────────────────────────────────────
export function generateRecommendations(state) {
  const {
    incident, elapsedHours, updates = [],
    clueMarkers = [], clearedZones = [],
    survivalProbability,
  } = state

  if (!incident) return []

  const profile  = PERSON_CATEGORIES[incident.profileId]
  const weather  = WEATHER_CONDITIONS.find(w => w.id === incident.weather)
  const age      = ageGroup(incident.age)
  const recs     = []
  const h        = elapsedHours

  // ─── helper para añadir recomendación ─────────────────────
  function add(id, priority, category, title, detail, action, trigger) {
    recs.push({ id, priority, category, title, detail, action: action || null, trigger: trigger || null })
  }

  // ══════════════════════════════════════════════════════════
  // BLOQUE 1 — TIEMPO TRANSCURRIDO
  // ══════════════════════════════════════════════════════════

  if (h < 2) {
    add('time_initial', PRIORITY.CRITICA, 'tiempo',
      'Fase inicial: concentrar todo en el LKP',
      `Primeras 2 horas — el 50% de las personas se encuentran a menos de ${profile.distances.p25} km del LKP. Máxima densidad de búsqueda en zona cercana antes de expandir.`,
      'Cuadricular radio de ' + profile.distances.p25 + ' km con equipos contiguos. No separar todavía.',
      'Incidente < 2h'
    )
  }

  if (h >= 6 && h < 7) {
    add('time_6h', PRIORITY.ALTA, 'tiempo',
      '6 horas: ampliar radio y solicitar refuerzos',
      `A las 6h, el 75% de ${profile.label} se encuentra dentro de ${profile.distances.p75} km. Si no hay resultado, escalar búsqueda al siguiente radio estadístico.`,
      `Expandir al radio de ${profile.distances.p75} km. Solicitar mutual aid regional si no está activo.`,
      `${fmt(h)} transcurridas`
    )
  }

  if (h >= 12 && h < 13) {
    add('time_12h', PRIORITY.ALTA, 'recursos',
      'Protocolo de 12 horas — escalar recursos',
      'NASAR: a las 12h sin resultado, activar recursos de nivel regional. La probabilidad de encontrar a la persona disminuye significativamente después de este punto.',
      'Solicitar apoyo de Protección Civil estatal. Evaluar disponibilidad de apoyo aéreo (drone/helicóptero).',
      `${fmt(h)} transcurridas`
    )
  }

  if (h >= 24 && h < 25) {
    add('time_24h', PRIORITY.CRITICA, 'protocolo',
      '24 horas: protocolo de búsqueda extendida',
      'Activar protocolos de búsqueda extendida. Registrar en RNPDNO. La eficiencia de búsqueda terrestre disminuye — considerar recursos aéreos.',
      'Completar registro RNPDNO. Alertar a comunidades vecinas. Revisar toda la evidencia recopilada para replantear la estrategia.',
      `${fmt(h)} transcurridas`
    )
  }

  if (h >= 48) {
    add('time_48h', PRIORITY.CRITICA, 'supervivencia',
      '+48h: Revisión estratégica de la operación',
      `Con ${fmt(h)} transcurridas, es momento de revisar todas las hipótesis. ¿Hay zonas no cubiertas? ¿Algún destino del pasado no verificado?`,
      'Convocar reunión de revisión de estrategia. Considerar peritos de rastreo. Apoyo psicológico al equipo y familia.',
      `${fmt(h)} transcurridas`
    )
  }

  // ══════════════════════════════════════════════════════════
  // BLOQUE 2 — CLIMA + TIEMPO COMBINADOS
  // ══════════════════════════════════════════════════════════

  const isHazardWeather = ['rain', 'cold', 'fog', 'wind'].includes(incident.weather)
  const isExtremeHeat   = incident.weather === 'hot'
  const isExtremeCold   = incident.weather === 'cold'

  if ((incident.weather === 'rain' || incident.weather === 'cold') && h > 3) {
    const severity = h > 12 ? PRIORITY.CRITICA : PRIORITY.ALTA
    add('weather_hypothermia', severity, 'medico',
      `Riesgo de hipotermia — ${weather?.label} + ${fmt(h)}`,
      `Con lluvia/frío y ${fmt(h)} de exposición, la hipotermia es una amenaza real. ${h > 8 ? 'RIESGO CRÍTICO: el tiempo de supervivencia puede reducirse a horas.' : 'Buscar abrigo natural prioritariamente.'}`,
      'Preparar equipo de hipotermia en PC. Buscar en: cuevas, bajo árboles densos, abrigos naturales, estructuras. Llevar mantas térmicas en cada equipo.',
      `${weather?.label} + ${fmt(h)} transcurridas`
    )
  }

  if (isExtremeCold && h > 1) {
    add('weather_extreme_cold', PRIORITY.CRITICA, 'medico',
      'Frío extremo: ventana de supervivencia reducida',
      'Con temperaturas extremas, la ventana de supervivencia sin abrigo puede ser de pocas horas. Priorizar búsqueda nocturna con FLIR/infrarrojo si está disponible.',
      'Solicitar equipo FLIR inmediatamente. Equipos médicos en alerta máxima.',
      `Clima: ${weather?.label}`
    )
  }

  if (isExtremeHeat && h > 2) {
    add('weather_heat', h > 6 ? PRIORITY.CRITICA : PRIORITY.ALTA, 'medico',
      `Deshidratación crítica — calor extremo + ${fmt(h)}`,
      `En calor extremo, la deshidratación grave puede ocurrir en 2-4 horas de exposición. Con ${fmt(h)}, riesgo de golpe de calor.`,
      'Priorizar búsqueda en sombra: barrancos, cuevas, vegetación densa. Buscar fuentes de agua (puede haberlas buscado). Llevar suero en equipos.',
      `${weather?.label} + ${fmt(h)}`
    )
  }

  if (incident.weather === 'fog' && h > 1) {
    add('weather_fog', PRIORITY.ALTA, 'zona',
      'Niebla: persona puede estar detenida esperando',
      'En condiciones de niebla, las personas tienden a detenerse al perder referencias visuales. Buscar en área cercana al LKP en radios cortos.',
      'Aumentar frecuencia de llamados y señales sonoras. Usar silbatos. La persona puede responder aunque no se mueva.',
      `Clima: ${weather?.label}`
    )
  }

  // ══════════════════════════════════════════════════════════
  // BLOQUE 3 — PERFIL LPB + EDAD
  // ══════════════════════════════════════════════════════════

  // Niño pequeño (1-6)
  if (incident.profileId === 'child_1_6') {
    add('profile_child_water', PRIORITY.CRITICA, 'perfil',
      'PRIORIDAD 1: Cubrir TODOS los cuerpos de agua',
      'Niño 1-6 años: el 89% de las víctimas fatales involucran agua. Los niños BUSCAN activamente agua y pueden caer en pocos minutos. Esta es la prioridad absoluta.',
      'Asignar equipos dedicados exclusivamente a revisar: ríos, arroyos, pozas, charcos, depósitos. Radio de 1 km del LKP. Hacerlo ANTES de cualquier otra búsqueda.',
      'Perfil: niño 1-6 años'
    )
    add('profile_child_silent', PRIORITY.CRITICA, 'perfil',
      'Búsqueda silenciosa — el niño NO responde a llamados',
      'Los niños pequeños se esconden por miedo a extraños. Llamarlos en voz alta puede hacer que se escondan más. Equipos deben buscar EN SILENCIO, escuchando.',
      'Prohibir gritar en zona de búsqueda cercana. Usar el nombre solo con voz tranquila. Colocar objeto familiar en LKP (peluche, ropa de mamá).',
      'Perfil: niño 1-6 años'
    )
    if (h > 1) {
      add('profile_child_time', PRIORITY.CRITICA, 'supervivencia',
        `⚠ ${fmt(h)} con niño pequeño — ventana crítica`,
        'Los niños de 1-6 años tienen reservas físicas muy limitadas. La hipotermia, deshidratación y ahogamiento representan el mayor riesgo en las primeras horas.',
        'Máxima velocidad de búsqueda en agua y vegetación densa. Todo el personal disponible.',
        `${fmt(h)} transcurridas`
      )
    }
  }

  // Adolescente
  if (incident.profileId === 'child_7_15') {
    add('profile_teen', PRIORITY.ALTA, 'perfil',
      'Adolescente: puede intentar regresar solo',
      'Los adolescentes frecuentemente intentan encontrar el camino por sí mismos, lo que puede alejarlos más. También pueden estar siguiendo curiosidad hacia puntos de interés.',
      'Verificar ruta de regreso al punto de inicio. Revisar puntos de interés en el área: vistas, cascadas, formaciones rocosas. Llamar por nombre — puede responder.',
      'Perfil: adolescente'
    )
  }

  // Adulto mayor
  if (incident.profileId === 'elderly') {
    add('profile_elderly_fall', PRIORITY.ALTA, 'medico',
      'Alta probabilidad de caída/inmovilización',
      'Adultos mayores frecuentemente se inmovilizán por caídas. Puede estar consciente pero incapaz de moverse o responder fuerte. Buscar en quebradas y terreno irregular.',
      'Buscar sistemáticamente en: hondonadas, bordos, zonas con piedras sueltas. Escuchar activamente. Puede estar pidiendo ayuda con voz débil.',
      'Perfil: adulto mayor'
    )
    if (isHazardWeather) {
      add('profile_elderly_exposure', PRIORITY.CRITICA, 'medico',
        'Adulto mayor + clima adverso = riesgo vital',
        `Adultos mayores tienen menor regulación térmica. Con ${weather?.label}, el riesgo de hipotermia/hipertermia es crítico mucho antes que en adultos jóvenes.`,
        'Priorizar búsqueda máxima. Coordinar con servicios médicos. Preparar traslado inmediato.',
        `${weather?.label} + perfil adulto mayor`
      )
    }
  }

  // Alzheimer/Demencia
  if (incident.profileId === 'alzheimer') {
    add('profile_alzheimer_direction', PRIORITY.CRITICA, 'perfil',
      'Búsqueda en línea recta — NO regresa al LKP',
      'Personas con demencia viajan en línea recta sin retorno. Identifica la dirección inicial de marcha y ese es el vector de búsqueda. El heatmap lo refleja.',
      'Buscar destinos del pasado en esa dirección (casa anterior, trabajo, lugar familiar). Alertar carreteras y vías de tren en esa dirección.',
      'Perfil: demencia/Alzheimer'
    )
    add('profile_alzheimer_water', PRIORITY.ALTA, 'perfil',
      'Verificar cuerpos de agua en dirección de marcha',
      'Personas con Alzheimer frecuentemente terminan en agua por caminar sin detenerse ante barreras.',
      'Verificar todos los cruces de agua en la dirección proyectada de marcha.',
      'Perfil: demencia/Alzheimer'
    )
    if (h > 24) {
      add('profile_alzheimer_critical', PRIORITY.CRITICA, 'supervivencia',
        `CRÍTICO: +24h con Alzheimer — tasa de mortalidad muy alta`,
        'Estadísticas: personas con demencia tienen tasa de mortalidad superior al 40% si no se encuentran en 24h. Solicitar todos los recursos disponibles inmediatamente.',
        'Apoyo aéreo urgente. Revisión de toda la zona incluyendo áreas ya "barridas".',
        `${fmt(h)} transcurridas — perfil demencia`
      )
    }
  }

  // Persona en crisis
  if (incident.profileId === 'despondent') {
    add('profile_despondent_approach', PRIORITY.CRITICA, 'perfil',
      'Búsqueda sensible — aproximación especializada',
      'Persona en angustia emocional. El encuentro debe ser manejado por personal entrenado en crisis. No enviar equipos sin preparación psicológica.',
      'Incluir al menos un profesional de salud mental o persona entrenada en primeros auxilios psicológicos. Aproximación no confrontacional.',
      'Perfil: persona en crisis'
    )
    add('profile_despondent_water', PRIORITY.ALTA, 'zona',
      'Priorizar cuerpos de agua y terreno elevado aislado',
      'Tiende a buscar aislamiento profundo. Evita senderos. Verificar barrancas profundas, cuerpos de agua y puntos elevados aislados.',
      'Buscar fuera de senderos. Revisar notas o mensajes dejados en el vehículo o LKP.',
      'Perfil: persona en crisis'
    )
  }

  // Cazador
  if (incident.profileId === 'hunter') {
    add('profile_hunter_signals', PRIORITY.ALTA, 'perfil',
      'Escuchar señales de arma de fuego (3 disparos = SOS)',
      'Los cazadores conocen el protocolo: 3 disparos al aire = señal de socorro. Mantener silencio periódico para escuchar.',
      'Periodos de 2 min de silencio cada 10 min durante la búsqueda. Registrar dirección de cualquier disparo.',
      'Perfil: cazador'
    )
  }

  // Alpinista
  if (incident.profileId === 'climber') {
    add('profile_climber_vertical', PRIORITY.ALTA, 'zona',
      'Buscar en rutas verticales — puede estar atrapado',
      'Alpinistas frecuentemente quedan atrapados en paredes o cornisas. Verificar con binoculares antes de enviar equipo técnico.',
      'Revisar ruta declarada con binoculares o dron. Desplegar rescate en altura solo con equipo técnico certificado.',
      'Perfil: alpinista'
    )
  }

  // ══════════════════════════════════════════════════════════
  // BLOQUE 4 — HALLAZGOS Y ACTUALIZACIONES
  // ══════════════════════════════════════════════════════════

  const cluesFound   = updatesOfType(updates, 'clue_found')
  const tracksFound  = updatesOfType(updates, 'tracks_found')
  const audioContact = lastUpdate(updates, 'audio_contact')
  const visualContact= lastUpdate(updates, 'visual_contact')
  const witnesses    = updatesOfType(updates, 'witness')

  if (cluesFound.length > 0) {
    const last = cluesFound[0]
    add('clue_reanchor', PRIORITY.ALTA, 'hallazgo',
      'Reubicar foco de búsqueda al último hallazgo',
      `Se encontró: "${last.description}". El análisis topográfico ya está ajustado a este punto. La búsqueda debe recentrarse desde aquí.`,
      'Actualizar todos los equipos con las nuevas coordenadas del hallazgo. Expandir desde el hallazgo, no desde el LKP original.',
      `Pista: ${last.description?.slice(0, 60)}`
    )
    if (cluesFound.length >= 2) {
      add('clue_pattern', PRIORITY.ALTA, 'hallazgo',
        `${cluesFound.length} pistas encontradas — establecer vector de marcha`,
        'Con múltiples hallazgos, es posible establecer la dirección de desplazamiento. Trazar una línea entre las pistas para proyectar la ruta probable.',
        'Calcular bearing entre pistas y proyectar hacia adelante. El heatmap ya pondera esa dirección.',
        `${cluesFound.length} pistas registradas`
      )
    }
  }

  if (tracksFound.length > 0) {
    const last = tracksFound[0]
    add('tracks_direction', PRIORITY.ALTA, 'hallazgo',
      'Huellas confirmadas — iniciar rastreo activo',
      `Huellas encontradas: "${last.description}". El seguimiento de huellas es la pista más valiosa en búsqueda terrestre.`,
      'Asignar rastreador experto al seguimiento de huellas. Proteger la zona con cinta para no contaminar. El resto del equipo avanza paralelo, no sobre las huellas.',
      `Huellas: ${last.description?.slice(0, 60)}`
    )
  }

  if (audioContact) {
    add('audio_convergence', PRIORITY.CRITICA, 'contacto',
      '🔊 CONTACTO AUDITIVO — convergencia inmediata',
      `Contacto auditivo registrado: "${audioContact.description}". TODOS los equipos deben moverse hacia ese punto de forma coordinada.`,
      'Rodear el área en radio 300-500m. Mantener silencio excepto para llamar periódicamente. No usar radio cerca del área.',
      `Contacto: ${audioContact.description?.slice(0, 60)}`
    )
  }

  if (visualContact) {
    add('visual_contact', PRIORITY.CRITICA, 'contacto',
      '👁 CONTACTO VISUAL — aproximación controlada',
      `Contacto visual confirmado: "${visualContact.description}". Este es el momento más delicado — una mala aproximación puede hacer que la persona huya.`,
      incident.profileId === 'child_1_6'
        ? 'NIÑO: No correr. Agacharse al nivel del niño. Hablar suave. Mostrar comida o juguete. Un rescatador, los demás en perímetro silencioso.'
        : incident.profileId === 'despondent'
        ? 'CRISIS: Solo personal entrenado en primeros auxilios psicológicos se aproxima. Voz calmada, sin movimientos bruscos. No mencionar hospitales o autoridades.'
        : 'Aproximación tranquila. Identificarse claramente. Evaluar estado médico antes de mover.',
      `Contacto visual: ${visualContact.description?.slice(0, 50)}`
    )
  }

  if (witnesses.length > 0) {
    const last = witnesses[0]
    add('witness_credibility', PRIORITY.MEDIA, 'hallazgo',
      `Testimonio de testigo — validar y actuar`,
      `Testimonio: "${last.description}". Los testimonios son valiosos pero deben triangularse. ¿Cuánto tiempo hace? ¿Certeza del testigo? ¿Coincide con la dirección LPB?`,
      'Entrevistar al testigo en detalle. Obtener hora exacta, dirección de marcha observada, descripción física. Cruzar con datos LPB del heatmap.',
      `Testigo: ${last.description?.slice(0, 60)}`
    )
  }

  // Muchas zonas barridas
  if (clearedZones.length >= 3) {
    add('zones_cleared_strategy', PRIORITY.MEDIA, 'zona',
      `${clearedZones.length} zonas barridas — revisar estrategia`,
      'Con múltiples zonas sin resultado, es posible que la persona esté en área no cubierta, o que el POD reportado sea insuficiente en alguna zona.',
      'Revisar zonas con POD < 70% para re-buscar. Considerar si la persona pudo superar el radio p90. Expandir al radio p95.',
      `${clearedZones.length} zonas barridas`
    )
  }

  // ══════════════════════════════════════════════════════════
  // BLOQUE 5 — PROBABILIDAD DE SUPERVIVENCIA
  // ══════════════════════════════════════════════════════════

  if (survivalProbability !== null) {
    if (survivalProbability < 70 && survivalProbability >= 50) {
      add('survival_moderate', PRIORITY.MEDIA, 'supervivencia',
        `Probabilidad de supervivencia: ${survivalProbability}% — escalar recursos`,
        'La probabilidad de supervivencia ha caído a nivel moderado. Momento de intensificar la operación y asegurar que los recursos son suficientes.',
        'Verificar cobertura de todos los radios. Solicitar refuerzos si hay zonas sin cubrir.',
        `Supervivencia: ${survivalProbability}%`
      )
    }
    if (survivalProbability < 50 && survivalProbability >= 30) {
      add('survival_low', PRIORITY.CRITICA, 'supervivencia',
        `⚠ Supervivencia crítica: ${survivalProbability}% — máxima urgencia`,
        'La probabilidad de supervivencia es baja. Cada hora que pasa reduce significativamente las posibilidades. Todos los recursos disponibles deben desplegarse ahora.',
        'Solicitar todos los recursos disponibles: aéreos, caninos, equipos adicionales. Notificar a servicios médicos de emergencia. Evaluar traslado inmediato al encontrar.',
        `Supervivencia: ${survivalProbability}%`
      )
    }
    if (survivalProbability < 30) {
      add('survival_critical', PRIORITY.CRITICA, 'supervivencia',
        `🔴 Supervivencia muy baja: ${survivalProbability}% — revisión de operación`,
        'Con probabilidad de supervivencia crítica, considerar si la operación debe transicionar parcialmente a recuperación mientras continúa la búsqueda activa.',
        'Apoyo psicológico para familia y equipo. Continuar búsqueda activa. Preparar para peor escenario. Documentar todo para eventual investigación.',
        `Supervivencia: ${survivalProbability}%`
      )
    }
  }

  // ══════════════════════════════════════════════════════════
  // BLOQUE 6 — RECURSOS Y NOCHE
  // ══════════════════════════════════════════════════════════

  const hour = new Date().getHours()
  const isNight = hour >= 20 || hour < 6

  if (isNight && h > 1) {
    const nightRec = incident.profileId === 'child_1_6' || incident.profileId === 'alzheimer'
      ? PRIORITY.CRITICA : PRIORITY.ALTA
    add('night_ops', nightRec, 'recursos',
      'Operación nocturna — protocolos especiales',
      `Es de noche. ${incident.profileId === 'child_1_6' ? 'NUNCA suspender búsqueda de niño pequeño por oscuridad.' : 'Evaluar riesgo para el equipo vs. urgencia del caso.'} Las condiciones de frío nocturno aumentan el riesgo.`,
      'Equipar a todos con linternas frontales. Usar iluminación de área en PC. Señales luminosas (bengalas) para orientar. Considerar FLIR si disponible.',
      `Hora actual: ${hour}:00 — operación nocturna`
    )
  }

  if (h >= 12 && !updatesOfType(updates, 'new_resource').some(u =>
    u.description?.toLowerCase().includes('aér') ||
    u.description?.toLowerCase().includes('drone') ||
    u.description?.toLowerCase().includes('helic')
  )) {
    add('resource_aerial', PRIORITY.ALTA, 'recursos',
      'Solicitar apoyo aéreo — cobertura eficiente',
      `Con ${fmt(h)} sin localización, el apoyo aéreo (dron o helicóptero) puede cubrir en horas lo que equipos terrestres tardarían días.`,
      'Opciones: dron SAR (visión nocturna/FLIR), helicóptero de GN o SEDENA, aviación civil. Coordinar a través de Protección Civil estatal.',
      `${fmt(h)} transcurridas sin apoyo aéreo registrado`
    )
  }

  // ── Ordenar y retornar ─────────────────────────────────────
  return recs.sort((a, b) => a.priority.order - b.priority.order)
}
